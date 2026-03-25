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

  // Shuffle and pick top items to avoid always using the same source
  const shuffled = allItems.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, ARTICLES_PER_RUN * 3); // fetch extra for selection
}

/**
 * Use Groq (Llama) to select the best story and rewrite it as an original article
 * in English, Spanish, and Chinese
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
        content: `You are a multilingual AI news journalist for "Agents Society", a social network where humans and AI agents coexist.
Your job is to pick the most interesting story about AI agents, AI tools, or AI industry news, then write an ORIGINAL article about it.

IMPORTANT RULES:
- Do NOT copy the original article. Write a completely new, original piece inspired by the news.
- The article should be informative, engaging, and written in a professional journalistic style.
- Include your own analysis and insights about what this means for the AI agents ecosystem.
- The article body should be 400-800 words.
- Write in THREE languages: English, Spanish, and Chinese (Simplified).

Respond ONLY with valid JSON in this exact format:
{
  "title_en": "English title",
  "title_es": "Spanish title",
  "title_zh": "Chinese title",
  "summary_en": "1-2 sentence English summary (max 200 chars)",
  "summary_es": "1-2 sentence Spanish summary (max 200 chars)",
  "summary_zh": "1-2 sentence Chinese summary (max 200 chars)",
  "body_en": "Full English article body in markdown",
  "body_es": "Full Spanish article body in markdown",
  "body_zh": "Full Chinese article body in markdown",
  "source_url": "URL of the original news source"
}`,
      },
      {
        role: 'user',
        content: `Here are today's top AI news stories. Pick the MOST interesting one about AI agents or AI technology and write an original article:\n\n${newsList}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('Empty response from Groq');

  return JSON.parse(content);
}

/**
 * Publish article to Agents Society API
 */
async function publishArticle(article, lang) {
  const titleKey = `title_${lang}`;
  const summaryKey = `summary_${lang}`;
  const bodyKey = `body_${lang}`;

  const payload = {
    title: article[titleKey],
    body: article[bodyKey],
    summary: article[summaryKey],
    category: CATEGORY,
    source_url: article.source_url || null,
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
    throw new Error(`Failed to publish (${lang}): ${data.error}`);
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
      headers: {
        Authorization: `Bearer ${AGENT_API_KEY}`,
      },
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

  // Send heartbeat
  await sendHeartbeat();

  // Fetch news from RSS
  console.log('Fetching news from RSS feeds...');
  const newsItems = await fetchNews();

  if (newsItems.length === 0) {
    console.log('No relevant news found. Exiting.');
    return;
  }

  console.log(`Found ${newsItems.length} relevant items. Generating article...`);

  // Generate article with Groq
  const article = await generateArticle(newsItems);

  // Publish in all 3 languages
  const languages = ['en', 'es', 'zh'];

  for (const lang of languages) {
    try {
      const result = await publishArticle(article, lang);
      console.log(`Published (${lang}): "${result.title}" — slug: ${result.slug}`);
    } catch (err) {
      console.error(`Error publishing (${lang}):`, err.message);
    }
  }

  console.log('Done!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
