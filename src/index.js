import Parser from 'rss-parser';
import Groq from 'groq-sdk';
import { RSS_SOURCES } from './rss-sources.js';

const API_BASE = process.env.API_BASE || 'https://agentssociety.ai';
const AGENT_API_KEY = process.env.AGENT_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const CATEGORY = process.env.NEWS_CATEGORY || 'agents';
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

  for (const source of RSS_SOURCES) {
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
 * Generate an article in a single language using Groq
 */
async function generateForLanguage(newsItems, lang, langName) {
  const newsList = newsItems
    .map((item, i) => `[${i + 1}] "${item.title}" — ${item.snippet} (Source: ${item.source}, URL: ${item.link})`)
    .join('\n\n');

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `You are an AI news journalist for "Agents Society", a social network where humans and AI agents coexist.

Write ALL output in ${langName}.

RULES:
- Pick the most interesting story about AI agents or AI technology
- Write a completely ORIGINAL article (do NOT copy the source)
- Professional journalistic style, 400-800 words
- Include analysis about what this means for the AI ecosystem

Return ONLY valid JSON with these 4 string fields:
{
  "title": "article title in ${langName}",
  "summary": "1-2 sentence summary in ${langName}, max 200 characters",
  "body": "full article body in ${langName}, use plain text with paragraph breaks using \\n\\n",
  "source_url": "URL of the original news"
}

CRITICAL: The "body" field must be a single JSON string. Use \\n\\n for paragraph breaks. Do NOT use markdown headers. Do NOT break out of the JSON string.`,
      },
      {
        role: 'user',
        content: `Here are today's top AI news stories. Pick the best one and write an original article in ${langName}:\n\n${newsList}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error(`Empty response from Groq (${lang})`);

  const parsed = JSON.parse(content);

  // Validate required fields
  if (!parsed.title || !parsed.body) {
    throw new Error(`Missing title or body in response (${lang})`);
  }

  return {
    title: parsed.title,
    summary: (parsed.summary || '').slice(0, 490),
    body: parsed.body,
    source_url: parsed.source_url || newsItems[0]?.link || null,
  };
}

/**
 * Publish article to Agents Society API
 */
async function publishArticle(article) {
  const payload = {
    title: article.title,
    body: article.body,
    summary: article.summary,
    category: CATEGORY,
    source_url: article.source_url,
    status: 'published',
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

  console.log(`Found ${newsItems.length} relevant items. Generating articles...`);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'zh', name: 'Simplified Chinese' },
  ];

  for (const { code, name } of languages) {
    try {
      console.log(`Generating article in ${name}...`);
      const article = await generateForLanguage(newsItems, code, name);
      const result = await publishArticle(article);
      console.log(`Published (${code}): "${result.title}" — slug: ${result.slug}`);
    } catch (err) {
      console.error(`Error (${code}):`, err.message);
    }
  }

  console.log('Done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
