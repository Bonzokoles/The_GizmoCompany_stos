/**
 * Generate Release Notes from Changelog
 */

const fs = require('fs');
const path = require('path');

// Get latest version from package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const version = pkg.version;

// Read CHANGELOG.md
const changelogPath = path.join(__dirname, '../CHANGELOG.md');
let changelog = '';

if (fs.existsSync(changelogPath)) {
  changelog = fs.readFileSync(changelogPath, 'utf-8');
}

// Extract current version section
const versionRegex = new RegExp(`## \\[${version}\\](.+?)(?=## \\[|$)`, 's');
const match = changelog.match(versionRegex);

let releaseNotes = 'No release notes available';

if (match) {
  releaseNotes = match[1].trim();
}

// Output for GitHub Actions
console.log(`::set-output name=content::${releaseNotes}`);

console.log('Release notes generated:');
console.log(releaseNotes);