const fs = require('fs');
const path = require('path');

const targetDir = 'U:/WWW_Zen_BRo_wser_org3';
const filePath = path.join(targetDir, 'system_map.json');

fs.stat(filePath, (err, stats) => {
  if (err) {
    console.log('Plik nie istnieje lub wystąpił błąd: ' + err.message);
  } else {
    console.log('Plik istnieje. Rozmiar: ' + stats.size + ' bajtów.');
  }
});