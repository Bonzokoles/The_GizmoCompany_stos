// Skill: map-system-files-to-json
// Namespace: global
// Rekursywnie mapuje system plików w podanym katalogu i zapisuje wynik jako JSON.
// Tags: node.js, system plików, JSON, mapowanie

// Auto-extracted skill
// Źródło: Goose task 2026-04-18T01:05:06.768Z

```goose
#INSTRUKCJE:
#Cel: Stworzenie mapy systemu plików w katalogu U:\WWW_Zen_BRo_wser_org3
#Kroki:
#1. Uruchom skrypt Node.js (map_system.js), który rekursywnie przejdzie przez strukturę katalogów U:\WWW_Zen_BRo_wser_org3 i wygeneruje mapę systemu plików w formacie JSON.
#2. Zapisz wynik do pliku U:\WWW_Zen_BRo_wser_org3\system_map.json.
#3. Stwórz plik U:\WWW_Zen_BRo_wser_org3\map_system.js o następującej zawartości:
#```javascript
const fs = require('fs');
const path = require('path');

function mapFileSystem(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push({ name: file, type: 'directory', children: mapFileSystem(filePath) });
    } else {
      results.push({ name: file, type: 'file' });
    }
  });
  return results;
}

const systemMap = mapFileSystem('U:\\WWW_Zen_BRo_wser_org3');
fs.writeFileSync('U:\\WWW_Zen_BRo_wser_org3\\system_map.json', JSON.stringify(systemMap, null, 2));

console.log('Mapa systemu plików została zapisana do U:\\WWW_Zen_BRo_wser_org3\\system_map.json');
#```
#4. Wykonaj skrypt: node U:\WWW_Zen_BRo_wser_org3\map_system.js
```

---
[AUTO-RETRY 1/2] Poprzednia próba oceniona na 0.50/1.0.
Wskazówka do poprawy: Sprawdź format odpowiedzi LLM
Poprzedni output: 

---
Wykonaj zadanie jeszcze raz uwzględniając powyższą wskazówkę.

---
[AUTO-RETRY 2/2] Poprzednia próba oceniona na 0.60/1.0.
Wskazówka do poprawy: Należy dokończyć implementację skryptu map_system.js, szczególnie rekursywne przechodzenie po katalogach i właściwe formatowanie JSON.
Poprzedni output: 

---
Wykonaj zadanie jeszcze raz uwzględniając powyższą wskazówkę.
