import { createHighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import consoleLang from 'shiki/langs/console.mjs';
import bashLang from 'shiki/langs/bash.mjs';
import cssLang from 'shiki/langs/css.mjs';
import htmlLang from 'shiki/langs/html.mjs';
import javascriptLang from 'shiki/langs/javascript.mjs';
import jsonLang from 'shiki/langs/json.mjs';
import jsxLang from 'shiki/langs/jsx.mjs';
import markdownLang from 'shiki/langs/markdown.mjs';
import pythonLang from 'shiki/langs/python.mjs';
import sqlLang from 'shiki/langs/sql.mjs';
import tsxLang from 'shiki/langs/tsx.mjs';
import typescriptLang from 'shiki/langs/typescript.mjs';
import yamlLang from 'shiki/langs/yaml.mjs';
import githubLight from 'shiki/themes/github-light.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';

type UnknownRecord = Record<string, unknown>;

const THEME_MAP: Record<string, UnknownRecord> = {
  'github-light': githubLight as unknown as UnknownRecord,
  'github-dark': githubDark as unknown as UnknownRecord,
};

export const bundledThemes = {
  'github-light': githubLight,
  'github-dark': githubDark,
};

export const bundledLanguages = {
  text: consoleLang,
  plaintext: consoleLang,
  console: consoleLang,
  bash: bashLang,
  shell: bashLang,
  shellscript: bashLang,
  css: cssLang,
  html: htmlLang,
  javascript: javascriptLang,
  js: javascriptLang,
  json: jsonLang,
  jsx: jsxLang,
  markdown: markdownLang,
  md: markdownLang,
  python: pythonLang,
  py: pythonLang,
  sql: sqlLang,
  tsx: tsxLang,
  typescript: typescriptLang,
  ts: typescriptLang,
  yaml: yamlLang,
  yml: yamlLang,
} satisfies Record<string, unknown>;

function normalizeTheme(theme: unknown): UnknownRecord {
  if (typeof theme === 'string') {
    return THEME_MAP[theme] ?? THEME_MAP['github-dark'];
  }

  if (theme && typeof theme === 'object') {
    return theme as UnknownRecord;
  }

  return THEME_MAP['github-dark'];
}

function normalizeLang(lang: unknown): UnknownRecord {
  if (typeof lang === 'string') {
    const found = bundledLanguages[lang as keyof typeof bundledLanguages];
    return (found ?? consoleLang) as unknown as UnknownRecord;
  }

  if (lang && typeof lang === 'object') {
    return lang as UnknownRecord;
  }

  return consoleLang as unknown as UnknownRecord;
}

export async function createHighlighter(options: {
  themes?: unknown[];
  langs?: unknown[];
  engine?: unknown;
}) {
  const themesInput = options.themes?.length ? options.themes : ['github-light', 'github-dark'];
  const langsInput = options.langs?.length ? options.langs : [consoleLang];

  return createHighlighterCore({
    themes: themesInput.map(normalizeTheme) as unknown as Parameters<typeof createHighlighterCore>[0]['themes'],
    langs: langsInput.map(normalizeLang) as unknown as Parameters<typeof createHighlighterCore>[0]['langs'],
    engine:
      (options.engine as Parameters<typeof createHighlighterCore>[0]['engine']) ??
      createJavaScriptRegexEngine({ forgiving: true }),
  });
}
