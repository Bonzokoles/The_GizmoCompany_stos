/**
 * Generuje manifest.json z struktury folderów public/mascot/
 * Uruchom: node scripts/generate-mascot-manifest.mjs
 */
import { readdirSync, statSync, writeFileSync, existsSync } from 'fs';
import { join, relative, posix } from 'path';

const MASCOT_DIR = join(process.cwd(), 'public', 'mascot');
const MANIFEST_PATH = join(MASCOT_DIR, 'manifest.json');
const CATEGORIES = ['idle', 'action', 'intro', 'outro'];
const EXTENSIONS = new Set(['.webm', '.mp4']);
const SKIN_RE = /^[a-z0-9_-]+$/i;

function getClips(skinDir, category) {
  const catDir = join(skinDir, category);
  if (!existsSync(catDir)) return [];
  return readdirSync(catDir)
    .filter((f) => EXTENSIONS.has(f.slice(f.lastIndexOf('.')).toLowerCase()))
    .map((f) => posix.join('/mascot', relative(MASCOT_DIR, join(catDir, f)).split('\\').join('/')));
}

const skins = readdirSync(MASCOT_DIR)
  .filter((name) => {
    if (!SKIN_RE.test(name)) return false;
    const p = join(MASCOT_DIR, name);
    return statSync(p).isDirectory() && CATEGORIES.some((c) => existsSync(join(p, c)));
  })
  .map((id) => {
    const skinDir = join(MASCOT_DIR, id);
    const hasIcon = existsSync(join(skinDir, 'icon.png'));
    return {
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      icon: hasIcon ? `/mascot/${id}/icon.png` : null,
      clips: Object.fromEntries(CATEGORIES.map((c) => [c, getClips(skinDir, c)])),
    };
  });

const manifest = { skins };
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Wygenerowano manifest: ${skins.length} skin(ów)`);
skins.forEach((s) => {
  const total = Object.values(s.clips).flat().length;
  console.log(`  ${s.id}: ${total} klipów`);
});
