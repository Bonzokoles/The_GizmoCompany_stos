export type PromptCategory =
  | 'analysis'
  | 'coding'
  | 'security'
  | 'content'
  | 'ops'
  | 'research';

export interface PromptTemplate {
  id: string;
  title: string;
  category: PromptCategory;
  prompt: string;
  tags?: string[];
}

export const PROMPT_LIBRARY: PromptTemplate[] = [
  {
    id: 'analysis-root-cause',
    title: 'Root cause analysis',
    category: 'analysis',
    prompt:
      'Przeanalizuj problem krok po kroku. Wypisz: objawy, możliwe przyczyny, najbardziej prawdopodobną przyczynę źródłową oraz plan naprawy w 5 punktach.',
    tags: ['debug', 'incident'],
  },
  {
    id: 'analysis-priorities',
    title: 'Plan działań priorytetowych',
    category: 'analysis',
    prompt:
      'Na podstawie tego kontekstu przygotuj plan działań: quick wins (dziś), średni termin (tydzień), długi termin (miesiąc). Dodaj ryzyka i zależności.',
    tags: ['planning'],
  },
  {
    id: 'coding-refactor',
    title: 'Refactor bez zmiany API',
    category: 'coding',
    prompt:
      'Zaproponuj refaktoryzację kodu bez zmiany publicznego API. Pokaż listę zmian, uzasadnienie i potencjalny wpływ na testy.',
    tags: ['refactor', 'typescript'],
  },
  {
    id: 'coding-tests',
    title: 'Propozycja testów',
    category: 'coding',
    prompt:
      'Przygotuj zestaw testów (unit + integration) dla tego modułu: happy path, edge cases, oraz przypadki błędów.',
    tags: ['jest', 'qa'],
  },
  {
    id: 'security-review',
    title: 'Szybki security review',
    category: 'security',
    prompt:
      'Wykonaj szybki security review pod kątem OWASP Top 10. Wskaż konkretne luki, poziom ryzyka i rekomendacje naprawcze.',
    tags: ['owasp', 'audit'],
  },
  {
    id: 'security-input-validation',
    title: 'Walidacja wejścia',
    category: 'security',
    prompt:
      'Oceń walidację danych wejściowych na granicach systemu. Wypisz brakujące walidacje i zaproponuj reguły.',
    tags: ['validation'],
  },
  {
    id: 'content-blog-outline',
    title: 'Szkic artykułu blogowego',
    category: 'content',
    prompt:
      'Przygotuj szkic artykułu blogowego po polsku: tytuł, lead, 5 sekcji H2, FAQ i CTA. Ton: profesjonalny, praktyczny.',
    tags: ['blog', 'seo'],
  },
  {
    id: 'content-release-notes',
    title: 'Release notes',
    category: 'content',
    prompt:
      'Na podstawie zmian przygotuj release notes: Nowe funkcje, Poprawki, Breaking changes, Upgrade guide.',
    tags: ['changelog'],
  },
  {
    id: 'ops-health-check',
    title: 'Health check systemu',
    category: 'ops',
    prompt:
      'Zrób health check usług i zwróć raport: status, błędy krytyczne, degradacje i rekomendowane działania naprawcze.',
    tags: ['monitoring'],
  },
  {
    id: 'ops-incident-comm',
    title: 'Komunikat incident',
    category: 'ops',
    prompt:
      'Napisz krótki komunikat incident update dla zespołu i użytkowników: co się stało, wpływ, ETA naprawy, next update.',
    tags: ['incident', 'status-page'],
  },
  {
    id: 'research-compare-tools',
    title: 'Porównanie narzędzi',
    category: 'research',
    prompt:
      'Porównaj 3 narzędzia dla tego use-case. Dla każdego podaj: plusy, minusy, koszt, złożoność wdrożenia i rekomendację.',
    tags: ['benchmark'],
  },
  {
    id: 'research-api-eval',
    title: 'Ocena API',
    category: 'research',
    prompt:
      'Oceń to API pod kątem: stabilność, limity, bezpieczeństwo, koszty, ergonomia integracji i vendor lock-in.',
    tags: ['api', 'architecture'],
  },
];

export const PROMPT_CATEGORIES: Array<{ id: PromptCategory; label: string }> = [
  { id: 'analysis', label: 'Analiza' },
  { id: 'coding', label: 'Kodowanie' },
  { id: 'security', label: 'Security' },
  { id: 'content', label: 'Content' },
  { id: 'ops', label: 'Ops' },
  { id: 'research', label: 'Research' },
];
