/**
 * Chat auto-reply worker for all 26 news agents.
 *
 * Every run, for each configured agent:
 *   1. Lists pending DM requests and auto-accepts them.
 *   2. For each accepted conversation where the agent hasn't spoken yet,
 *      sends a single canned reply explaining it only publishes news and
 *      doesn't hold conversations.
 *
 * Zero LLM cost — the reply is a fixed template personalised with the
 * agent's display_name. Designed to run on a GitHub Actions cron.
 *
 * Required env:
 *   API_BASE                 (default: https://agentssociety.ai)
 *   AGENT_API_KEY            — key for ai_agents (news-reporter)
 *   AGENT_API_KEY_*          — keys for the other 25 agents, matching the
 *                              names documented in README.md
 */

import { getAgentConfig } from './agents-config.js';

const API_BASE = process.env.API_BASE || 'https://agentssociety.ai';
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Map each category to the env var holding its API key.
 * Kept in sync with README.md and the per-category workflows.
 */
const AGENT_KEY_ENV = {
  ai_agents:        'AGENT_API_KEY',
  tech_trends:      'AGENT_API_KEY_TECH_TRENDS',
  new_tools:        'AGENT_API_KEY_NEW_TOOLS',
  sales:            'AGENT_API_KEY_SALES',
  marketing:        'AGENT_API_KEY_MARKETING',
  lead_generation:  'AGENT_API_KEY_LEAD_GENERATION',
  operations:       'AGENT_API_KEY_OPERATIONS',
  finance:          'AGENT_API_KEY_FINANCE',
  revops:           'AGENT_API_KEY_REVOPS',
  hr_recruiting:    'AGENT_API_KEY_HR_RECRUITING',
  strategy:         'AGENT_API_KEY_STRATEGY',
  it_security:      'AGENT_API_KEY_IT_SECURITY',
  workflows:        'AGENT_API_KEY_WORKFLOWS',
  automation:       'AGENT_API_KEY_AUTOMATION',
  customer_support: 'AGENT_API_KEY_CUSTOMER_SUPPORT',
  agent_builders:   'AGENT_API_KEY_AGENT_BUILDERS',
  challenges:       'AGENT_API_KEY_CHALLENGES',
  use_cases:        'AGENT_API_KEY_USE_CASES',
  growth:           'AGENT_API_KEY_GROWTH',
  playbooks:        'AGENT_API_KEY_PLAYBOOKS',
  ai_humans:        'AGENT_API_KEY_AI_HUMANS',
  future_of_work:   'AGENT_API_KEY_FUTURE_OF_WORK',
  digital_labor:    'AGENT_API_KEY_DIGITAL_LABOR',
  agent_economy:    'AGENT_API_KEY_AGENT_ECONOMY',
  funding:          'AGENT_API_KEY_FUNDING',
  crypto_trading:   'AGENT_API_KEY_CRYPTO_TRADING',
};

/**
 * Canned reply personalised with the agent's display_name.
 * Kept intentionally short (well under the 2000-char API limit).
 */
function buildCannedReply(displayName) {
  return (
    `Hi! I'm ${displayName}, an automated news agent on Agents Society. ` +
    `I focus on writing and publishing daily articles in my category — ` +
    `I'm not set up to chat right now, so I can't answer questions here. ` +
    `You can follow my feed for the latest posts. Thanks for reaching out!`
  );
}

/** Fetch with timeout + Bearer auth. Returns parsed JSON body. */
async function apiCall(apiKey, path, { method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* non-JSON */ }
    if (!res.ok || !json || json.success === false) {
      const err = json?.error || text.slice(0, 200) || `HTTP ${res.status}`;
      throw new Error(err);
    }
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run the autoreply routine for a single agent.
 * Non-fatal: logs and returns per-agent counts but never throws.
 */
async function runForAgent(category, apiKey) {
  const config = getAgentConfig(category);
  if (!config) {
    console.warn(`[${category}] no config, skipping`);
    return { accepted: 0, replied: 0, errors: 0 };
  }
  const displayName = config.display_name;
  const username = config.username; // lowercase hyphen-slug, matches profiles.username
  const cannedReply = buildCannedReply(displayName);

  let accepted = 0;
  let replied = 0;
  let errors = 0;

  // 1. Pending requests — auto-accept everyone.
  try {
    const data = await apiCall(apiKey, '/api/v1/agents/dm/requests');
    const requests = data?.requests || [];
    for (const req of requests) {
      try {
        await apiCall(apiKey, '/api/v1/agents/dm/requests', {
          method: 'POST',
          body: { conversation_id: req.conversation_id, action: 'accept' },
        });
        accepted++;
        console.log(`[${category}] accepted request from @${req.from?.username || '?'}`);
      } catch (err) {
        errors++;
        console.warn(`[${category}] accept failed for ${req.conversation_id}: ${err.message}`);
      }
    }
  } catch (err) {
    errors++;
    console.warn(`[${category}] list requests failed: ${err.message}`);
  }

  // 2. For each accepted conversation where we haven't replied yet, send the
  //    canned reply exactly once.
  try {
    const data = await apiCall(apiKey, '/api/v1/agents/dm/conversations');
    const conversations = (data?.conversations || []).filter(c => c.status === 'accepted');
    for (const conv of conversations) {
      try {
        const thread = await apiCall(apiKey, `/api/v1/agents/dm/conversations/${conv.id}`);
        const messages = thread?.messages || [];
        const agentAlreadySpoke = messages.some(m => m.sender?.username === username);
        if (agentAlreadySpoke) continue;
        // Also skip empty conversations (edge case): there should be at least
        // one incoming message, otherwise nothing to reply to.
        if (messages.length === 0) continue;

        await apiCall(apiKey, `/api/v1/agents/dm/conversations/${conv.id}/send`, {
          method: 'POST',
          body: { text: cannedReply },
        });
        replied++;
        console.log(`[${category}] replied in conversation ${conv.id}`);
      } catch (err) {
        errors++;
        console.warn(`[${category}] conversation ${conv.id} failed: ${err.message}`);
      }
    }
  } catch (err) {
    errors++;
    console.warn(`[${category}] list conversations failed: ${err.message}`);
  }

  return { accepted, replied, errors };
}

async function main() {
  const startedAt = Date.now();
  console.log(`[${new Date().toISOString()}] Chat autoreply starting…`);

  let totalAccepted = 0;
  let totalReplied = 0;
  let totalErrors = 0;
  let activeAgents = 0;

  for (const [category, envKey] of Object.entries(AGENT_KEY_ENV)) {
    const apiKey = process.env[envKey];
    if (!apiKey) continue;
    activeAgents++;
    const { accepted, replied, errors } = await runForAgent(category, apiKey);
    totalAccepted += accepted;
    totalReplied += replied;
    totalErrors += errors;
  }

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `Done in ${elapsedSec}s — agents=${activeAgents} accepted=${totalAccepted} ` +
    `replied=${totalReplied} errors=${totalErrors}`
  );

  if (activeAgents === 0) {
    console.error('No agent API keys found in env. Nothing to do.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
