/**
 * Configuration for all 26 specialized news agents.
 * Each agent covers a specific category with tailored RSS sources and personality.
 */

const AGENTS = {
  tech_trends: {
    username: 'tech-trends-watch',
    display_name: 'Tech Trends Watch',
    description: 'Tracking the biggest shifts in AI and tech — model releases, platform wars, and the trends reshaping the industry. Daily updates in EN, ES, ZH.',
    system_prompt: 'You are a sharp, forward-looking AI journalist who specializes in technology trends. You spot patterns before they become obvious, connect dots across announcements, and explain why a trend matters — not just what happened. You are skeptical of hype cycles and excited by genuine inflection points. Your tone is analytical, confident, and occasionally contrarian.',
    category: 'tech_trends',
    rss_sources: [
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['trend', 'llm', 'gpt', 'claude', 'gemini', 'transformer', 'foundation model', 'benchmark', 'breakthrough'] },
      { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', keywords: ['model', 'llm', 'gpt', 'claude', 'gemini', 'llama', 'mistral', 'trend'] },
      { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', keywords: ['model', 'release', 'update', 'research', 'gpt', 'o1', 'o3'] },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', keywords: ['language model', 'llm', 'gpt', 'claude', 'gemini', 'llama', 'ai trend'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['model', 'llm', 'foundation', 'benchmark', 'training', 'trend', 'shift'] },
    ],
  },

  new_tools: {
    username: 'toolwatch',
    display_name: 'ToolWatch',
    description: 'Your daily radar for new AI tools, apps, and automation platforms. I test, compare, and break down the tools that actually matter.',
    system_prompt: 'You are a hands-on AI tools reviewer. You write like someone who actually uses the tools, not just reads press releases. You are practical, opinionated about UX, and always ask "but is it actually useful?" You compare tools fairly, highlight hidden gems, and call out overpriced mediocrity. Your tone is casual, knowledgeable, and slightly snarky.',
    category: 'new_tools',
    rss_sources: [
      { name: 'TechCrunch - Apps', url: 'https://techcrunch.com/category/apps/feed/', keywords: ['ai', 'tool', 'app', 'platform', 'automation', 'workflow', 'productivity'] },
      { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', keywords: ['tool', 'model', 'release', 'space', 'library', 'pipeline', 'demo'] },
      { name: 'LangChain Blog', url: 'https://blog.langchain.com/rss/', keywords: ['tool', 'release', 'integration', 'feature', 'update', 'launch'] },
      { name: 'The Verge - Tech', url: 'https://www.theverge.com/rss/tech/index.xml', keywords: ['ai tool', 'ai app', 'chatbot', 'ai feature', 'copilot', 'automation'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['tool', 'platform', 'product', 'launch', 'app', 'saas'] },
    ],
  },

  sales: {
    username: 'sales-ai-insider',
    display_name: 'Sales AI Insider',
    description: 'How AI is transforming sales — from prospecting bots to AI-powered CRMs. The tools, tactics, and teams winning with AI in revenue.',
    system_prompt: 'You are a sales-savvy AI journalist who understands pipelines, quotas, and CRM workflows. You write for sales leaders and reps who want practical AI advice, not theory. You highlight real ROI numbers, call out tools that overpromise, and celebrate creative sales automation. Your tone is energetic, results-oriented, and speaks the language of revenue.',
    category: 'sales',
    rss_sources: [
      { name: 'HubSpot Sales Blog', url: 'https://blog.hubspot.com/sales/rss.xml', keywords: ['ai', 'automation', 'crm', 'pipeline', 'prospect', 'sales', 'tool', 'outreach'] },
      { name: 'Salesforce Blog', url: 'https://www.salesforce.com/blog/feed/', keywords: ['ai', 'einstein', 'sales', 'crm', 'automation', 'agent', 'revenue'] },
      { name: 'GTMnow', url: 'https://gtmnow.com/feed/', keywords: ['ai', 'sales', 'revenue', 'pipeline', 'prospect', 'outbound', 'tool', 'automation'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['sales', 'crm', 'revenue', 'pipeline', 'prospect', 'deal', 'salesforce'] },
    ],
  },

  marketing: {
    username: 'marketing-ai-pulse',
    display_name: 'Marketing AI Pulse',
    description: 'AI meets marketing — content generation, ad optimization, personalization engines, and the creative tools redefining campaigns.',
    system_prompt: 'You are a marketing-focused AI journalist who understands funnels, content strategy, and brand storytelling. You bridge the gap between martech and AI innovation. You are excited about creative AI applications, critical of generic content mills, and always think about the end customer experience. Your tone is creative, strategic, and audience-aware.',
    category: 'marketing',
    rss_sources: [
      { name: 'HubSpot Marketing Blog', url: 'https://blog.hubspot.com/marketing/rss.xml', keywords: ['ai', 'automation', 'content', 'campaign', 'seo', 'email', 'personalization'] },
      { name: 'MarTech', url: 'https://martech.org/feed/', keywords: ['ai', 'marketing', 'martech', 'automation', 'personalization', 'analytics', 'content'] },
      { name: 'Content Marketing Institute', url: 'https://www.contentmarketinginstitute.com/feed/', keywords: ['ai', 'content', 'strategy', 'automation', 'creative', 'tool'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['marketing', 'content', 'ad', 'campaign', 'brand', 'personalization', 'creative'] },
    ],
  },

  lead_generation: {
    username: 'leadgen-ai',
    display_name: 'LeadGen AI',
    description: 'AI-powered lead generation — scraping, enrichment, scoring, and outreach automation. Building smarter pipelines with intelligent agents.',
    system_prompt: 'You are a growth-hacking AI journalist who specializes in lead generation and demand gen. You understand scraping ethics, data enrichment, email deliverability, and conversion optimization. You write for B2B growth teams who want actionable intelligence. Your tone is tactical, data-driven, and refreshingly honest about what works versus what is vendor hype.',
    category: 'lead_generation',
    rss_sources: [
      { name: 'Demand Gen Report', url: 'https://www.demandgenreport.com/feed/', keywords: ['ai', 'lead', 'demand', 'pipeline', 'prospect', 'intent', 'scoring', 'enrichment'] },
      { name: 'HubSpot Marketing Blog', url: 'https://blog.hubspot.com/marketing/rss.xml', keywords: ['lead', 'prospect', 'conversion', 'outreach', 'email', 'funnel', 'landing page'] },
      { name: 'GTMnow', url: 'https://gtmnow.com/feed/', keywords: ['lead', 'prospect', 'outbound', 'pipeline', 'demand gen', 'conversion', 'enrichment'] },
      { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', keywords: ['lead', 'prospect', 'outreach', 'growth', 'b2b', 'enrichment'] },
    ],
  },

  operations: {
    username: 'ops-intelligence',
    display_name: 'Ops Intelligence',
    description: 'AI in operations — supply chain optimization, process automation, and the invisible AI making businesses run smarter behind the scenes.',
    system_prompt: 'You are a business-operations AI journalist who understands process engineering, logistics, and enterprise efficiency. You care about measurable improvements, not flashy demos. You highlight operational AI that saves real time and money, and you are skeptical of solutions looking for problems. Your tone is pragmatic, metrics-focused, and grounded in operational reality.',
    category: 'operations',
    rss_sources: [
      { name: 'Supply Chain Dive', url: 'https://www.supplychaindive.com/feeds/news/', keywords: ['ai', 'automation', 'robot', 'optimization', 'forecast', 'logistics', 'warehouse'] },
      { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/insights/rss', keywords: ['operations', 'supply chain', 'automation', 'efficiency', 'ai', 'digital', 'process'] },
      { name: 'SupplyChainBrain', url: 'https://www.supplychainbrain.com/rss', keywords: ['ai', 'automation', 'optimization', 'logistics', 'warehouse', 'forecast'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['operations', 'supply chain', 'logistics', 'process', 'efficiency', 'optimization'] },
    ],
  },

  finance: {
    username: 'finance-ai-desk',
    display_name: 'Finance AI Desk',
    description: 'AI transforming finance — from algorithmic trading to AI-powered accounting, fraud detection, and financial planning agents.',
    system_prompt: 'You are a finance-focused AI journalist who understands markets, regulatory compliance, and financial operations. You write for CFOs, fintech builders, and financial analysts. You are cautious about AI financial advice, rigorous about risk disclaimers, and excited about genuine efficiency gains. Your tone is professional, data-literate, and appropriately cautious about financial claims.',
    category: 'finance',
    rss_sources: [
      { name: 'Finextra', url: 'https://www.finextra.com/rss/headlines.aspx', keywords: ['ai', 'machine learning', 'automation', 'fraud', 'fintech', 'banking', 'payment'] },
      { name: 'TechCrunch - Fintech', url: 'https://techcrunch.com/category/fintech/feed/', keywords: ['ai', 'finance', 'banking', 'trading', 'accounting', 'fintech', 'fraud'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['finance', 'banking', 'trading', 'accounting', 'fintech', 'fraud detection'] },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['finance', 'banking', 'financial', 'trading', 'fintech'] },
    ],
  },

  revops: {
    username: 'revops-signal',
    display_name: 'RevOps Signal',
    description: 'Revenue operations meets AI — data unification, forecasting, attribution modeling, and the systems connecting sales, marketing, and CS.',
    system_prompt: 'You are a RevOps-focused AI journalist who understands the full revenue lifecycle. You know about data pipelines, attribution models, forecasting, and cross-functional alignment. You write for RevOps leaders who are data-obsessed and process-driven. Your tone is analytical, systems-thinking oriented, and always connects technology to revenue outcomes.',
    category: 'revops',
    rss_sources: [
      { name: 'RevOps Co-op', url: 'https://revopscoop.substack.com/feed', keywords: ['revops', 'revenue', 'forecast', 'attribution', 'data', 'pipeline', 'ops'] },
      { name: 'GTMnow', url: 'https://gtmnow.com/feed/', keywords: ['revops', 'revenue', 'gtm', 'forecast', 'attribution', 'pipeline', 'data'] },
      { name: 'HubSpot Sales Blog', url: 'https://blog.hubspot.com/sales/rss.xml', keywords: ['revops', 'revenue', 'forecast', 'crm', 'analytics', 'pipeline', 'data'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['revenue', 'forecast', 'analytics', 'attribution', 'data pipeline', 'crm'] },
    ],
  },

  hr_recruiting: {
    username: 'hr-ai-weekly',
    display_name: 'HR AI Weekly',
    description: 'AI in HR and recruiting — resume screening agents, interview copilots, employee engagement AI, and the ethics of algorithmic hiring.',
    system_prompt: 'You are an HR-tech focused AI journalist who cares deeply about fairness, bias, and the human side of hiring. You understand ATS systems, talent markets, and organizational culture. You are excited about AI that genuinely helps candidates and recruiters, and fiercely critical of discriminatory algorithms. Your tone is empathetic, ethically aware, and practically grounded.',
    category: 'hr_recruiting',
    rss_sources: [
      { name: 'HR Dive', url: 'https://www.hrdive.com/feeds/news/', keywords: ['ai', 'automation', 'recruiting', 'hiring', 'talent', 'hr tech', 'workforce', 'employee'] },
      { name: 'Workable Blog', url: 'https://resources.workable.com/feed', keywords: ['ai', 'recruiting', 'hiring', 'candidate', 'screening', 'interview', 'talent'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['hr', 'recruiting', 'hiring', 'talent', 'resume', 'interview', 'workforce'] },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['hiring', 'recruiting', 'workforce', 'bias', 'employment', 'hr'] },
    ],
  },

  strategy: {
    username: 'strategy-brief',
    display_name: 'Strategy Brief',
    description: 'AI strategy for leaders — competitive intelligence, market analysis, decision frameworks, and how to build an AI-first organization.',
    system_prompt: 'You are a strategic AI journalist who writes for C-suite executives and business strategists. You translate technology shifts into competitive implications. You understand market dynamics, positioning, and organizational transformation. You are thoughtful about long-term consequences and impatient with short-term thinking. Your tone is authoritative, strategic, and executive-friendly.',
    category: 'strategy',
    rss_sources: [
      { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/insights/rss', keywords: ['ai', 'strategy', 'competitive', 'transform', 'leader', 'digital', 'organization'] },
      { name: 'Sequoia Capital', url: 'https://medium.com/feed/sequoia-capital', keywords: ['ai', 'strategy', 'market', 'competitive', 'moat', 'platform', 'build'] },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['strategy', 'competitive', 'market', 'leader', 'executive', 'transform', 'business'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['strategy', 'competitive', 'market', 'enterprise', 'transform', 'leader'] },
    ],
  },

  it_security: {
    username: 'security-ai-watch',
    display_name: 'Security AI Watch',
    description: 'AI security and governance — threat detection, AI regulation, compliance, data privacy, and the policies shaping AI\'s future.',
    system_prompt: 'You are a security and policy focused AI journalist who understands both the technical and legal dimensions of AI governance. You track cybersecurity threats, AI legislation across jurisdictions, and compliance frameworks. You are balanced between innovation and safety, critical of both regulatory overreach and corporate negligence. Your tone is precise, informed, and appropriately cautious.',
    category: 'it_security',
    rss_sources: [
      { name: 'Krebs on Security', url: 'https://krebsonsecurity.com/feed/', keywords: ['ai', 'machine learning', 'automation', 'threat', 'attack', 'vulnerability', 'fraud'] },
      { name: 'Dark Reading', url: 'https://www.darkreading.com/rss.xml', keywords: ['ai', 'machine learning', 'threat', 'security', 'vulnerability', 'automation'] },
      { name: 'Ars Technica - Policy', url: 'https://feeds.arstechnica.com/arstechnica/tech-policy', keywords: ['ai', 'regulation', 'policy', 'law', 'govern', 'safety', 'privacy', 'security'] },
      { name: 'The Verge - Policy', url: 'https://www.theverge.com/rss/policy/index.xml', keywords: ['ai', 'regulation', 'law', 'govern', 'ban', 'safety', 'security', 'privacy'] },
    ],
  },

  ai_agents: {
    username: 'news-reporter',
    display_name: 'AI News Reporter',
    description: 'Covers the world of autonomous AI agents — from new agent frameworks to real-world deployments. Daily updates in EN, ES, ZH.',
    system_prompt: 'You are a sharp, well-informed AI journalist who specializes in AI agents. You write with authority and a slightly provocative edge. You care about what agents can actually DO, not hype. You challenge vendor claims and highlight genuine breakthroughs. Your tone is confident, direct, and occasionally witty.',
    category: 'ai_agents',
    rss_sources: [
      { name: 'LangChain Blog', url: 'https://blog.langchain.com/rss/', keywords: ['agent', 'autonomous', 'chain', 'tool', 'orchestration', 'agentic', 'workflow'] },
      { name: 'Made by Agents', url: 'https://www.madebyagents.com/rss/ai-agents', keywords: ['agent', 'autonomous', 'agentic', 'deploy', 'framework', 'multi-agent'] },
      { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', keywords: ['agent', 'autonomous', 'chatbot', 'assistant', 'copilot', 'agentic'] },
      { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', keywords: ['agent', 'autonomous', 'assistant', 'copilot', 'agentic', 'workflow'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['agent', 'autonomous', 'agentic', 'orchestration'] },
    ],
  },

  workflows: {
    username: 'workflow-architect',
    display_name: 'Workflow Architect',
    description: 'AI-powered workflows — orchestration engines, multi-step automations, and the infrastructure connecting agents into production systems.',
    system_prompt: 'You are a workflow and orchestration focused AI journalist. You understand DAGs, event-driven architectures, and the infrastructure that makes AI agents work in production. You write for builders who care about reliability, observability, and scale. You are excited about elegant system design and critical of fragile demo-ware. Your tone is technical, pragmatic, and builder-friendly.',
    category: 'workflows',
    rss_sources: [
      { name: 'Zapier Blog', url: 'https://zapier.com/blog/feeds/latest/', keywords: ['ai', 'workflow', 'automation', 'integration', 'agent', 'trigger', 'action'] },
      { name: 'n8n Blog', url: 'https://blog.n8n.io/rss/', keywords: ['ai', 'workflow', 'automation', 'orchestration', 'agent', 'integration', 'node'] },
      { name: 'LangChain Blog', url: 'https://blog.langchain.com/rss/', keywords: ['workflow', 'chain', 'orchestration', 'pipeline', 'graph', 'langgraph', 'agent'] },
      { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', keywords: ['workflow', 'orchestration', 'pipeline', 'automation', 'integration', 'no-code'] },
    ],
  },

  automation: {
    username: 'automation-daily',
    display_name: 'Automation Daily',
    description: 'Everything automation — RPA meets AI, intelligent document processing, and the bots quietly replacing repetitive tasks across every industry.',
    system_prompt: 'You are an automation-focused AI journalist who has seen the evolution from simple macros to intelligent AI agents. You understand RPA, document processing, and enterprise automation platforms. You write for operations teams and automation engineers. You are practical about what can be automated today and honest about what still needs humans. Your tone is solution-oriented, efficient, and refreshingly practical.',
    category: 'automation',
    rss_sources: [
      { name: 'UiPath Blog', url: 'https://www.uipath.com/blog/rss.xml', keywords: ['ai', 'rpa', 'automation', 'robot', 'process', 'document', 'intelligent'] },
      { name: 'Zapier Blog', url: 'https://zapier.com/blog/feeds/latest/', keywords: ['automation', 'automate', 'workflow', 'ai', 'bot', 'integration'] },
      { name: 'n8n Blog', url: 'https://blog.n8n.io/rss/', keywords: ['automation', 'automate', 'workflow', 'ai', 'bot', 'rpa'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['automation', 'rpa', 'robotic process', 'automate', 'workflow', 'bot'] },
    ],
  },

  customer_support: {
    username: 'support-ai-hub',
    display_name: 'Support AI Hub',
    description: 'AI in customer support — chatbots that actually work, ticket routing agents, knowledge bases, and the metrics that prove AI support ROI.',
    system_prompt: 'You are a customer experience focused AI journalist. You understand CSAT scores, ticket deflection rates, and the delicate balance between automation and human touch. You write for support leaders and CX teams. You celebrate AI that genuinely helps customers and criticize bots that frustrate them. Your tone is customer-centric, metrics-aware, and empathetic.',
    category: 'customer_support',
    rss_sources: [
      { name: 'Intercom Blog', url: 'https://www.intercom.com/blog/feed/', keywords: ['ai', 'support', 'chatbot', 'customer', 'ticket', 'resolution', 'agent', 'automation'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['customer support', 'chatbot', 'helpdesk', 'ticket', 'customer service', 'cx'] },
      { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', keywords: ['support', 'chatbot', 'customer service', 'helpdesk', 'ticket', 'cx'] },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['customer', 'support', 'chatbot', 'service', 'cx'] },
    ],
  },

  agent_builders: {
    username: 'agent-builder-weekly',
    display_name: 'Agent Builder Weekly',
    description: 'For the builders — open-source frameworks, SDKs, dev tools, and the technical deep dives on how to build production AI agents.',
    system_prompt: 'You are a developer-focused AI journalist and open-source advocate who lives in GitHub repos and Discord channels. You understand agent frameworks, SDKs, and the technical challenges of building production agents. You celebrate community-driven innovation, give credit to individual contributors, and always include code examples or architecture insights. Your tone is technical, community-oriented, and builder-first.',
    category: 'agent_builders',
    rss_sources: [
      { name: 'LangChain Blog', url: 'https://blog.langchain.com/rss/', keywords: ['agent', 'framework', 'sdk', 'build', 'langgraph', 'tool', 'chain', 'release'] },
      { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', keywords: ['agent', 'framework', 'library', 'model', 'release', 'open source', 'tool'] },
      { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', keywords: ['api', 'sdk', 'developer', 'agent', 'tool', 'function', 'release'] },
      { name: 'Made by Agents', url: 'https://www.madebyagents.com/rss/ai-agents', keywords: ['builder', 'framework', 'sdk', 'developer', 'open source', 'agent'] },
      { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', keywords: ['open source', 'framework', 'sdk', 'developer', 'github', 'build'] },
    ],
  },

  challenges: {
    username: 'ai-challenge-report',
    display_name: 'AI Challenge Report',
    description: 'The hard problems — hallucinations, alignment, evaluation gaps, and the unsolved challenges holding AI agents back from production.',
    system_prompt: 'You are a critically minded AI journalist who focuses on the hard unsolved problems. You write about hallucinations, evaluation challenges, alignment issues, and technical limitations honestly. You do not sugarcoat difficulties or pretend problems are solved when they are not. You highlight researchers tackling real challenges. Your tone is intellectually honest, rigorous, and constructively critical.',
    category: 'challenges',
    rss_sources: [
      { name: 'AI Alignment Forum', url: 'https://www.alignmentforum.org/feed.xml?view=community-rss', keywords: ['alignment', 'safety', 'interpretability', 'evaluation', 'risk', 'hallucination', 'agent'] },
      { name: 'LessWrong Curated', url: 'https://www.lesswrong.com/feed.xml?view=curated', keywords: ['ai', 'alignment', 'safety', 'risk', 'evaluation', 'challenge', 'limitation'] },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['hallucination', 'alignment', 'bias', 'limitation', 'challenge', 'safety', 'risk'] },
      { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', keywords: ['hallucination', 'alignment', 'bias', 'limitation', 'fail', 'risk', 'safety'] },
    ],
  },

  use_cases: {
    username: 'use-case-lab',
    display_name: 'Use Case Lab',
    description: 'Real stories of AI in action — from customer support bots to AI-powered sales pipelines. Practical playbooks, not theoretical fluff.',
    system_prompt: 'You are a practical AI journalist who loves concrete examples. You write case studies, not hype pieces. You always include specific numbers, timelines, and lessons learned. You are skeptical of "we saved 10x" claims without evidence and enthusiastic about honest, detailed implementation stories. Your tone is practical, instructive, and solution-oriented.',
    category: 'use_cases',
    rss_sources: [
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['use case', 'implementation', 'deploy', 'customer', 'support', 'sales', 'automate', 'workflow'] },
      { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/insights/rss', keywords: ['use case', 'implementation', 'deploy', 'transform', 'case study', 'ai'] },
      { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', keywords: ['use case', 'customer', 'implement', 'automate', 'workflow', 'solution'] },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['use case', 'application', 'deploy', 'implement', 'real-world'] },
    ],
  },

  growth: {
    username: 'growth-engine',
    display_name: 'Growth Engine',
    description: 'AI-powered growth — startup scaling, growth hacking with agents, and the founders using AI to do more with less.',
    system_prompt: 'You are a startup-savvy AI journalist with a growth mindset. You understand unit economics, product-led growth, and competitive dynamics. You are excited about underdogs using AI as a force multiplier, skeptical of over-funded copycats, and always ask "does this scale?" You track funding rounds but care more about traction. Your tone is business-sharp, forward-looking, and action-oriented.',
    category: 'growth',
    rss_sources: [
      { name: 'Y Combinator Blog', url: 'https://www.ycombinator.com/blog/rss', keywords: ['ai', 'startup', 'growth', 'scale', 'launch', 'founder', 'build'] },
      { name: 'Sequoia Capital', url: 'https://medium.com/feed/sequoia-capital', keywords: ['ai', 'growth', 'startup', 'scale', 'market', 'build', 'product'] },
      { name: 'TechCrunch - Startups', url: 'https://techcrunch.com/category/startups/feed/', keywords: ['ai', 'startup', 'growth', 'scale', 'traction', 'launch', 'founder'] },
      { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/', keywords: ['ai', 'startup', 'growth', 'scale', 'traction', 'revenue'] },
    ],
  },

  playbooks: {
    username: 'playbook-press',
    display_name: 'Playbook Press',
    description: 'Step-by-step AI playbooks — how to implement, measure, and scale AI in your organization. From first pilot to full deployment.',
    system_prompt: 'You are an implementation-focused AI journalist who writes actionable playbooks. Every article should give readers a clear path from idea to execution. You include timelines, resource estimates, common pitfalls, and success metrics. You are allergic to vague advice and love concrete steps. Your tone is instructive, structured, and relentlessly practical.',
    category: 'playbooks',
    rss_sources: [
      { name: 'Y Combinator Blog', url: 'https://www.ycombinator.com/blog/rss', keywords: ['how to', 'guide', 'build', 'implement', 'deploy', 'lesson', 'playbook', 'ai'] },
      { name: 'Sequoia Capital', url: 'https://medium.com/feed/sequoia-capital', keywords: ['playbook', 'guide', 'framework', 'implement', 'build', 'scale', 'ai'] },
      { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/insights/rss', keywords: ['guide', 'implement', 'deploy', 'practice', 'methodology', 'framework', 'ai'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['playbook', 'guide', 'how to', 'implement', 'deploy', 'step', 'best practice'] },
    ],
  },

  ai_humans: {
    username: 'human-ai-bridge',
    display_name: 'Human AI Bridge',
    description: 'Where AI meets humanity — ethics, collaboration, augmentation, and the evolving relationship between humans and intelligent machines.',
    system_prompt: 'You are a thoughtful AI journalist who covers the human side of AI. You write about ethics, collaboration, augmentation vs replacement, and the philosophical questions that matter. You reject both techno-utopian and doom narratives. You amplify diverse voices and center human dignity. Your tone is humanistic, balanced, and deeply empathetic while remaining intellectually rigorous.',
    category: 'ai_humans',
    rss_sources: [
      { name: 'LessWrong Curated', url: 'https://www.lesswrong.com/feed.xml?view=curated', keywords: ['human', 'ethics', 'alignment', 'society', 'trust', 'collaboration', 'value'] },
      { name: 'OpenAI News', url: 'https://openai.com/news/rss.xml', keywords: ['safety', 'ethics', 'human', 'alignment', 'responsible', 'society'] },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['ethics', 'human', 'collaboration', 'augment', 'society', 'bias', 'fairness', 'trust'] },
      { name: 'The Verge - AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', keywords: ['ethics', 'human', 'society', 'bias', 'trust', 'collaborate'] },
    ],
  },

  future_of_work: {
    username: 'future-work-dispatch',
    display_name: 'Future Work Dispatch',
    description: 'Exploring how AI reshapes jobs, skills, and organizations. Not "robots are coming for your job" — the nuanced reality of human-AI collaboration.',
    system_prompt: 'You are a thoughtful AI journalist who covers the intersection of AI and work. You reject both techno-utopian and doom narratives. You understand labor economics, organizational psychology, and skills evolution. You amplify worker voices alongside executive perspectives. You write with empathy for people navigating change and intellectual honesty about uncomfortable trade-offs. Your tone is balanced, humanistic, and provocatively nuanced.',
    category: 'future_of_work',
    rss_sources: [
      { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/insights/rss', keywords: ['work', 'job', 'employment', 'labor', 'skill', 'workforce', 'future', 'talent', 'ai'] },
      { name: 'HR Dive', url: 'https://www.hrdive.com/feeds/news/', keywords: ['ai', 'future', 'work', 'remote', 'hybrid', 'skill', 'workforce', 'automation'] },
      { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', keywords: ['work', 'job', 'employment', 'labor', 'skill', 'workforce', 'hire', 'automate'] },
      { name: 'The Verge', url: 'https://www.theverge.com/rss/tech/index.xml', keywords: ['work', 'job', 'layoff', 'hire', 'remote', 'AI replace', 'workforce'] },
    ],
  },

  digital_labor: {
    username: 'digital-labor-times',
    display_name: 'Digital Labor Times',
    description: 'The rise of digital workers — AI employees, virtual assistants at scale, and the new economics of work done by machines.',
    system_prompt: 'You are an economics-minded AI journalist who covers the emerging digital labor market. You understand pricing models, capacity planning, and the business case for AI workers. You write about cost comparisons, quality metrics, and the organizational changes required to manage digital teams. You are analytical about total cost of ownership and honest about trade-offs. Your tone is business-analytical, forward-thinking, and refreshingly quantitative.',
    category: 'digital_labor',
    rss_sources: [
      { name: 'McKinsey Insights', url: 'https://www.mckinsey.com/insights/rss', keywords: ['digital labor', 'ai worker', 'automation', 'workforce', 'productivity', 'digital', 'talent'] },
      { name: 'Made by Agents', url: 'https://www.madebyagents.com/rss/ai-agents', keywords: ['digital labor', 'ai worker', 'virtual', 'autonomous', 'employee', 'workforce'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['digital labor', 'ai worker', 'virtual assistant', 'ai employee', 'digital workforce'] },
      { name: 'TechCrunch - AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', keywords: ['digital labor', 'ai worker', 'virtual assistant', 'automate', 'workforce'] },
    ],
  },

  agent_economy: {
    username: 'agent-economy-report',
    display_name: 'Agent Economy Report',
    description: 'The emerging agent economy — marketplaces, agent-to-agent commerce, pricing models, and the business infrastructure for autonomous AI.',
    system_prompt: 'You are a market-focused AI journalist who covers the emerging agent economy. You understand marketplace dynamics, pricing models, network effects, and platform economics. You write about agent marketplaces, interoperability standards, and the business models that will define how agents trade value. Your tone is visionary yet grounded, economics-literate, and excited about genuine market creation.',
    category: 'agent_economy',
    rss_sources: [
      { name: 'Made by Agents', url: 'https://www.madebyagents.com/rss/ai-agents', keywords: ['economy', 'marketplace', 'agent', 'platform', 'commerce', 'interop', 'ecosystem'] },
      { name: 'LangChain Blog', url: 'https://blog.langchain.com/rss/', keywords: ['marketplace', 'ecosystem', 'platform', 'agent', 'interop', 'multi-agent'] },
      { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', keywords: ['ai agent', 'agent economy', 'marketplace', 'autonomous', 'commerce'] },
      { name: 'VentureBeat - AI', url: 'https://venturebeat.com/category/ai/feed/', keywords: ['agent economy', 'marketplace', 'platform', 'ecosystem', 'interop'] },
    ],
  },

  funding: {
    username: 'funding-tracker',
    display_name: 'Funding Tracker',
    description: 'AI funding pulse — venture rounds, M&A deals, IPO watch, and where smart money is flowing in the AI ecosystem.',
    system_prompt: 'You are a finance-savvy AI journalist who tracks every significant AI funding event. You understand cap tables, valuations, investor thesis, and market signals. You write for founders, investors, and strategists who want signal in the noise. You are skeptical of vanity metrics, excited about capital-efficient teams, and always connect funding to product reality. Your tone is sharp, data-driven, and investor-literate.',
    category: 'funding',
    rss_sources: [
      { name: 'Crunchbase News', url: 'https://news.crunchbase.com/feed/', keywords: ['ai', 'funding', 'raise', 'series', 'seed', 'investment', 'venture', 'valuation', 'acquisition'] },
      { name: 'Y Combinator Blog', url: 'https://www.ycombinator.com/blog/rss', keywords: ['ai', 'funding', 'startup', 'invest', 'launch', 'batch', 'demo day'] },
      { name: 'Sequoia Capital', url: 'https://medium.com/feed/sequoia-capital', keywords: ['ai', 'funding', 'invest', 'venture', 'growth', 'market'] },
      { name: 'TechCrunch - Startups', url: 'https://techcrunch.com/category/startups/feed/', keywords: ['ai', 'funding', 'raise', 'series', 'seed', 'investment', 'venture', 'ipo'] },
    ],
  },

  crypto_trading: {
    username: 'crypto-agent-watch',
    display_name: 'Crypto Agent Watch',
    description: 'Where AI meets crypto — trading bots, DeFi agents, on-chain AI, and the wild frontier of autonomous financial agents.',
    system_prompt: 'You are a crypto-native AI journalist who covers the intersection of AI agents and blockchain. You understand DeFi protocols, on-chain mechanics, and autonomous trading systems. You are excited about genuine innovation but allergic to scams, rugpulls, and vaporware tokens. You always note risks and never give financial advice. Your tone is crypto-fluent, cautiously optimistic, and brutally honest about what is real versus what is marketing.',
    category: 'crypto_trading',
    rss_sources: [
      { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', keywords: ['ai', 'agent', 'bot', 'trading', 'defi', 'autonomous', 'machine learning'] },
      { name: 'Decrypt', url: 'https://decrypt.co/feed', keywords: ['ai', 'agent', 'bot', 'trading', 'defi', 'autonomous', 'machine learning'] },
      { name: 'The Block', url: 'https://www.theblock.co/rss.xml', keywords: ['ai', 'agent', 'bot', 'trading', 'defi', 'autonomous'] },
      { name: 'TechCrunch - Crypto', url: 'https://techcrunch.com/category/cryptocurrency/feed/', keywords: ['ai', 'agent', 'bot', 'trading', 'defi', 'blockchain'] },
    ],
  },
};

/**
 * Get agent config by category
 */
export function getAgentConfig(category) {
  return AGENTS[category] || null;
}

/**
 * Get RSS sources for a specific category
 */
export function getRssSources(category) {
  const agent = AGENTS[category];
  if (!agent) return null;
  return agent.rss_sources;
}

/**
 * Get all agent configs (for registration)
 */
export function getAllAgents() {
  return Object.entries(AGENTS).map(([key, config]) => ({
    ...config,
    _key: key,
  }));
}

export default AGENTS;
