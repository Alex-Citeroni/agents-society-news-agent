import Parser from 'rss-parser';
import Groq from 'groq-sdk';
import { getSourcesForCategory } from './rss-sources.js';

const API_BASE = process.env.API_BASE || 'https://agentssociety.ai';
const AGENT_API_KEY = process.env.AGENT_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY || '';
const CATEGORY = process.env.NEWS_CATEGORY || 'ai_agents';
const ARTICLES_PER_RUN = parseInt(process.env.ARTICLES_PER_RUN || '1', 10);

if (!AGENT_API_KEY || !GROQ_API_KEY) {
  console.error('Missing required env vars: AGENT_API_KEY, GROQ_API_KEY');
  process.exit(1);
}

const parser = new Parser({ timeout: 10000 });
const groq = new Groq({ apiKey: GROQ_API_KEY });

/**
 * Fetch recent items from all RSS sources, filter for AI/agent relevance
 */
async function fetchNews() {
  const allItems = [];

  const sources = getSourcesForCategory(CATEGORY);
  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.url);
      const recent = (feed.items || []).slice(0, 10);

      for (const item of recent) {
        const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
        const isRelevant = source.keywords.some((kw) => text.includes(kw));
        if (isRelevant && item.title) {
          allItems.push({
            title: item.title,
            snippet: (item.contentSnippet || '').slice(0, 500),
            link: item.link || '',
            source: source.name,
            date: item.pubDate || item.isoDate || '',
          });
        }
      }
    } catch (err) {
      console.warn(`Failed to fetch ${source.name}: ${err.message}`);
    }
  }

  const shuffled = allItems.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, ARTICLES_PER_RUN * 3);
}

/**
 * Generate the original article in English
 */
async function generateArticle(newsItems) {
  const newsList = newsItems
    .map((item, i) => `[${i + 1}] "${item.title}" — ${item.snippet} (Source: ${item.source}, URL: ${item.link})`)
    .join('\n\n');

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are an AI news journalist for "Agents Society", a social network where humans and AI agents coexist.

RULES:
- Pick the most interesting story about AI agents or AI technology
- Write a completely ORIGINAL article (do NOT copy the source)
- Professional journalistic style, 400-800 words
- Include analysis about what this means for the AI ecosystem

Return ONLY valid JSON with these 4 string fields:
{
  "title": "article title",
  "summary": "1-2 sentence summary, max 200 characters",
  "body": "full article body, use plain text with paragraph breaks using \\n\\n",
  "source_url": "URL of the original news"
}

CRITICAL: The "body" field must be a single JSON string. Use \\n\\n for paragraph breaks. Do NOT use markdown headers. Do NOT break out of the JSON string.`,
      },
      {
        role: 'user',
        content: `Here are today's top AI news stories. Pick the best one and write an original article in English:\n\n${newsList}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq');

  const parsed = JSON.parse(content);
  if (!parsed.title || !parsed.body) {
    throw new Error('Missing title or body in response');
  }

  return {
    title: parsed.title,
    summary: (parsed.summary || '').slice(0, 490),
    body: parsed.body,
    source_url: parsed.source_url || newsItems[0]?.link || null,
  };
}

/**
 * Translate an article into another language
 */
async function translateArticle(article, langName) {
  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are a professional translator. Translate the given article into ${langName}. Keep the same tone, style, and structure.

Return ONLY valid JSON with these 3 string fields:
{
  "title": "translated title",
  "summary": "translated summary, max 200 characters",
  "body": "translated full article body, use \\n\\n for paragraph breaks"
}

CRITICAL: The "body" field must be a single JSON string. Use \\n\\n for paragraph breaks. Do NOT use markdown headers. Do NOT break out of the JSON string.`,
      },
      {
        role: 'user',
        content: `Translate this article into ${langName}:\n\nTitle: ${article.title}\n\nSummary: ${article.summary}\n\nBody:\n${article.body}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Empty translation response (${langName})`);

  const parsed = JSON.parse(content);
  if (!parsed.title || !parsed.body) {
    throw new Error(`Missing title or body in translation (${langName})`);
  }

  return {
    title: parsed.title,
    summary: (parsed.summary || '').slice(0, 490),
    body: parsed.body,
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
    translations,
  };

  const res = await fetch(`${API_BASE}/api/v1/agents/article`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AGENT_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(`Failed to publish: ${data.error}`);
  }

  return data.data;
}

/**
 * Fetch recent articles by this agent to check for duplicates
 */
async function getRecentArticles() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/agents/article?limit=20`, {
      headers: { Authorization: `Bearer ${AGENT_API_KEY}` },
    });
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

/**
 * Fetch recent articles from ALL agents (public endpoint) for cross-agent dedup
 */
async function getGlobalRecentArticles() {
  try {
    const res = await fetch(`${API_BASE}/api/news?limit=30&sort=latest`);
    const data = await res.json();
    return data.articles || [];
  } catch {
    return [];
  }
}

/**
 * Check if an article with a similar title or same source URL was already published
 */
function isDuplicate(newTitle, existingArticles, sourceUrl = null) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const newNorm = normalize(newTitle);
  const newWords = new Set(newNorm.split(/\s+/).filter((w) => w.length > 3));

  for (const article of existingArticles) {
    // Check source_url match (exact dedup across agents)
    if (sourceUrl && article.source_url && sourceUrl === article.source_url) return true;

    const existNorm = normalize(article.title);
    const existWords = new Set(existNorm.split(/\s+/).filter((w) => w.length > 3));

    // Count overlapping significant words
    let overlap = 0;
    for (const word of newWords) {
      if (existWords.has(word)) overlap++;
    }

    const similarity = newWords.size > 0 ? overlap / newWords.size : 0;
    if (similarity > 0.5) return true;
  }

  return false;
}

/**
 * Use LLM to generate descriptive image search keywords from the article
 */
async function generateImageKeywords(title, body) {
  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You generate image search keywords for stock photo searches. Given an article title and body, return 3 different search queries that would find visually relevant, distinct photos.

Return ONLY valid JSON:
{
  "queries": ["descriptive visual query 1", "descriptive visual query 2", "broader fallback query"]
}

Rules:
- Each query should be 2-4 words, describing a VISUAL scene (not abstract concepts)
- Query 1: specific to the article topic (e.g. "robot arm assembly line", "developer coding laptop")
- Query 2: related but different angle (e.g. "circuit board closeup", "team brainstorming office")
- Query 3: broad fallback (e.g. "artificial intelligence technology", "digital innovation")
- Focus on things a camera can photograph, not abstract ideas
- Do NOT use brand names or person names`,
        },
        {
          role: 'user',
          content: `Title: ${title}\n\nBody excerpt: ${body.slice(0, 500)}`,
        },
      ],
      temperature: 0.5,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      if (parsed.queries && parsed.queries.length > 0) {
        return parsed.queries;
      }
    }
  } catch (err) {
    console.warn(`  LLM image keywords error: ${err.message}`);
  }

  // Fallback: extract from title
  const words = title.replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 3);
  return [
    words.slice(0, 3).join(' ') + ' technology',
    words.slice(0, 2).join(' '),
    'artificial intelligence technology',
  ];
}

/**
 * Search Unsplash for a photo matching the query
 */
async function searchUnsplash(query) {
  if (!UNSPLASH_ACCESS_KEY) return null;
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const photo = data.results[Math.floor(Math.random() * Math.min(data.results.length, 5))];
        const imageUrl = photo.urls?.regular || photo.urls?.small;
        if (imageUrl) {
          console.log(`  Image found: Unsplash "${query}" (by ${photo.user?.name || 'unknown'})`);
          return imageUrl;
        }
      }
    }
  } catch (err) {
    console.warn(`  Unsplash error for "${query}": ${err.message}`);
  }
  return null;
}

/**
 * Search Pixabay for a photo matching the query
 */
async function searchPixabay(query) {
  const PIXABAY_KEY = process.env.PIXABAY_API_KEY || '';
  if (!PIXABAY_KEY) return null;
  try {
    const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=5`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.hits && data.hits.length > 0) {
        const hit = data.hits[Math.floor(Math.random() * Math.min(data.hits.length, 5))];
        console.log(`  Image found: Pixabay "${query}"`);
        return hit.webformatURL || hit.largeImageURL;
      }
    }
  } catch (err) {
    console.warn(`  Pixabay error for "${query}": ${err.message}`);
  }
  return null;
}

/**
 * Search for a relevant featured image with LLM-powered keywords and retry strategy
 */
async function findFeaturedImage(title, body) {
  const queries = await generateImageKeywords(title, body);
  console.log(`  Image search queries: ${JSON.stringify(queries)}`);

  // Try each query on Unsplash first, then Pixabay
  for (const query of queries) {
    const unsplashResult = await searchUnsplash(query);
    if (unsplashResult) return unsplashResult;

    const pixabayResult = await searchPixabay(query);
    if (pixabayResult) return pixabayResult;
  }

  console.warn('  No featured image found after all attempts');
  return null;
}

/**
 * Send heartbeat to stay active
 */
async function sendHeartbeat() {
  try {
    await fetch(`${API_BASE}/api/v1/agents/heartbeat`, {
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

  await sendHeartbeat();

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
  const allArticles = [...recentArticles, ...globalArticles];
  console.log(`  Loaded ${recentArticles.length} own + ${globalArticles.length} global articles for dedup`);

  // Filter out news items that match already published articles (by title or source_url)
  const freshItems = newsItems.filter((item) => !isDuplicate(item.title, allArticles, item.link));

  if (freshItems.length === 0) {
    console.log('All news items already covered. Exiting.');
    return;
  }

  console.log(`Found ${freshItems.length} fresh items. Generating article...`);

  // Step 1: Generate original article in English
  console.log('Generating article in English...');
  const article = await generateArticle(freshItems);

  if (isDuplicate(article.title, allArticles, article.source_url)) {
    console.log(`Duplicate detected: "${article.title}". Skipping.`);
    return;
  }

  // Step 2: Translate to Spanish and Chinese
  const translations = { en: { title: article.title, body: article.body, summary: article.summary } };

  const langs = [
    { code: 'es', name: 'Spanish' },
    { code: 'zh', name: 'Simplified Chinese' },
  ];

  for (const { code, name } of langs) {
    try {
      console.log(`Translating to ${name}...`);
      translations[code] = await translateArticle(article, name);
    } catch (err) {
      console.error(`Translation error (${code}):`, err.message);
    }
  }

  // Step 3: Find a featured image
  console.log('Searching for featured image...');
  const featuredImageUrl = await findFeaturedImage(article.title, article.body);
  if (featuredImageUrl) {
    article.featured_image_url = featuredImageUrl;
  }

  // Step 4: Publish single article with all translations
  console.log('Publishing article...');
  const result = await publishArticle(article, translations);
  console.log(`Published: "${result.title}" — slug: ${result.slug}`);

  console.log('Done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
