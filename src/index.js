import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import Parser from 'rss-parser';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { getSourcesForCategory } from './rss-sources.js';
import { getAgentConfig } from './agents-config.js';
import { isDuplicate } from './dedup.js';

const API_BASE = process.env.API_BASE || 'https://agentssociety.ai';
const AGENT_API_KEY = process.env.AGENT_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'news-images';

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;
const CATEGORY = process.env.NEWS_CATEGORY || 'ai_agents';
const ARTICLES_PER_RUN = parseInt(process.env.ARTICLES_PER_RUN || '1', 10);
const FETCH_TIMEOUT_MS = 15000;
const PUBLISH_TIMEOUT_MS = 60_000;
const MAX_LLM_RETRIES = 5;
const MAX_RETRY_WAIT_MS = 120_000; // max 2 minutes wait per retry

if (!AGENT_API_KEY) {
  console.error('Missing required env var: AGENT_API_KEY');
  process.exit(1);
}
if (!CEREBRAS_API_KEY && !GROQ_API_KEY && !OPENROUTER_API_KEY) {
  console.error('No LLM provider configured. Set at least one of: CEREBRAS_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY');
  process.exit(1);
}

const parser = new Parser({ timeout: 10000 });

/**
 * Build ordered list of LLM providers.
 * Each provider has: name, client, model, available flag.
 * Providers are tried in order; unavailable ones (no API key) are skipped.
 */
function buildProviders() {
  const providers = [];

  // Primary: Cerebras Qwen 235B (1M TPD free, 3000 tok/s, best quality)
  if (CEREBRAS_API_KEY) {
    providers.push({
      name: 'cerebras',
      client: new OpenAI({ apiKey: CEREBRAS_API_KEY, baseURL: 'https://api.cerebras.ai/v1' }),
      model: 'qwen-3-235b-a22b-instruct-2507',
    });
  }

  // Fallback 1: Groq Llama 70B (100K TPD free, fast, good quality)
  if (GROQ_API_KEY) {
    providers.push({
      name: 'groq',
      client: new Groq({ apiKey: GROQ_API_KEY }),
      model: 'llama-3.3-70b-versatile',
    });
  }

  // Fallback 2: OpenRouter free auto-router (distributes across all free models)
  if (OPENROUTER_API_KEY) {
    const orClient = new OpenAI({ apiKey: OPENROUTER_API_KEY, baseURL: 'https://openrouter.ai/api/v1' });
    providers.push({
      name: 'openrouter',
      client: orClient,
      model: 'openrouter/free',
    });
    providers.push({
      name: 'openrouter-gemma',
      client: orClient,
      model: 'google/gemma-3-27b-it:free',
    });
  }

  // Last resort: Cerebras Llama 8B (fast but lower quality, better than nothing)
  if (CEREBRAS_API_KEY) {
    providers.push({
      name: 'cerebras-llama',
      client: new OpenAI({ apiKey: CEREBRAS_API_KEY, baseURL: 'https://api.cerebras.ai/v1' }),
      model: 'llama3.1-8b',
    });
  }

  return providers;
}

const LLM_PROVIDERS = buildProviders();

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const CACHE_DIR = process.env.CACHE_DIR || '/tmp';
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Read cached fresh items if available and not expired
 */
function readCache() {
  const path = `${CACHE_DIR}/news-cache-${CATEGORY}.json`;
  try {
    if (!existsSync(path)) return null;
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    if (Date.now() - data.timestamp > CACHE_MAX_AGE_MS) return null;
    console.log(`  Using cached news items (${data.items.length} items, cached ${Math.round((Date.now() - data.timestamp) / 60000)}m ago)`);
    return data.items;
  } catch {
    return null;
  }
}

/**
 * Save fresh items to cache for retry resilience
 */
function writeCache(items) {
  const path = `${CACHE_DIR}/news-cache-${CATEGORY}.json`;
  try {
    writeFileSync(path, JSON.stringify({ timestamp: Date.now(), items }));
  } catch (err) {
    console.warn(`  Cache write failed: ${err.message}`);
  }
}

/**
 * Extract JSON from LLM response that may contain markdown fences or extra text.
 */
function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text); } catch { }

  // Try extracting from markdown code fence
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()); } catch { }
  }

  // Try finding the first { ... } block
  const braceStart = text.indexOf('{');
  const braceEnd = text.lastIndexOf('}');
  if (braceStart !== -1 && braceEnd > braceStart) {
    try { return JSON.parse(text.slice(braceStart, braceEnd + 1)); } catch { }
  }

  throw new Error(`Could not extract valid JSON from response: ${text.slice(0, 200)}`);
}

/** Providers that support response_format: json_object */
const JSON_MODE_PROVIDERS = new Set(['cerebras', 'cerebras-llama', 'groq']);

/**
 * Call LLM with retry, exponential backoff, and multi-provider fallback.
 * Tries each provider in order. On rate limit, moves to next provider.
 * Within each provider, retries with exponential backoff.
 */
async function callLLMWithRetry(params) {
  let lastError = null;

  for (let pi = 0; pi < LLM_PROVIDERS.length; pi++) {
    const provider = LLM_PROVIDERS[pi];

    for (let attempt = 1; attempt <= MAX_LLM_RETRIES; attempt++) {
      try {
        const { model, response_format, ...rest } = params;
        // Only pass response_format to providers that reliably support it
        const createParams = { ...rest, model: provider.model };
        if (response_format && JSON_MODE_PROVIDERS.has(provider.name)) {
          createParams.response_format = response_format;
        }
        const result = await provider.client.chat.completions.create(createParams);
        return result;
      } catch (err) {
        lastError = err;
        const isRetryable = err.status === 429 || err.status === 503 || err.code === 'ECONNRESET' || err.message?.includes('timeout');

        // Non-retryable error (404, 400, auth, etc.) — skip to next provider
        if (!isRetryable) {
          console.warn(`  ${provider.name}: non-retryable error (${err.status || err.code}: ${err.message}), trying next provider...`);
          break;
        }

        const isDailyLimit = err.headers?.['x-should-retry'] === 'false'
          || err.message?.toLowerCase().includes('daily')
          || err.message?.toLowerCase().includes('tokens per day');

        // Daily limit or last retry — try next provider
        if (isDailyLimit || attempt === MAX_LLM_RETRIES) {
          console.warn(`  ${provider.name}: ${isDailyLimit ? 'daily limit reached' : 'max retries exhausted'}, trying next provider...`);
          break;
        }

        // Exponential backoff with retry-after support
        const retryAfterSec = parseInt(err.headers?.['retry-after'], 10) || 0;
        const backoff = 1000 * Math.pow(2, attempt - 1);
        const delay = Math.min(retryAfterSec > 0 ? retryAfterSec * 1000 : backoff, MAX_RETRY_WAIT_MS);
        console.warn(`  ${provider.name}: attempt ${attempt} failed (${err.status || err.code}), retrying in ${Math.round(delay / 1000)}s...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError || new Error('All LLM providers failed');
}

/**
 * Fetch recent items from all RSS sources, filter for AI/agent relevance
 */
async function fetchNews() {
  const sources = getSourcesForCategory(CATEGORY);

  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const feed = await parser.parseURL(source.url);
      const recent = (feed.items || []).slice(0, 10);
      const items = [];

      for (const item of recent) {
        const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
        const isRelevant = source.keywords.some((kw) => text.includes(kw));
        if (isRelevant && item.title) {
          items.push({
            title: item.title,
            snippet: (item.contentSnippet || '').slice(0, 500),
            link: item.link || '',
            source: source.name,
            date: item.pubDate || item.isoDate || '',
          });
        }
      }
      return items;
    })
  );

  const allItems = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      allItems.push(...results[i].value);
    } else {
      console.warn(`Failed to fetch ${sources[i].name}: ${results[i].reason?.message}`);
    }
  }

  // Sort by date (newest first), then add slight randomness within same-day items
  const sorted = allItems.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    // If dates are within 24h of each other, randomize order for variety
    if (Math.abs(dateA - dateB) < 86400000) return Math.random() - 0.5;
    return dateB - dateA;
  });
  return sorted.slice(0, ARTICLES_PER_RUN * 3);
}

/**
 * Generate the original article in English with SEO metadata and geo-location
 */
async function generateArticle(newsItems) {
  const agentConfig = getAgentConfig(CATEGORY);
  const agentVoice = agentConfig?.system_prompt || '';

  const newsList = newsItems
    .map((item, i) => `[${i + 1}] "${item.title}" — ${item.snippet} (Source: ${item.source}, URL: ${item.link})`)
    .join('\n\n');

  const response = await callLLMWithRetry({
    messages: [
      {
        role: 'system',
        content: `You are an AI news journalist for "Agents Society", a social network where humans and AI agents coexist.

YOUR EDITORIAL VOICE:
${agentVoice}

ARTICLE RULES:
- Pick the most interesting story about AI agents or AI technology
- Write a completely ORIGINAL article (do NOT copy the source)
- Professional journalistic style, 300-500 words
- Include analysis about what this means for the AI ecosystem
- Write with your unique editorial voice described above

SEO RULES:
- seo_title: Different from the article title, shorter, keyword-focused, max 60 chars
- meta_description: Entice clicks from search results, max 155 chars
- tags: 3-7 lowercase English tags (e.g. "ai agents", "openai", "automation")
- geo_location: Only if the article mentions a specific location (e.g. "San Francisco, USA"). null otherwise
- geo_country_code: ISO 3166-1 alpha-2 code (e.g. "US", "GB"). null if not location-specific

Return ONLY valid JSON:
{
  "title": "article title",
  "summary": "1-2 sentence summary, max 200 characters",
  "body": "full article body, use plain text with paragraph breaks using \\n\\n",
  "source_url": "URL of the original news",
  "seo_title": "SEO-optimized title, max 60 characters",
  "meta_description": "meta description, max 155 characters",
  "tags": ["tag1", "tag2", "tag3"],
  "geo_location": "City, Country or null",
  "geo_country_code": "2-letter ISO code or null"
}

CRITICAL: The "body" field must be a single JSON string. Use \\n\\n for paragraph breaks. Do NOT use markdown headers. Do NOT break out of the JSON string.`,
      },
      {
        role: 'user',
        content: `Here are today's top AI news stories. Pick the best one and write an original article in English:\n\n${newsList}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from LLM');

  // Detect truncated response (model hit token limit mid-JSON)
  const finishReason = response.choices[0]?.finish_reason;
  if (finishReason === 'length') {
    throw new Error('Response truncated (max_tokens reached) — article too long for token limit');
  }

  const parsed = extractJSON(content);
  if (!parsed.title || !parsed.body) {
    throw new Error('Missing title or body in response');
  }

  return {
    title: parsed.title,
    summary: (parsed.summary || '').slice(0, 490),
    body: parsed.body,
    source_url: parsed.source_url || newsItems[0]?.link || null,
    seo_title: (parsed.seo_title || '').slice(0, 70) || null,
    meta_description: (parsed.meta_description || '').slice(0, 160) || null,
    tags: Array.isArray(parsed.tags) ? parsed.tags.filter(t => typeof t === 'string').slice(0, 10) : [],
    geo_location: parsed.geo_location || null,
    geo_country_code: parsed.geo_country_code?.slice(0, 2)?.toUpperCase() || null,
  };
}

/**
 * Translate an article into another language (including SEO fields)
 */
async function translateArticle(article, langName) {
  const response = await callLLMWithRetry({
    messages: [
      {
        role: 'system',
        content: `You are a professional translator. Translate the given article into ${langName}. Keep the same tone, style, and structure.

Return ONLY valid JSON with these 5 string fields:
{
  "title": "translated title",
  "summary": "translated summary, max 200 characters",
  "body": "translated full article body, use \\n\\n for paragraph breaks",
  "seo_title": "translated SEO title, max 60 characters",
  "meta_description": "translated meta description, max 155 characters"
}

CRITICAL: The "body" field must be a single JSON string. Use \\n\\n for paragraph breaks. Do NOT use markdown headers. Do NOT break out of the JSON string.`,
      },
      {
        role: 'user',
        content: `Translate this article into ${langName}:\n\nTitle: ${article.title}\n\nSummary: ${article.summary}\n\nSEO Title: ${article.seo_title || article.title}\n\nMeta Description: ${article.meta_description || article.summary}\n\nBody:\n${article.body}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Empty translation response (${langName})`);

  const finishReason = response.choices[0]?.finish_reason;
  if (finishReason === 'length') {
    throw new Error(`Translation truncated (${langName}) — max_tokens reached`);
  }

  const parsed = extractJSON(content);
  if (!parsed.title || !parsed.body) {
    throw new Error(`Missing title or body in translation (${langName})`);
  }

  return {
    title: parsed.title,
    summary: (parsed.summary || '').slice(0, 490),
    body: parsed.body,
    seo_title: (parsed.seo_title || '').slice(0, 70) || null,
    meta_description: (parsed.meta_description || '').slice(0, 160) || null,
  };
}

/**
 * Publish article with all translations in a single API call
 */
async function publishArticle(article, translations) {
  const payload = {
    title: article.title,
    body: article.body,
    summary: article.summary,
    category: CATEGORY,
    source_url: article.source_url,
    featured_image_url: article.featured_image_url || null,
    status: 'published',
    // SEO fields
    seo_title: article.seo_title || null,
    meta_description: article.meta_description || null,
    tags: article.tags || [],
    reading_time_minutes: article.reading_time_minutes || null,
    // Geo fields
    geo_location: article.geo_location || null,
    geo_country_code: article.geo_country_code || null,
    translations,
  };

  const MAX_PUBLISH_ATTEMPTS = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_PUBLISH_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/v1/agents/article`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AGENT_API_KEY}`,
        },
        body: JSON.stringify(payload),
      }, PUBLISH_TIMEOUT_MS);

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 200)}`);
      }

      if (!data.success) {
        throw new Error(`Failed to publish: ${data.error || res.status}`);
      }

      return data.data;
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_PUBLISH_ATTEMPTS) {
        const waitMs = 2000 * attempt;
        console.warn(`  publish: attempt ${attempt} failed (${err.message}), retrying in ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  throw lastErr;
}

/**
 * Fetch recent articles by this agent to check for duplicates
 */
async function getRecentArticles() {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/v1/agents/article?limit=20`, {
      headers: { Authorization: `Bearer ${AGENT_API_KEY}` },
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

/**
 * Fetch recent articles from ALL agents (public endpoint) for cross-agent dedup.
 * Fetches multiple pages to cover ~2-3 days of articles across all agents.
 */
async function getGlobalRecentArticles() {
  try {
    const articles = [];
    let cursor = null;
    const MAX_PAGES = 2;

    for (let page = 0; page < MAX_PAGES; page++) {
      const url = cursor
        ? `${API_BASE}/api/news?limit=30&sort=latest&cursor=${cursor}`
        : `${API_BASE}/api/news?limit=30&sort=latest`;
      const res = await fetchWithTimeout(url);
      const data = await res.json();
      articles.push(...(data.articles || []));
      if (!data.hasMore || !data.nextCursor) break;
      cursor = data.nextCursor;
    }

    return articles;
  } catch {
    return [];
  }
}

/**
 * Use LLM to generate descriptive image search keywords + a short headline
 * for the image overlay. Returns { queries: string[], headline: string }.
 */
async function generateImageKeywords(title, body) {
  try {
    const response = await callLLMWithRetry({
      messages: [
        {
          role: 'system',
          content: `You generate image search keywords for stock photo searches AND a short headline to overlay on the image. Given an article title and body, return 3 different search queries plus a punchy headline.

Return ONLY valid JSON:
{
  "queries": ["descriptive visual query 1", "descriptive visual query 2", "broader fallback query"],
  "headline": "short punchy phrase"
}

Query rules:
- Each query should be 2-4 words, describing a VISUAL scene (not abstract concepts)
- Query 1: specific to the article topic (e.g. "robot arm assembly line", "developer coding laptop")
- Query 2: related but different angle (e.g. "circuit board closeup", "team brainstorming office")
- Query 3: broad fallback (e.g. "artificial intelligence technology", "digital innovation")
- Focus on things a camera can photograph, not abstract ideas
- Do NOT use brand names or person names

Headline rules:
- 4 to 8 words, max 60 characters total
- Attention-grabbing, captures the main hook of the article
- Plain text, no quotes, no emojis, no trailing punctuation
- Written in the same language as the article title`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nBody excerpt: ${body.slice(0, 500)}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 250,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = extractJSON(content);
      if (parsed.queries && parsed.queries.length > 0) {
        return {
          queries: parsed.queries,
          headline: typeof parsed.headline === 'string' ? parsed.headline.trim() : '',
        };
      }
    }
  } catch (err) {
    console.warn(`  LLM image keywords error: ${err.message}`);
  }

  // Fallback: extract from title
  const words = title.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3);
  return {
    queries: [
      words.slice(0, 3).join(' ') + ' technology',
      words.slice(0, 2).join(' '),
      'artificial intelligence technology',
    ],
    headline: title.length > 80 ? title.slice(0, 77).trimEnd() + '…' : title,
  };
}

/**
 * Verify an image URL is reachable and returns an actual image.
 * Uses HEAD request to avoid downloading the whole body.
 */
async function verifyImageUrl(url) {
  try {
    const res = await fetchWithTimeout(url, { method: 'HEAD' }, 8000);
    if (!res.ok) return false;
    const contentType = res.headers.get('content-type') || '';
    return contentType.startsWith('image/');
  } catch {
    return false;
  }
}

/**
 * Search Unsplash for a photo matching the query.
 * Returns a candidate list (not a single URL) so the caller can try multiple
 * images and skip any that fail validation.
 */
async function searchUnsplash(query) {
  if (!UNSPLASH_ACCESS_KEY) return [];
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`;
    const res = await fetchWithTimeout(url, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
    if (!res.ok) {
      console.warn(`  Unsplash HTTP ${res.status} for "${query}"`);
      return [];
    }
    const data = await res.json();
    const results = data.results || [];
    // Shuffle for variety across agents/runs
    const shuffled = [...results].sort(() => Math.random() - 0.5);
    return shuffled
      .map((photo) => ({
        url: photo.urls?.regular || photo.urls?.small,
        source: 'Unsplash',
        query,
        author: photo.user?.name || 'unknown',
      }))
      .filter((c) => c.url);
  } catch (err) {
    console.warn(`  Unsplash error for "${query}": ${err.message}`);
    return [];
  }
}

/**
 * Search Pixabay for a photo matching the query.
 * Returns a candidate list. Prefers `largeImageURL` (1280px, unwatermarked)
 * over `webformatURL` (640px, may be watermarked).
 */
async function searchPixabay(query) {
  const PIXABAY_KEY = process.env.PIXABAY_API_KEY || '';
  if (!PIXABAY_KEY) return [];
  try {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=10&safesearch=true`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      console.warn(`  Pixabay HTTP ${res.status} for "${query}"`);
      return [];
    }
    const data = await res.json();
    const hits = data.hits || [];
    const shuffled = [...hits].sort(() => Math.random() - 0.5);
    return shuffled
      .map((hit) => ({
        url: hit.largeImageURL || hit.webformatURL,
        source: 'Pixabay',
        query,
        author: hit.user || 'unknown',
      }))
      .filter((c) => c.url);
  } catch (err) {
    console.warn(`  Pixabay error for "${query}": ${err.message}`);
    return [];
  }
}

/**
 * Escape a string for safe inclusion in an SVG text node.
 */
function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Greedy word-wrap into up to `maxLines` lines of roughly `maxCharsPerLine` chars.
 */
function wrapHeadline(text, maxCharsPerLine, maxLines) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (lines.length >= maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:!?]+$/, '') + '…';
  }
  return lines;
}

/**
 * Download an image, composite a headline over a dark gradient, and return a
 * JPEG buffer sized 1200x630 (OG standard).
 */
async function overlayHeadlineOnImage(imageUrl, headline) {
  const res = await fetchWithTimeout(imageUrl, {}, 15000);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  const sourceBuffer = Buffer.from(await res.arrayBuffer());

  const WIDTH = 1200;
  const HEIGHT = 630;
  const lines = wrapHeadline(headline.toUpperCase(), 26, 3);
  const fontSize = lines.length >= 3 ? 58 : 64;
  const lineHeight = Math.round(fontSize * 1.12);
  const leftPadding = 64;
  const bottomPadding = 72;
  const textTop = HEIGHT - bottomPadding - (lines.length - 1) * lineHeight;

  const tspans = lines
    .map((line, i) => {
      const y = textTop + i * lineHeight;
      return `<text x="${leftPadding}" y="${y}" class="hl">${escapeXml(line)}</text>`;
    })
    .join('');

  const accentY = textTop - fontSize - 18;
  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="45%" stop-color="#000" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.92"/>
    </linearGradient>
    <style>
      .hl {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        font-size: ${fontSize}px;
        font-weight: 900;
        fill: #ffffff;
        letter-spacing: -0.5px;
        paint-order: stroke;
        stroke: rgba(0,0,0,0.35);
        stroke-width: 2px;
      }
    </style>
  </defs>
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
  <rect x="${leftPadding}" y="${accentY}" width="56" height="6" fill="#ffffff" opacity="0.9"/>
  ${tspans}
</svg>`;

  return await sharp(sourceBuffer)
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toBuffer();
}

/**
 * Upload a JPEG buffer to Supabase Storage. The original stock-photo URL is
 * attached as object metadata so a future cleanup job can rollback the
 * article's featured_image_url before deleting the branded file.
 * Assumes the bucket is configured as public.
 */
async function uploadToSupabase(imageBuffer, sourceUrl) {
  if (!supabase) throw new Error('Supabase not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  const random = Math.random().toString(36).slice(2, 10);
  const path = `${CATEGORY}/${Date.now()}-${random}.jpg`;
  const { error } = await supabase.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(path, imageBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false,
      metadata: { source_url: sourceUrl, category: CATEGORY },
    });
  if (error) throw new Error(`Supabase upload failed: ${error.message}`);
  const { data } = supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Compose the headline on top of the sourced image and upload the result.
 * Returns the hosted URL, or null on any failure so the caller can fall back
 * to the original image.
 */
async function brandImage(sourceUrl, headline) {
  if (!supabase) {
    console.log('  Skipping image branding (Supabase not configured)');
    return null;
  }
  if (!headline) {
    console.log('  Skipping image branding (no headline generated)');
    return null;
  }
  try {
    const buffer = await overlayHeadlineOnImage(sourceUrl, headline);
    const url = await uploadToSupabase(buffer, sourceUrl);
    console.log(`  Branded image uploaded: ${url}`);
    return url;
  } catch (err) {
    console.warn(`  Image branding failed: ${err.message}`);
    return null;
  }
}

/**
 * Search for a relevant featured image. For each query, gather candidates from
 * both providers and return the first one whose URL actually resolves to an
 * image. This prevents publishing articles with broken image URLs.
 * If IMGBB_API_KEY is set, composes the generated headline on top of the
 * chosen image and returns the hosted branded URL.
 */
async function findFeaturedImage(title, body) {
  const { queries, headline } = await generateImageKeywords(title, body);
  console.log(`  Image search queries: ${JSON.stringify(queries)}`);
  if (headline) console.log(`  Image headline: "${headline}"`);

  for (const query of queries) {
    const [unsplashCandidates, pixabayCandidates] = await Promise.all([
      searchUnsplash(query),
      searchPixabay(query),
    ]);
    // Interleave providers so we don't exhaust one before trying the other
    const candidates = [];
    const max = Math.max(unsplashCandidates.length, pixabayCandidates.length);
    for (let i = 0; i < max; i++) {
      if (unsplashCandidates[i]) candidates.push(unsplashCandidates[i]);
      if (pixabayCandidates[i]) candidates.push(pixabayCandidates[i]);
    }

    for (const candidate of candidates) {
      const ok = await verifyImageUrl(candidate.url);
      if (!ok) {
        console.warn(`  Skipping unreachable image from ${candidate.source}: ${candidate.url}`);
        continue;
      }
      console.log(`  Image found: ${candidate.source} "${candidate.query}" (by ${candidate.author})`);
      const branded = await brandImage(candidate.url, headline);
      return branded || candidate.url;
    }
  }

  console.warn('  No featured image found after all attempts');
  return null;
}

/**
 * Send heartbeat to stay active
 */
async function sendHeartbeat() {
  try {
    await fetchWithTimeout(`${API_BASE}/api/v1/agents/heartbeat`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${AGENT_API_KEY}` },
    });
  } catch {
    // non-critical
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(`[${new Date().toISOString()}] News agent starting...`);
  console.log(`  LLM providers: ${LLM_PROVIDERS.map(p => `${p.name} (${p.model})`).join(' → ')}`);

  await sendHeartbeat();

  // Try to use cached fresh items first (resilience for retries after LLM failures)
  let freshItems = readCache();
  let allArticles = [];

  if (!freshItems) {
    console.log('Fetching news from RSS feeds...');
    const newsItems = await fetchNews();

    if (newsItems.length === 0) {
      console.log('No relevant news found. Exiting.');
      return;
    }

    // Check for duplicates against recent articles (own + all agents)
    console.log('Checking for duplicate articles...');
    const [recentArticles, globalArticles] = await Promise.all([
      getRecentArticles(),
      getGlobalRecentArticles(),
    ]);
    allArticles = [...recentArticles, ...globalArticles];
    console.log(`  Loaded ${recentArticles.length} own + ${globalArticles.length} global articles for dedup`);

    // Filter out news items that match already published articles (by title or source_url)
    freshItems = newsItems.filter((item) => !isDuplicate(item.title, allArticles, item.link));

    if (freshItems.length === 0) {
      console.log('All news items already covered. Exiting.');
      return;
    }

    // Cache fresh items for retry resilience
    writeCache(freshItems);
  } else {
    // Still need allArticles for dedup check on generated article
    const [recentArticles, globalArticles] = await Promise.all([
      getRecentArticles(),
      getGlobalRecentArticles(),
    ]);
    allArticles = [...recentArticles, ...globalArticles];
  }

  console.log(`Found ${freshItems.length} fresh items. Generating article...`);

  // Step 1: Generate original article in English (retry if title is duplicate)
  let article = null;
  let remainingItems = [...freshItems];
  const MAX_GENERATE_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_GENERATE_ATTEMPTS; attempt++) {
    if (remainingItems.length === 0) {
      console.log('No more fresh items to try. Exiting.');
      return;
    }

    console.log(`Generating article in English (attempt ${attempt}/${MAX_GENERATE_ATTEMPTS})...`);

    let candidate;
    try {
      candidate = await generateArticle(remainingItems);
    } catch (err) {
      console.warn(`  Article generation failed: ${err.message}`);
      if (attempt < MAX_GENERATE_ATTEMPTS) {
        console.log('  Retrying...');
        continue;
      }
      throw err;
    }

    if (!isDuplicate(candidate.title, allArticles, candidate.source_url)) {
      article = candidate;
      break;
    }

    console.log(`  Duplicate detected: "${candidate.title}". Retrying with different items...`);
    // Remove the source item the LLM picked so it tries a different one
    remainingItems = remainingItems.filter((item) => item.link !== candidate.source_url);
    allArticles.push({ title: candidate.title, source_url: candidate.source_url });
  }

  if (!article) {
    console.log('Could not generate a non-duplicate article after all attempts. Exiting.');
    return;
  }

  // Calculate reading time from word count
  const wordCount = article.body.split(/\s+/).filter(Boolean).length;
  article.reading_time_minutes = Math.max(1, Math.ceil(wordCount / 200));

  // Log SEO info (already included in article generation)
  console.log(`  SEO title: ${article.seo_title}`);
  console.log(`  Tags: ${(article.tags || []).join(', ')}`);
  if (article.geo_location) console.log(`  Geo: ${article.geo_location} (${article.geo_country_code})`);
  console.log(`  Reading time: ${article.reading_time_minutes} min`);

  // Step 2: Run translations and image search in parallel
  console.log('Generating translations and image in parallel...');
  const langs = [
    { code: 'es', name: 'Spanish' },
    { code: 'zh', name: 'Simplified Chinese' },
  ];

  const [imageResult, ...translationResults] = await Promise.allSettled([
    findFeaturedImage(article.title, article.body),
    ...langs.map(({ name }) => translateArticle(article, name)),
  ]);

  // Apply image
  if (imageResult.status === 'fulfilled' && imageResult.value) {
    article.featured_image_url = imageResult.value;
  } else if (imageResult.status === 'rejected') {
    console.warn(`  Image search error: ${imageResult.reason?.message}`);
  }

  // Apply translations
  const translations = { en: { title: article.title, body: article.body, summary: article.summary, seo_title: article.seo_title, meta_description: article.meta_description } };
  for (let i = 0; i < langs.length; i++) {
    if (translationResults[i].status === 'fulfilled') {
      translations[langs[i].code] = translationResults[i].value;
      console.log(`  Translated to ${langs[i].name}`);
    } else {
      console.error(`  Translation error (${langs[i].code}): ${translationResults[i].reason?.message}`);
    }
  }

  // Step 5: Publish single article with all translations
  console.log('Publishing article...');
  const result = await publishArticle(article, translations);
  console.log(`Published: "${result.title}" — slug: ${result.slug}`);

  console.log('Done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
