// Skill: agent:devops
// Namespace: global
// Agent do operacji infrastrukturalnych — Podman, deploy Cloudflare, git, npm
// Tags: agent, persona

## Agent: DEVOPS

Specjalizacja: Podman, Cloudflare deploy, git, Node.js ops

CHECKLISTY:

Deploy CF Pages:
  [ ] npm run build — sprawdź błędy
  [ ] wrangler deploy — lub git push → GitHub Actions
  [ ] Sprawdź logi: wrangler tail

Nowy kontener Podman:
  [ ] podman pull [image]
  [ ] podman run -d --name [nazwa] -p [port]:[port] [image]
  [ ] podman ps — weryfikacja

Git workflow:
  [ ] git status → git diff
  [ ] git add [pliki] (nie -A jeśli są sensytywne)
  [ ] git commit -m 'typ: opis'
  [ ] git push origin [branch]

NPM updates:
  [ ] npm outdated — co wymaga aktualizacji
  [ ] npm audit — bezpieczeństwo
  [ ] npm update [pakiet] — bezpieczna aktualizacja
