/**
 * ZENO Knowledge Base Search
 * Wygenerowano automatycznie przez MOA Pipeline
 * Użycie w agencie: import { searchKB } from '@/vectors/kb-search.mjs'
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS_FILE = join(__dirname, 'kb-vectors.json');

let _vectorCache = null;

function loadVectors() {
  if (_vectorCache) return _vectorCache;
  _vectorCache = JSON.parse(readFileSync(VECTORS_FILE, 'utf-8'));
  return _vectorCache;
}

function cosineSimilarity(a, b) {
  let dot = 0, nA = 0, nB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    nA  += a[i] * a[i];
    nB  += b[i] * b[i];
  }
  return dot / (Math.sqrt(nA) * Math.sqrt(nB) + 1e-8);
}

/**
 * Wyszukuje semantycznie w bazie wiedzy używając pre-computed embeddings
 * @param {number[]} queryEmbedding - embedding wektora zapytania (1536 dim)
 * @param {number}   topK           - ile wyników zwrócić
 * @returns {Array<{id, title, category, score, url}>}
 */
export function searchKB(queryEmbedding, topK = 5) {
  const vectors = loadVectors();
  const results = [];

  for (const entry of Object.values(vectors)) {
    if (!entry.embedding) continue;
    const score = cosineSimilarity(queryEmbedding, entry.embedding);
    results.push({
      id:         entry.id,
      title:      entry.title,
      category:   entry.category,
      tags:       entry.tags,
      tools:      entry.tools,
      importance: entry.importance,
      url:        entry.metadata?.url || '',
      score,
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Keyword search (bez embeddings) — szybkie wyszukiwanie tekstowe
 * @param {string} query
 * @param {number} topK
 */
export function searchKBKeyword(query, topK = 10) {
  const vectors = loadVectors();
  const q = query.toLowerCase();
  const results = [];

  for (const entry of Object.values(vectors)) {
    const text = [entry.title, ...(entry.tags || []), ...(entry.tools || [])].join(' ').toLowerCase();
    if (text.includes(q)) {
      results.push({
        id:         entry.id,
        title:      entry.title,
        category:   entry.category,
        tags:       entry.tags,
        tools:      entry.tools,
        url:        entry.metadata?.url || '',
        importance: entry.importance,
      });
    }
  }

  return results
    .sort((a, b) => (b.importance || 5) - (a.importance || 5))
    .slice(0, topK);
}

/** Lista wszystkich kategorii */
export function listCategories() {
  const vectors = loadVectors();
  return [...new Set(Object.values(vectors).map(e => e.category).filter(Boolean))].sort();
}

/** Pobierz wszystkie tematy danej kategorii */
export function getByCategory(category) {
  const vectors = loadVectors();
  return Object.values(vectors)
    .filter(e => e.category === category)
    .sort((a, b) => (b.importance || 5) - (a.importance || 5))
    .map(({ embedding, ...rest }) => rest);
}
