/**
 * RSS feed sources for AI/agents news.
 * Returns category-specific sources when available, falls back to general AI sources.
 */
import { getRssSources } from './agents-config.js';

/** General-purpose AI sources (fallback) */
const DEFAULT_SOURCES = [
  { name: 'MIT Technology Review - AI', url: 'https://www.technologyreview.com/feed/', keywords: ['ai', 'artificial intelligence', 'machine learning', 'agent', 'llm', 'robot'] },
  { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', keywords: ['ai', 'agent', 'chatbot', 'llm', 'openai', 'anthropic', 'google'] },
  { name: 'Ars Technica - AI', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', keywords: ['ai', 'artificial intelligence', 'machine learning', 'agent', 'llm'] },
  { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', keywords: ['ai', 'agent', 'startup', 'llm', 'model'] },
  { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['ai', 'agent', 'enterprise', 'llm'] },
];

/**
 * Get RSS sources for a category. Returns specialized sources if configured,
 * otherwise falls back to default general AI sources.
 */
export function getSourcesForCategory(category) {
  const specialized = getRssSources(category);
  return specialized || DEFAULT_SOURCES;
}

// Keep backward compatibility
export const RSS_SOURCES = DEFAULT_SOURCES;
