export interface AgentConfig {
  id: string;
  role: string;
  version: string;
  author: string;
  systemPrompt: string;
  modelId: string;
  toolIds: string[];
  capabilities: string[];
  skills?: string[];
}

export const agents: AgentConfig[] = [
  {
    id: 'planner',
    role: 'Project Planner',
    version: '1.0.0',
    author: 'ZENO System',
    systemPrompt: 'You are a project planner. Your job is to break down a complex task into a series of smaller, manageable steps. Provide a clear, ordered list of steps to be taken.',
    modelId: 'gemini-1.5-pro',
    toolIds: ['file_read', 'file_write'],
    capabilities: ['task-decomposition', 'step-by-step-planning', 'resource-allocation', 'timeline-estimation', 'risk-assessment'],
    skills: ['hf-cli', 'huggingface-datasets', 'huggingface-papers'],
  },
  {
    id: 'ml-trainer',
    role: 'ML Training Specialist',
    version: '1.0.0',
    author: 'ZENO System',
    systemPrompt: 'You are an ML training specialist. Use HuggingFace skills to train, fine-tune, and evaluate models. Support LLM training (SFT, DPO, GRPO) and vision model training (D-FINE, RT-DETR, YOLOS). Track experiments with TrackIO.',
    modelId: 'gemini-1.5-pro',
    toolIds: ['file_read', 'file_write', 'terminal'],
    capabilities: ['llm-finetuning', 'vision-training', 'model-evaluation', 'experiment-tracking'],
    skills: ['huggingface-llm-trainer', 'huggingface-vision-trainer', 'huggingface-community-evals', 'huggingface-trackio', 'huggingface-jobs'],
  },
  {
    id: 'data-researcher',
    role: 'Data & Research Specialist',
    version: '1.0.0',
    author: 'ZENO System',
    systemPrompt: 'You are a data and research specialist. Help find, explore, and use HuggingFace datasets. Look up research papers, publish findings, and build Gradio demos for ML applications.',
    modelId: 'gemini-1.5-pro',
    toolIds: ['file_read', 'file_write', 'web_search'],
    capabilities: ['dataset-exploration', 'paper-research', 'gradio-demos', 'data-analysis'],
    skills: ['huggingface-datasets', 'huggingface-papers', 'huggingface-paper-publisher', 'huggingface-gradio', 'transformers-js'],
  },
  {
    id: 'web-crawler',
    role: 'Web Research & Crawler',
    version: '1.0.0',
    author: 'ZENO System',
    systemPrompt: 'You are a web research specialist. Your job is to crawl websites, extract content, search for information, and analyze web pages. You help gather data from the internet efficiently and ethically.',
    modelId: 'gemini-1.5-pro',
    toolIds: ['web_search', 'file_read', 'file_write'],
    capabilities: ['web-crawling', 'content-extraction', 'web-search', 'url-mapping', 'site-structure-analysis'],
    skills: ['tavily-crawl', 'tavily-extract', 'tavily-search', 'tavily-map', 'tavily-research'],
  },
  {
    id: 'content-generator',
    role: 'Content & Code Generator',
    version: '1.0.0',
    author: 'ZENO System',
    systemPrompt: 'You are a content and code generation specialist. Create high-quality content, generate code snippets, write documentation, and build interactive demos. You focus on clarity, correctness, and best practices.',
    modelId: 'gemini-1.5-pro',
    toolIds: ['file_write', 'file_read', 'code_gen'],
    capabilities: ['content-generation', 'code-generation', 'documentation-writing', 'demo-creation', 'template-generation'],
    skills: ['transformers-js', 'huggingface-gradio', 'tavily-search'],
  },
  {
    id: 'code-analyzer',
    role: 'Code Analysis & Optimization Specialist',
    version: '1.0.0',
    author: 'ZENO System',
    systemPrompt: 'You are a code analysis specialist. Review code for quality, performance, security, and best practices. Identify bugs, suggest optimizations, and help refactor code to be more maintainable.',
    modelId: 'gemini-1.5-pro',
    toolIds: ['file_read', 'file_write', 'terminal'],
    capabilities: ['code-review', 'performance-analysis', 'security-audit', 'refactoring', 'bug-detection'],
    skills: ['web-perf', 'workers-best-practices', 'tavily-search'],
  },
];