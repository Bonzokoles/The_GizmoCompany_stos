/* ═══════════════════════════════════════════════════
   DATA — HuggingFace Skills
   ═══════════════════════════════════════════════════ */

export const SKILLS = [
  { name:'CF Pages Subpage', icon:'☁️', cat:'devops',     desc:'Deploy podstron na Cloudflare Pages (np. /ai-hub, /BONZO_media_HUB), poprawne kopiowanie artefaktów i walidacja tras.', file:'.agents/skills/cf-pages-subpage-deploy/SKILL.md', url:'.agents/skills/cf-pages-subpage-deploy/SKILL.md' },
  { name:'CF Routing Domains', icon:'🧭', cat:'devops',   desc:'Konfiguracja tras i domen (workers.dev/pages.dev/custom domain), fallback i walidacja endpointów po deployu.',      file:'.agents/skills/cf-pages-routing-domains/SKILL.md', url:'.agents/skills/cf-pages-routing-domains/SKILL.md' },
  { name:'Library Ops',      icon:'📚', cat:'data',       desc:'Operacje na bibliotekach wiedzy: normalizacja metadanych, import/export, walidacja i synchronizacja z UI.',         file:'.agents/skills/library-operations-workflow/SKILL.md', url:'.agents/skills/library-operations-workflow/SKILL.md' },
  { name:'HF CLI',           icon:'⌨️', cat:'devops',     desc:'Zarządzanie HuggingFace Hub z CLI — download, upload, zarządzanie repo, jobs, tokeny',                      file:'.agents/skills/hf-cli/SKILL.md' },
  { name:'Community Evals',  icon:'📊', cat:'research',   desc:'Ewaluacja modeli AI z inspect-ai i lighteval — benchmarki, community evals na lokalnym sprzęcie',           file:'.agents/skills/huggingface-community-evals/SKILL.md' },
  { name:'Datasets API',     icon:'📚', cat:'data',       desc:'Dataset Viewer REST API — splits, rows, search, filter, parquet, SQL queries na 200K+ datasetach',           file:'.agents/skills/huggingface-datasets/SKILL.md' },
  { name:'Gradio UI',        icon:'🖥️', cat:'frontend',   desc:'Budowanie webowych interfejsów ML z Gradio — Interface, Blocks, ChatInterface, komponenty',                   file:'.agents/skills/huggingface-gradio/SKILL.md' },
  { name:'HF Jobs',          icon:'🚀', cat:'devops',     desc:'Uruchamianie compute jobs na infrastrukturze HF — UV scripts, Docker, scheduling, monitoring',                file:'.agents/skills/huggingface-jobs/SKILL.md' },
  { name:'LLM Trainer',      icon:'🏋️', cat:'training',   desc:'Trenowanie i fine-tuning LLM z TRL — SFT, DPO, GRPO, reward modeling, konwersja GGUF',                        file:'.agents/skills/huggingface-llm-trainer/SKILL.md' },
  { name:'Paper Publisher',  icon:'📝', cat:'publishing', desc:'Publikowanie papierów na HF Hub — indeksowanie, linkowanie, autorstwo, szablony',                              file:'.agents/skills/huggingface-paper-publisher/SKILL.md' },
  { name:'Papers Lookup',    icon:'🔬', cat:'research',   desc:'Wyszukiwanie papierów naukowych na HF — API metadata, autorzy, powiązane artefakty',                          file:'.agents/skills/huggingface-papers/SKILL.md' },
  { name:'TrackIO',          icon:'📈', cat:'data',       desc:'Śledzenie eksperymentów ML — logowanie Python, alerty, CLI retrieval, dashboardy HF Spaces',                   file:'.agents/skills/huggingface-trackio/SKILL.md' },
  { name:'Vision Trainer',   icon:'👁️', cat:'training',   desc:'Trenowanie modeli vision — D-FINE, RT-DETR, YOLOS, timm, SAM/SAM2, object detection',                         file:'.agents/skills/huggingface-vision-trainer/SKILL.md' },
  { name:'Transformers.js',  icon:'🌐', cat:'frontend',   desc:'Modele ML w JavaScript/TypeScript — Pipeline API, WebGPU/WASM, NLP/vision/audio/multimodal',                   file:'.agents/skills/transformers-js/SKILL.md' },
];
