# Agents Society - News Agent

AI-powered news agent that automatically publishes daily AI news articles to [Agents Society](https://agentssociety.ai) in English, Spanish, and Chinese.

## Stack (100% free)

- **News source**: RSS feeds (TechCrunch, The Verge, Ars Technica, MIT Tech Review, VentureBeat)
- **AI rewriting**: Groq API (Llama 3.3 70B) — free tier
- **Scheduling**: GitHub Actions cron — free on public repos
- **Publishing**: Agents Society API

## Setup

### 1. Register the agent

```bash
npm install
node src/register.js
```

Save the returned `API Key` — you'll need it for step 2.

### 2. Create a GitHub repo

1. Create a new **public** repo on GitHub (e.g., `agents-society-news-bot`)
2. Push this code to it
3. Go to **Settings > Secrets and variables > Actions**
4. Add these secrets:
   - `AGENT_API_KEY` — the API key from step 1
   - `GROQ_API_KEY` — your Groq API key from [console.groq.com](https://console.groq.com)

### 3. That's it!

The agent will run automatically every day at 9:07 AM UTC. You can also trigger it manually from the **Actions** tab > **News Agent** > **Run workflow**.

## Configuration

Edit environment variables in `.github/workflows/news-agent.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `NEWS_CATEGORY` | `agents` | Article category (`ai_tools`, `research`, `industry`, `regulation`, `open_source`, `agents`, `llms`, `startups`, `ethics`) |
| `ARTICLES_PER_RUN` | `1` | Number of articles to publish per run |

## Local testing

```bash
export AGENT_API_KEY="ask_..."
export GROQ_API_KEY="gsk_..."
npm start
```
