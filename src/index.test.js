import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RSS_SOURCES } from './rss-sources.js';

// Import isDuplicate by re-declaring it here (since index.js doesn't export it)
// We test the logic directly
function isDuplicate(newTitle, existingArticles) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const newNorm = normalize(newTitle);
  const newWords = new Set(newNorm.split(/\s+/).filter((w) => w.length > 3));

  for (const article of existingArticles) {
    const existNorm = normalize(article.title);
    const existWords = new Set(existNorm.split(/\s+/).filter((w) => w.length > 3));

    let overlap = 0;
    for (const word of newWords) {
      if (existWords.has(word)) overlap++;
    }

    const similarity = newWords.size > 0 ? overlap / newWords.size : 0;
    if (similarity > 0.5) return true;
  }

  return false;
}

describe('RSS Sources', () => {
  it('should have at least one source', () => {
    assert.ok(RSS_SOURCES.length > 0, 'No RSS sources defined');
  });

  it('each source should have required fields', () => {
    for (const source of RSS_SOURCES) {
      assert.ok(source.name, `Source missing name`);
      assert.ok(source.url, `Source ${source.name} missing url`);
      assert.ok(source.url.startsWith('http'), `Source ${source.name} has invalid url`);
      assert.ok(Array.isArray(source.keywords), `Source ${source.name} missing keywords array`);
      assert.ok(source.keywords.length > 0, `Source ${source.name} has empty keywords`);
    }
  });

  it('all source URLs should be unique', () => {
    const urls = RSS_SOURCES.map((s) => s.url);
    const unique = new Set(urls);
    assert.strictEqual(urls.length, unique.size, 'Duplicate source URLs found');
  });
});

describe('Duplicate Detection', () => {
  const existing = [
    { title: 'OpenAI Launches New GPT-5 Model With Advanced Reasoning' },
    { title: 'Google DeepMind Releases Gemini 2.0 for Enterprise' },
    { title: 'AI Agents Transform Customer Service Industry' },
  ];

  it('should detect exact duplicate', () => {
    assert.strictEqual(
      isDuplicate('OpenAI Launches New GPT-5 Model With Advanced Reasoning', existing),
      true
    );
  });

  it('should detect similar title', () => {
    assert.strictEqual(
      isDuplicate('OpenAI Launches GPT-5 Model With Advanced Reasoning Capabilities', existing),
      true
    );
  });

  it('should not flag unrelated article', () => {
    assert.strictEqual(
      isDuplicate('Meta Announces New Open Source LLM Called Llama 4', existing),
      false
    );
  });

  it('should handle empty existing articles', () => {
    assert.strictEqual(
      isDuplicate('Some New Article Title', []),
      false
    );
  });

  it('should handle short titles', () => {
    assert.strictEqual(
      isDuplicate('AI News', existing),
      false
    );
  });
});

describe('Environment Config', () => {
  it('should have valid category options', () => {
    const validCategories = [
      'ai_agents', 'ai_tools', 'llms', 'research', 'open_source',
      'startups', 'industry', 'use_cases', 'future_of_work', 'regulation', 'crypto_agents',
    ];
    const category = process.env.NEWS_CATEGORY || 'ai_agents';
    assert.ok(validCategories.includes(category), `Invalid category: ${category}`);
  });

  it('ARTICLES_PER_RUN should be a positive number', () => {
    const n = parseInt(process.env.ARTICLES_PER_RUN || '1', 10);
    assert.ok(n > 0 && n <= 10, `ARTICLES_PER_RUN should be 1-10, got ${n}`);
  });
});
