// Skill: check-file-exists
// Namespace: global
// Sprawdza czy plik istnieje i wyświetla jego rozmiar.
// Tags: file system, nodejs, exists, size

// Auto-extracted skill
// Źródło: Goose task 2026-04-18T01:06:57.376Z

Stwórz plik U:\WWW_Zen_BRo_wser_org3\check_map.js o następującej zawartości:
#```javascript
const fs = require('fs');

fs.stat('U:\\WWW_Zen_BRo_wser_org3\\system_map.json', (err, stats) => {
  if (err) {
    console.log('Plik nie istnieje lub wystąpił błąd: ' + err.message);
  } else {
    console.log('Plik istnieje. Rozmiar: ' + stats.size + ' bajtów.');
  }
});
#```
#3. Wykonaj skrypt: node U:\WWW_Zen_BRo_wser_org3\check_map.js
```
