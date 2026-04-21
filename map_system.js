const fs = require('fs');
const path = require('path');

function mapFileSystem(dir) {
  const results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    const filePath = path.join(dir, file);
    try {
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results.push({ name: file, type: 'directory', children: mapFileSystem(filePath) });
      } else {
        results.push({ name: file, type: 'file' });
      }
    } catch (error) {
      // Log the error but continue mapping other files/directories
      console.error(`Error processing ${filePath}: ${error.message}`);
    }
  });
  return results;
}

const targetDir = 'U:\\\WWW_Zen_BRo_wser_org3';
const systemMap = mapFileSystem(targetDir);
fs.writeFileSync(path.join(targetDir, 'system_map.json'), JSON.stringify(systemMap, null, 2));

console.log(`Mapa systemu plików została zapisana do ${path.join(targetDir, 'system_map.json')}`);