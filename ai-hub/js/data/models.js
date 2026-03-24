/* ═══════════════════════════════════════════════════
   DATA — AI Models
   ═══════════════════════════════════════════════════ */

export const MODELS = [
  // ── API MODELS ──
  { name:'Claude Sonnet 4',       provider:'Anthropic',  type:'api', cats:['text','code'],    ctx:'200K', input:3, output:15, tier:'premium',    desc:'Flagowy model Anthropic — coding, reasoning, analiza' },
  { name:'Claude Opus 4.6',       provider:'Anthropic',  type:'api', cats:['text','code'],    ctx:'200K', input:15, output:75, tier:'enterprise', desc:'Najpotężniejszy model Anthropic — deep reasoning, złożone zadania' },
  { name:'GPT-4o',                provider:'OpenAI',     type:'api', cats:['text','vision','code'], ctx:'128K', input:2.5, output:10, tier:'premium', desc:'Multimodalny model OpenAI — tekst, obraz, audio, kod' },
  { name:'GPT-5.3 Codex',        provider:'OpenAI',     type:'api', cats:['code','text'],    ctx:'256K', input:12, output:48, tier:'enterprise', desc:'Zaawansowany model kodowania z GPT-5 — agentic coding' },
  { name:'Gemini 2.0 Flash',     provider:'Google',     type:'api', cats:['text','vision'],  ctx:'1M',   input:0.075, output:0.3, tier:'budget', desc:'Ultra-szybki model Google — ogromny kontekst 1M tokenów' },
  { name:'Gemini 3 Flash',       provider:'Google',     type:'api', cats:['text','vision','audio'], ctx:'2M', input:0.1, output:0.4, tier:'budget', desc:'Najnowszy Flash — 2M kontekst, multimodal' },
  { name:'DeepSeek R1 8B',       provider:'DeepSeek',   type:'api', cats:['text','code'],    ctx:'128K', input:0.14, output:2.19, tier:'budget', desc:'Tani model reasoning — świetny stosunek jakości do ceny' },
  { name:'Qwen 2.5 14B',        provider:'Alibaba',    type:'api', cats:['text','code'],    ctx:'128K', input:0.5, output:1.5, tier:'budget', desc:'Open-source model z Alibaba — wielojęzykowy, kod' },
  { name:'Grok 4',               provider:'xAI',        type:'api', cats:['text','code'],    ctx:'256K', input:3, output:15, tier:'premium',    desc:'Model xAI — szybki reasoning, real-time knowledge' },
  { name:'Kimi K2.5',            provider:'Moonshot',   type:'api', cats:['text'],           ctx:'200K', input:1, output:4, tier:'budget',      desc:'Model Moonshot — długi kontekst, analiza dokumentów' },
  { name:'GLM-5',                provider:'Zhipu',      type:'api', cats:['text','code'],    ctx:'128K', input:1, output:4, tier:'budget',      desc:'Chinese-English bilingual model — kompetentny ogólnie' },
  { name:'MiniMax M2.5',         provider:'MiniMax',    type:'api', cats:['text','audio'],   ctx:'128K', input:0.5, output:2, tier:'budget',    desc:'Multimodal model — tekst i generowanie audio' },
  { name:'Mistral Large',        provider:'Mistral',    type:'api', cats:['text','code'],    ctx:'128K', input:2, output:6, tier:'premium',     desc:'Flagowy model Mistral — wielojęzyczny, reasoning' },
  // ── LOCAL MODELS ──
  { name:'Gemma 2B',             provider:'Google',     type:'local', cats:['text'],         ctx:'8K',   input:0, output:0, tier:'free',       desc:'Lekki model do terminala — polski support, konteneryzowany' },
  { name:'Phi Nano 0.5B',        provider:'Microsoft',  type:'local', cats:['text'],         ctx:'4K',   input:0, output:0, tier:'free',       desc:'Ultra-lekki model — terminal support, multilingual' },
  // ── EMBEDDING ──
  { name:'text-embedding-3-small', provider:'OpenAI',   type:'api', cats:['embedding'],      ctx:'8K',   input:0.02, output:0, tier:'budget',  desc:'Model embeddingów OpenAI — search, RAG, klasyfikacja' },
  { name:'text-embedding-3-large', provider:'OpenAI',   type:'api', cats:['embedding'],      ctx:'8K',   input:0.13, output:0, tier:'budget',  desc:'Duży model embeddingów — wyższa jakość retrieval' },
  // ── VISION & IMAGE ──
  { name:'DALL·E 3',              provider:'OpenAI',    type:'api', cats:['image'],          ctx:'—',    input:40, output:0, tier:'premium',    desc:'Generowanie obrazów z tekstu — high quality' },
  { name:'Stable Diffusion XL',   provider:'Stability', type:'api', cats:['image'],          ctx:'—',    input:0, output:0, tier:'free',        desc:'Open-source image generation — lokalne lub API' },
  { name:'Claude Vision',         provider:'Anthropic', type:'api', cats:['vision'],         ctx:'200K', input:3, output:15, tier:'premium',    desc:'Analiza obrazów przez Claude — OCR, diagram understanding' },
  // ── AUDIO ──
  { name:'Whisper Large v3',      provider:'OpenAI',    type:'api', cats:['audio'],          ctx:'—',    input:0.006, output:0, tier:'budget', desc:'Speech-to-text — 99 języków, świetna jakość' },
  { name:'ElevenLabs TTS',        provider:'ElevenLabs',type:'api', cats:['audio'],          ctx:'—',    input:0.3, output:0, tier:'premium',   desc:'Text-to-speech — naturalne głosy, klonowanie' },
];
