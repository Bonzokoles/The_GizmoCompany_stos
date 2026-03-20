import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const DATA = join(import.meta.dirname, 'data');

async function loadReviewsJson() {
  const dir = join(DATA, 'reviews_json');
  const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
  const movies = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf-8');
    const data = JSON.parse(raw);
    movies.push({
      id: file.replace('.json', '').toLowerCase().replace(/\s+/g, '-'),
      title: data.film,
      source: 'augmented_json',
      metadata: data.metadata || {},
      reviews: {
        styles: data.reviews || {},
        personal: null
      }
    });
  }
  return movies;
}

async function loadReviewsMd() {
  const dir = join(DATA, 'reviews_md');
  const files = (await readdir(dir)).filter(f => f.endsWith('.md'));
  const reviews = [];
  for (const file of files) {
    const raw = await readFile(join(dir, file), 'utf-8');
    const title = file.replace('.md', '').trim();
    reviews.push({ title, content: raw });
  }
  return reviews;
}

async function loadCatalog() {
  const file = join(DATA, 'catalog', 'movies_data.json');
  const raw = await readFile(file, 'utf-8');
  const data = JSON.parse(raw);
  return data.movies || [];
}

function normalize(str) {
  return str.toLowerCase()
    .replace(/[''"`_-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchTitle(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Compare without spaces (DeadMan vs Dead Man)
  const naNoSpace = na.replace(/\s/g, '');
  const nbNoSpace = nb.replace(/\s/g, '');
  if (naNoSpace === nbNoSpace) return true;
  // Only match substrings if the shorter one is at least 4 chars
  // and the length ratio is reasonable (>50%)
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  if (shorter.length < 4) return false;
  if (shorter.length / longer.length < 0.5) return false;
  return longer.includes(shorter);
}

async function main() {
  console.log('Loading reviews JSON...');
  const jsonMovies = await loadReviewsJson();
  console.log(`  → ${jsonMovies.length} films from augmented JSON`);

  console.log('Loading personal reviews MD...');
  const mdReviews = await loadReviewsMd();
  console.log(`  → ${mdReviews.length} personal reviews`);

  console.log('Loading catalog...');
  const catalog = await loadCatalog();
  console.log(`  → ${catalog.length} catalog entries`);

  // Merge personal MD reviews into JSON movies where titles match
  for (const md of mdReviews) {
    const match = jsonMovies.find(m => matchTitle(m.title, md.title));
    if (match) {
      match.reviews.personal = md.content;
      console.log(`  ✓ Matched MD "${md.title}" → "${match.title}"`);
    } else {
      // Add as standalone movie entry
      jsonMovies.push({
        id: md.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        title: md.title,
        source: 'personal_md',
        metadata: {},
        reviews: {
          styles: {},
          personal: md.content
        }
      });
      console.log(`  + Added standalone MD "${md.title}"`);
    }
  }

  // Merge catalog data into movies
  for (const cat of catalog) {
    const match = jsonMovies.find(m => matchTitle(m.title, cat.title));
    if (match) {
      match.metadata.category = cat.category;
      match.metadata.director = match.metadata.director || cat.director;
      match.metadata.year = match.metadata.year || cat.year;
      match.metadata.tags = cat.tags;
      match.metadata.poster = cat.poster;
      console.log(`  ✓ Merged catalog "${cat.title}" → "${match.title}"`);
    } else {
      jsonMovies.push({
        id: cat.id,
        title: cat.title,
        source: 'catalog',
        metadata: {
          year: cat.year,
          director: cat.director,
          category: cat.category,
          tags: cat.tags,
          poster: cat.poster
        },
        reviews: { styles: {}, personal: null }
      });
      console.log(`  + Added catalog-only "${cat.title}"`);
    }
  }

  // Sort by title
  jsonMovies.sort((a, b) => a.title.localeCompare(b.title));

  const db = {
    version: '1.0',
    generated: new Date().toISOString(),
    totalMovies: jsonMovies.length,
    movies: jsonMovies
  };

  const outPath = join(import.meta.dirname, 'movies_db.json');
  await writeFile(outPath, JSON.stringify(db, null, 2), 'utf-8');
  const size = JSON.stringify(db).length;
  console.log(`\n✅ movies_db.json: ${jsonMovies.length} movies, ${(size / 1024).toFixed(1)} KB`);
}

main().catch(err => { console.error(err); process.exit(1); });
