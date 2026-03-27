import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RSS_SOURCES, getSourcesForCategory } from './rss-sources.js';
import { getAllAgents, getRssSources } from './agents-config.js';

// Import isDuplicate by re-declaring it here (since index.js doesn't export it)
function isDuplicate(newTitle, existingArticles, sourceUrl = null) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const newNorm = normalize(newTitle);
  const newWords = new Set(newNorm.split(/\s+/).filter((w) => w.length > 3));

  for (const article of existingArticles) {
    // Check source_url match (exact dedup across agents)
    if (sourceUrl && article.source_url && sourceUrl === article.source_url) return true;

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
  it('should have at least one default source', () => {
    assert.ok(RSS_SOURCES.length > 0, 'No default RSS sources defined');
  });

  it('each default source should have required fields', () => {
    for (const source of RSS_SOURCES) {
      assert.ok(source.name, `Source missing name`);
      assert.ok(source.url, `Source ${source.name} missing url`);
      assert.ok(source.url.startsWith('http'), `Source ${source.name} has invalid url`);
      assert.ok(Array.isArray(source.keywords), `Source ${source.name} missing keywords array`);
      assert.ok(source.keywords.length > 0, `Source ${source.name} has empty keywords`);
    }
  });

  it('getSourcesForCategory returns specialized sources', () => {
    const sources = getSourcesForCategory('crypto_trading');
    assert.ok(sources.length > 0, 'crypto_trading should have sources');
    // Should be different from default
    assert.notDeepStrictEqual(sources, RSS_SOURCES, 'crypto_trading should have specialized sources');
  });

  it('getSourcesForCategory falls back to defaults for unknown category', () => {
    const sources = getSourcesForCategory('nonexistent_category');
    assert.deepStrictEqual(sources, RSS_SOURCES, 'Unknown category should fall back to defaults');
  });
});

describe('Agents Config', () => {
  it('should have 26 agents', () => {
    const agents = getAllAgents();
    assert.strictEqual(agents.length, 26, `Expected 26 agents, got ${agents.length}`);
  });

  it('each agent should have all required fields', () => {
    const agents = getAllAgents();
    for (const agent of agents) {
      assert.ok(agent.username, `Agent missing username`);
      assert.ok(agent.display_name, `Agent ${agent.username} missing display_name`);
      assert.ok(agent.description, `Agent ${agent.username} missing description`);
      assert.ok(agent.system_prompt, `Agent ${agent.username} missing system_prompt`);
      assert.ok(agent.category, `Agent ${agent.username} missing category`);
      assert.ok(Array.isArray(agent.rss_sources), `Agent ${agent.username} missing rss_sources`);
      assert.ok(agent.rss_sources.length > 0, `Agent ${agent.username} has no rss_sources`);
    }
  });

  it('all usernames should be unique', () => {
    const agents = getAllAgents();
    const usernames = agents.map(a => a.username);
    const unique = new Set(usernames);
    assert.strictEqual(usernames.length, unique.size, 'Duplicate usernames found');
  });

  it('all categories should be unique', () => {
    const agents = getAllAgents();
    const categories = agents.map(a => a.category);
    const unique = new Set(categories);
    assert.strictEqual(categories.length, unique.size, 'Duplicate categories found');
  });

  it('each agent rss_sources should have valid structure', () => {
    const agents = getAllAgents();
    for (const agent of agents) {
      for (const source of agent.rss_sources) {
        assert.ok(source.name, `Agent ${agent.username}: source missing name`);
        assert.ok(source.url, `Agent ${agent.username}: source ${source.name} missing url`);
        assert.ok(source.url.startsWith('http'), `Agent ${agent.username}: source ${source.name} has invalid url`);
        assert.ok(Array.isArray(source.keywords), `Agent ${agent.username}: source ${source.name} missing keywords`);
        assert.ok(source.keywords.length > 0, `Agent ${agent.username}: source ${source.name} has empty keywords`);
      }
    }
  });

  it('getRssSources returns correct sources for each category', () => {
    const agents = getAllAgents();
    for (const agent of agents) {
      const sources = getRssSources(agent.category);
      assert.ok(sources, `getRssSources returned null for ${agent.category}`);
      assert.strictEqual(sources.length, agent.rss_sources.length,
        `Source count mismatch for ${agent.category}`);
    }
  });
});

describe('Duplicate Detection', () => {
  const existing = [
    { title: 'OpenAI Launches New GPT-5 Model With Advanced Reasoning', source_url: 'https://example.com/gpt5' },
    { title: 'Google DeepMind Releases Gemini 2.0 for Enterprise', source_url: 'https://example.com/gemini' },
    { title: 'AI Agents Transform Customer Service Industry', source_url: 'https://example.com/agents' },
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
    assert.strictEqual(isDuplicate('Some New Article Title', []), false);
  });

  it('should handle short titles', () => {
    assert.strictEqual(isDuplicate('AI News', existing), false);
  });

  it('should detect duplicate by source_url', () => {
    assert.strictEqual(
      isDuplicate('Completely Different Title Here', existing, 'https://example.com/gpt5'),
      true
    );
  });

  it('should not flag different source_url', () => {
    assert.strictEqual(
      isDuplicate('Completely Different Title Here', existing, 'https://example.com/other'),
      false
    );
  });

  it('should work with null source_url', () => {
    assert.strictEqual(
      isDuplicate('Completely Different Title Here', existing, null),
      false
    );
  });
});

describe('Environment Config', () => {
  it('should have valid category options', () => {
    const validCategories = [
      'tech_trends', 'new_tools', 'sales', 'marketing', 'lead_generation',
      'operations', 'finance', 'revops', 'hr_recruiting', 'strategy',
      'it_security', 'ai_agents', 'workflows', 'automation', 'customer_support',
      'agent_builders', 'challenges', 'use_cases', 'growth', 'playbooks',
      'ai_humans', 'future_of_work', 'digital_labor', 'agent_economy',
      'funding', 'crypto_trading',
    ];
    const category = process.env.NEWS_CATEGORY || 'ai_agents';
    assert.ok(validCategories.includes(category), `Invalid category: ${category}`);
  });

  it('ARTICLES_PER_RUN should be a positive number', () => {
    const n = parseInt(process.env.ARTICLES_PER_RUN || '1', 10);
    assert.ok(n > 0 && n <= 10, `ARTICLES_PER_RUN should be 1-10, got ${n}`);
  });
});
