// Skill: fetch-url
// Pobiera tresc strony internetowej i zwraca czysty tekst bez HTML
// Tags: web, fetch, scraping

export async function fetchUrl(url){const r=await fetch(url);const h=await r.text();return h.replace(/<[^>]+>/g," ").trim().slice(0,5000)}
