/* ═══════════════════════════════════════════════════
   DATA — Providers
   ═══════════════════════════════════════════════════ */

export const PROVIDERS = [
  { name:'Anthropic',      icon:'A',  bg:'#da7756', models:3, status:'online',  desc:'Claude Sonnet 4, Opus 4.6, Vision' },
  { name:'OpenAI',         icon:'◎',  bg:'#10a37f', models:5, status:'online',  desc:'GPT-4o, GPT-5.3, DALL·E, Whisper, Embeddings' },
  { name:'Google',         icon:'G',  bg:'#4285f4', models:3, status:'online',  desc:'Gemini 2.0 Flash, Gemini 3, Gemma' },
  { name:'DeepSeek',       icon:'D',  bg:'#5b6ef5', models:1, status:'online',  desc:'DeepSeek R1 8B — budget reasoning' },
  { name:'xAI',            icon:'X',  bg:'#1d9bf0', models:1, status:'online',  desc:'Grok 4 — real-time AI' },
  { name:'Mistral',        icon:'M',  bg:'#ff7000', models:1, status:'online',  desc:'Mistral Large — European AI' },
  { name:'Moonshot',       icon:'🌙', bg:'#6366f1', models:1, status:'online',  desc:'Kimi K2.5 — long context' },
  { name:'Alibaba',        icon:'Q',  bg:'#ff6a00', models:1, status:'online',  desc:'Qwen 2.5 14B — open source' },
  { name:'Microsoft',      icon:'⊞',  bg:'#00a4ef', models:1, status:'online',  desc:'Phi Nano — ultra-light local' },
  { name:'Stability',      icon:'S',  bg:'#9333ea', models:1, status:'online',  desc:'Stable Diffusion XL — image gen' },
  { name:'ElevenLabs',     icon:'XI', bg:'#000',    models:1, status:'online',  desc:'TTS — naturalne głosy' },
  { name:'Zhipu',          icon:'Z',  bg:'#3b82f6', models:1, status:'online',  desc:'GLM-5 — bilingual model' },
  { name:'MiniMax',        icon:'M²', bg:'#ec4899', models:1, status:'online',  desc:'MiniMax M2.5 — multimodal' },
  { name:'Groq',           icon:'⚡', bg:'#f97316', models:0, status:'online',  desc:'Ultra-fast inference — LPU hardware' },
  { name:'OpenRouter',     icon:'↗',  bg:'#22d3ee', models:8, status:'online',  desc:'Multi-provider proxy — 8 models' },
  { name:'Ollama',         icon:'🦙', bg:'#64748b', models:0, status:'offline', desc:'Usunięty — brak wsparcia polskiego' },
];
