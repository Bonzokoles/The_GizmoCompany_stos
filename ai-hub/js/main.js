/* ═══════════════════════════════════════════════════
   MAIN — Entry point
   Imports all modules, exposes globals for inline
   onclick handlers, kicks off init.
   ═══════════════════════════════════════════════════ */

import { switchTab, initRouter } from './router.js';

import { updateStats, renderDashTopModels } from './modules/dashboard.js';
import { renderModels, initModels }         from './modules/models.js';
import { renderPricing, initPricing }       from './modules/pricing.js';
import { renderProviders }                  from './modules/providers.js';
import { renderTools, initTools }           from './modules/tools.js';
import { renderSkills, initSkills }         from './modules/skills.js';
import { searchDatasets, initDatasets }     from './modules/datasets.js';
import { renderApps, openApp, openChatModal, closeChatModal } from './modules/apps.js';
import { renderSpaces, openSpaceEmbed, closeSpaceModal, openSpaceHF, initSpaces } from './modules/spaces.js';
import {
  kbLoadLibraries, kbSwitchLibrary, kbShowDetail, kbCloseDetail,
  kbToggleSelect, kbFilterByTopic, kbSearchArticles,
  kbAddToDataset, kbCreateAgentFromArticle, kbBulkCreateDataset,
  kbExportLibrary, kbAddArticle, kbSetLib, kbUpdateShortcutButtons,
  initKb,
} from './modules/kb.js';
import { jimboReloadAll, jimboCreateDataset, jimboCreateAgent, jimboExportAgent } from './modules/jimbo.js';
import { initVchat } from './modules/vchat.js';

/* ── Expose globals for inline onclick= handlers ── */
Object.assign(window, {
  switchTab, daneSwitch: (...a) => window.daneSwitch?.(...a),
  openApp, openChatModal, closeChatModal,
  openSpaceEmbed, closeSpaceModal, openSpaceHF,
  kbSwitchLibrary, kbShowDetail, kbCloseDetail,
  kbToggleSelect, kbFilterByTopic, kbSearchArticles,
  kbAddToDataset, kbCreateAgentFromArticle, kbBulkCreateDataset,
  kbExportLibrary, kbAddArticle, kbSetLib, kbLoadLibraries,
  jimboReloadAll, jimboCreateDataset, jimboCreateAgent, jimboExportAgent,
  searchDatasets,
});

/* ── Init on DOM ready ── */
document.addEventListener('DOMContentLoaded', () => {
  // Router & navigation
  initRouter();

  // Render all static grids immediately
  updateStats();
  renderModels();
  renderPricing();
  renderProviders();
  renderTools();
  renderSkills();
  renderSpaces();
  renderApps();
  renderDashTopModels();

  // Wire up filter/search event listeners
  initModels();
  initPricing();
  initTools();
  initSkills();
  initSpaces();
  initDatasets();

  // KB — restore settings + lazy load
  initKb();

  // Voice chat widget
  initVchat();
});
