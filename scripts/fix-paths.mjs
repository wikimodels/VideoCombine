import fs from 'fs';
import path from 'path';

const searchDir = './src/compositions';

const replacements = [
  { from: /staticFile\(['"]track\.mp3['"]\)/g, to: "staticFile('audio/track.mp3')" },
  { from: /staticFile\(['"]track_short\.mp3['"]\)/g, to: "staticFile('audio/track_short.mp3')" },
  { from: /staticFile\(['"]forged\.jpg['"]\)/g, to: "staticFile('images/forged.jpg')" },
  { from: /staticFile\(['"]skull\.svg['"]\)/g, to: "staticFile('icons/skull.svg')" },
  { from: /staticFile\(['"]crosshair\.svg['"]\)/g, to: "staticFile('icons/crosshair.svg')" },
  { from: /staticFile\(['"]soldier_1\.svg['"]\)/g, to: "staticFile('icons/soldier_1.svg')" },
  { from: /staticFile\(['"]soldier_2\.svg['"]\)/g, to: "staticFile('icons/soldier_2.svg')" },
  { from: /staticFile\(['"]soldier_4\.svg['"]\)/g, to: "staticFile('icons/soldier_4.svg')" },
  { from: /staticFile\(['"]Robo_1\.svg['"]\)/g, to: "staticFile('icons/Robo_1.svg')" },
  { from: /staticFile\(['"]Robo_2\.svg['"]\)/g, to: "staticFile('icons/Robo_2.svg')" },
  { from: /staticFile\(['"]spotify\.svg['"]\)/g, to: "staticFile('icons/spotify.svg')" },
];

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const {from, to} of replacements) {
        if (content.match(from)) {
          content = content.replace(from, to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

walk(searchDir);
console.log('Done!');
