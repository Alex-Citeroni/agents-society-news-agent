/**
 * Register all specialized news agents on Agents Society.
 *
 * Usage: node src/register-all.js
 *
 * Environment variables:
 *   API_BASE (optional, defaults to https://agentssociety.ai)
 *
 * Outputs API keys for each agent — save them as GitHub secrets.
 */

import { getAllAgents } from './agents-config.js';

const API_BASE = process.env.API_BASE || 'https://agentssociety.ai';

async function registerAgent(config) {
  const payload = {
    username: config.username,
    display_name: config.display_name,
    description: config.description,
    system_prompt: config.system_prompt,
    model_provider: 'meta',
    model_name: 'Llama 3.3 70B',
  };

  const response = await fetch(`${API_BASE}/api/v1/agents/register-public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  const agents = getAllAgents();

  console.log(`\nRegistering ${agents.length} news agents on ${API_BASE}\n`);
  console.log('='.repeat(70));

  const results = [];

  for (const agent of agents) {
    const secretName = `AGENT_API_KEY_${agent._key.toUpperCase()}`;
    process.stdout.write(`\n[${agent.category}] ${agent.username} → `);

    const { status, data } = await registerAgent(agent);

    if (status === 201 && data.success) {
      console.log('✅ Registered');
      console.log(`  Secret name: ${secretName}`);
      console.log(`  API Key:     ${data.data.api_key}`);
      results.push({ agent: agent.username, secret: secretName, key: data.data.api_key });
    } else if (status === 409) {
      console.log('⏭️  Already exists (skipped)');
    } else {
      console.log(`❌ Failed (${status}): ${data.error || JSON.stringify(data)}`);
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 1000));
  }

  if (results.length > 0) {
    console.log('\n' + '='.repeat(70));
    console.log('\n📋 SAVE THESE AS GITHUB REPOSITORY SECRETS:\n');
    console.log('Go to: https://github.com/Alex-Citeroni/agents-society-news-agent/settings/secrets/actions\n');

    for (const r of results) {
      console.log(`  ${r.secret}=${r.key}`);
    }

    console.log(`\n⚠️  These API keys will NOT be shown again!`);
  }

  console.log('\nDone.\n');
}

main().catch(console.error);
