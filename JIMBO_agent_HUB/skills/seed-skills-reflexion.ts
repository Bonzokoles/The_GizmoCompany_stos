/**
 * Seed Skills — punkt porównawczy dla ReflexionEngine
 *
 * Uruchom raz przed pierwszym użyciem:
 *   npx tsx skills/seed-skills-reflexion.ts
 *
 * Daje agentowi referencję "co to dobry wynik" zanim zbierze własne doświadczenia.
 * Po tych seedach prompty agent.system.score.md zaczną działać — agent wie że
 * musi być lepszy niż poprzedni wynik danego typu zadania.
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, 'db', 'skills.db');

const SEED_SKILLS = [
  {
    name:      'debug_systematic',
    namespace: 'devtools',
    score:     0.82,
    description: 'Systematyczne debugowanie: czytaj stack trace, postaw hipotezę, minimalna zmiana, weryfikacja',
    content: `## Skill: Systematyczne debugowanie

Gdy zadanie polega na naprawieniu błędu:

1. Najpierw ZROZUM błąd zanim cokolwiek zmienisz
   - Przeczytaj cały stack trace
   - Zidentyfikuj dokładną linię i plik

2. Postaw hipotezę przed działaniem
   - "Błąd prawdopodobnie pochodzi z X bo Y"

3. Minimalna zmiana — zmień tylko to co konieczne
   - Nie refaktoryzuj przy okazji debugowania

4. Weryfikacja po zmianie — uruchom test lub sprawdź ręcznie

Ocena referencyjna: błąd naprawiony, brak nowych błędów w innych miejscach. Score 0.82.`,
  },
  {
    name:      'code_write_clean',
    namespace: 'devtools',
    score:     0.78,
    description: 'Pisanie czystego kodu: czytelność > sprytność, funkcje max 30 linii, opisowe nazwy',
    content: `## Skill: Pisanie czystego kodu

Priorytet: czytelność > sprytność > wydajność (jeśli nie ma wymagań perf).

Zasady:
- Funkcje max 30 linii — jeśli więcej, podziel
- Nazwy zmiennych opisują co zawierają, nie jak są zrobione
- Jeden poziom abstrakcji per funkcja
- Komentarz tylko gdy "dlaczego", nie "co"

Złe:   const x = arr.filter(i => i.a > 0).map(i => i.b)
Dobre:
  const activeItems = items.filter(item => item.isActive)
  const itemNames   = activeItems.map(item => item.name)

Ocena referencyjna: kod przechodzi review bez uwag strukturalnych. Score 0.78.`,
  },
  {
    name:      'research_web',
    namespace: 'search',
    score:     0.75,
    description: 'Efektywny research: sprawdź kontekst najpierw, jedno precyzyjne zapytanie, oceniaj źródła',
    content: `## Skill: Efektywny research

Gdy zadanie wymaga znalezienia informacji:

1. Najpierw sprawdź czy odpowiedź jest w kontekście (skills, historia)
2. Jeśli nie — jedno precyzyjne zapytanie, nie 5 ogólnych
3. Oceń źródło: oficjalna dokumentacja > GitHub Issues > blog posts
4. Cytuj źródło w odpowiedzi

Czego unikać:
- Zgadywania gdy nie wiesz — powiedz "nie wiem, sprawdzam"
- Dawania przestarzałych informacji bez sprawdzenia daty

Ocena referencyjna: odpowiedź z konkretnym, weryfikowalnym źródłem. Score 0.75.`,
  },
  {
    name:      'task_planning',
    namespace: 'global',
    score:     0.80,
    description: 'Planowanie przed działaniem: 3-5 kroków, ocena ryzyka, weryfikacja po każdym kroku',
    content: `## Skill: Planowanie przed działaniem

Dla każdego zadania trwającego > 2 minuty:

1. Napisz plan PRZED wykonaniem (3-5 kroków)
2. Oceń ryzyko każdego kroku (niskie/średnie/wysokie)
3. Zacznij od kroku o najniższym ryzyku
4. Po każdym kroku: czy plan nadal aktualny?

Format planu:
  [ ] Krok 1: ...
  [ ] Krok 2: ...
  [!] Krok 3: ryzyko — może wymagać rollback

Ocena referencyjna: zadanie ukończone zgodnie z planem bez niespodzianek. Score 0.80.`,
  },
  {
    name:      'self_evaluation',
    namespace: 'global',
    score:     0.85,
    description: 'Meta-skill: ocena własnego rozwiązania przed wysłaniem — kompletność, alternatywy, najlepszy skill',
    content: `## Skill: Ocena własnego rozwiązania (meta-skill)

Po każdym zadaniu oceń swój wynik zanim wyślesz:

Pytania kontrolne:
- Czy odpowiedź jest kompletna? (czy coś pominąłem)
- Czy jest prostsza alternatywa którą powinienem był wybrać?
- Czy użyłem najlepszego dostępnego skilla?
- Gdybym to robił drugi raz — co zmieniłbym?

Jeśli odpowiedź na pytanie 2. jest "tak" — cofnij się i użyj prostszego rozwiązania.
Wysyłaj tylko gdy jesteś pewien że to twój najlepszy możliwy wynik.

Ocena referencyjna: stosowanie tego skilla automatycznie podnosi score innych skilli. Score 0.85.`,
  },
] as const;

// ── Runner ────────────────────────────────────────────────────────────────────

async function seedSkills() {
  const db = new Database(DB_PATH);

  // Migracje kolumn potrzebnych dla ReflexionEngine (idempotentne)
  const migrations: [string, string][] = [
    ['score',                'REAL DEFAULT 0.7'],
    ['usage_count',          'INTEGER DEFAULT 0'],
    ['last_used_at',         'TEXT'],
    ['consecutive_failures', 'INTEGER DEFAULT 0'],
    ['status',               "TEXT DEFAULT 'active'"],
    ['archived_at',          'TEXT'],
    ['source',               "TEXT DEFAULT 'goose'"],
  ];
  const cols = (db.prepare('PRAGMA table_info(skills)').all() as { name: string }[]).map(c => c.name);
  for (const [col, def] of migrations) {
    if (!cols.includes(col)) {
      db.exec(`ALTER TABLE skills ADD COLUMN ${col} ${def}`);
      console.log(`  ✦ Migracja: dodano kolumnę ${col}`);
    }
  }

  let inserted = 0;
  for (const skill of SEED_SKILLS) {
    const exists = db.prepare(`SELECT id FROM skills WHERE name = ?`).get(skill.name);
    if (exists) {
      console.log(`  ⏭  Skip (istnieje): ${skill.name}`);
      continue;
    }
    db.prepare(`
      INSERT INTO skills
        (id, name, description, code, tags, embedding, namespace, created_at,
         success_count, failure_count, score, usage_count, consecutive_failures, status, source)
      VALUES (?, ?, ?, ?, '[]', '[]', ?, ?, 0, 0, ?, 0, 0, 'active', 'seed')
    `).run(
      randomUUID(),
      skill.name,
      skill.description,
      skill.content,
      skill.namespace,
      Date.now(),
      skill.score,
    );
    console.log(`  ✅ Seeded: ${skill.name} (score: ${skill.score}, ns: ${skill.namespace})`);
    inserted++;
  }

  console.log(`\n🌱 Done — ${inserted}/${SEED_SKILLS.length} skills dodanych. Agent ma punkt porównawczy.`);
  db.close();
}

seedSkills().catch(console.error);
