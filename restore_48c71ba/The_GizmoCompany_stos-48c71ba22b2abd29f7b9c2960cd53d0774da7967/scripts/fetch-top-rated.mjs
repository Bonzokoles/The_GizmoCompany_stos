import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dir = dirname(fileURLToPath(import.meta.url));
const KEY = "f1044d027d1751fec72a3b6d8129249c";
const BASE = "https://api.themoviedb.org/3";
const delay = ms => new Promise(r => setTimeout(r, ms));

async function tmdb(path) {
  const r = await fetch(`${BASE}${path}`);
  if (!r.ok) throw new Error(`TMDB ${r.status}: ${path}`);
  return r.json();
}
async function getPages(endpoint, count = 50) {
  let results = [];
  for (let p = 1; p <= Math.ceil(count / 20); p++) {
    const d = await tmdb(`${endpoint}&page=${p}`);
    results.push(...(d.results || []));
    await delay(300);
  }
  return results.slice(0, count);
}
async function getGenres(type) {
  const d = await tmdb(`/genre/${type}/list?api_key=${KEY}&language=pl-PL`);
  const map = {};
  (d.genres || []).forEach(g => map[g.id] = g.name);
  return map;
}

console.log("Pobieranie gatunkow...");
const mg = await getGenres("movie");
const tg = await getGenres("tv");

console.log("Pobieranie top 50 filmow (pl-PL)...");
const movies = await getPages(`/movie/top_rated?api_key=${KEY}&language=pl-PL`, 50);

console.log("Pobieranie top 50 seriali (pl-PL)...");
const tv = await getPages(`/tv/top_rated?api_key=${KEY}&language=pl-PL`, 50);

const fmt = (type, genres) => item => ({
  id: `tmdb-${type}-${item.id}`,
  title: type === "movie" ? (item.title || item.original_title) : (item.name || item.original_name),
  type,
  source: "tmdb_top_rated",
  metadata: {
    tmdb_id: item.id,
    tmdb_rating: item.vote_average,
    vote_count: item.vote_count,
    year: (type === "movie" ? item.release_date : item.first_air_date)?.slice(0, 4) || "",
    genres: (item.genre_ids || []).map(id => genres[id]).filter(Boolean),
    overview: item.overview || "",
    tmdb_poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
    tmdb_backdrop: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : null,
    original_title: type === "movie" ? item.original_title : item.original_name,
    popularity: item.popularity
  },
  reviews: { styles: {}, personal: null }
});

const db = {
  movies: movies.map(fmt("movie", mg)),
  tv: tv.map(fmt("tv", tg)),
  fetched_at: new Date().toISOString()
};

writeFileSync(join(__dir, "../movies-app/top_rated_db.json"), JSON.stringify(db, null, 2), "utf8");
console.log(`Zapisano: ${db.movies.length} filmow + ${db.tv.length} seriali`);
console.log("Przyklad film:", db.movies[0].title, "/", db.movies[0].metadata.year);
console.log("Przyklad serial:", db.tv[0].title, "/", db.tv[0].metadata.year);
