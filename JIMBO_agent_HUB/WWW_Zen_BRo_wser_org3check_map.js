const fs = require('fs');

const filePath = 'U:/WWW_Zen_BRo_wser_org3/system_map.json';

fs.stat(filePath, (err, stats) => {
  if (err) {
    console.log('Plik nie istnieje lub wystąpił błąd: ' + err.message);
  } else {
    console.log('Plik istnieje. Rozmiar: ' + stats.size + ' bajtów.');
  }
});