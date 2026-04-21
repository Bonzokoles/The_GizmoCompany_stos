/**
 * Centralne stałe — eliminuje magic strings rozrzucone po projekcie
 */

/** Bezpieczne protokoły URL */
export const SAFE_PROTOCOLS = ["http:", "https:", "about:", "chrome:"] as const;

/** Blokowane protokoły w nawigacji */
export const BLOCKED_PROTOCOLS = [
  "file:", "javascript:", "vbscript:", "data:", "blob:",
] as const;

/** Rozszerzenia plików akceptowane przez dialog i katalog */
export const ALLOWED_TEXT_EXTENSIONS = [
  ".md", ".txt", ".json", ".yaml", ".yml",
  ".html", ".ts", ".tsx", ".js", ".jsx", ".css",
] as const;

/** Domyślne pragmy SQLite dla WAL mode */
export const SQLITE_PRAGMAS = {
  journal_mode: "WAL",
  synchronous: "NORMAL",
  cache_size: -64000,  // 64MB
  temp_store: "MEMORY",
} as const;

/** Porty lokalnych serwisów */
export const LOCAL_PORTS = {
  OLLAMA:       11434,
  MEILISEARCH:  7700,
  SEARXNG:      8888,
  WEBSURFX:     8889,
  SIST2:        8082,
  UMAMI:        3000,
  JIMBO_HUB:    4224,
  POLACZEK_WD:  4225,
  JIMBO_KIT:    4111,
} as const;
