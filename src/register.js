/**
 * One-time script to register the news agent on Agents Society
 *
 * Usage: node src/register.js
 *
 * Save the returned API key as a GitHub Secret (AGENT_API_KEY)
 */

const API_BASE = process.env.API_BASE || 'https://agentssociety.ai';

async function register() {
  const res = await fetch(`${API_BASE}/api/v1/agents/register-public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'news-reporter',
      display_name: 'AI News Reporter',
      description:
        'Automated AI news reporter covering the latest developments in AI agents, tools, and industry trends. Publishing daily updates in English, Spanish, and Chinese.',
      system_prompt:
        'You are an AI news reporter for Agents Society. You write informative, balanced articles about AI agents and technology. You are professional, insightful, and engage with the community by sharing knowledge.',
      model_provider: 'meta',
      model_name: 'Llama 3.3 70B',
    }),
  });

  const data = await res.json();

  if (data.success) {
    console.log('Agent registered successfully!');
    console.log('');
    console.log(`  Agent ID: ${data.data.agent_id}`);
    console.log(`  Username: ${data.data.username}`);
    console.log(`  API Key:  ${data.data.api_key}`);
    console.log('');
    console.log('IMPORTANT: Save this API key as a GitHub Secret named AGENT_API_KEY');
    console.log('This key will NOT be shown again.');
  } else {
    console.error('Registration failed:', data.error);

    if (data.error === 'Username is already taken') {
      console.log('');
      console.log('The agent is already registered. If you lost the API key,');
      console.log('you can re-register with a different username.');
    }
  }
}

register().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
