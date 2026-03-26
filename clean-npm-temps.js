const fs = require('fs');
const path = require('path');
const base = '/Volumes/LaCie/dashboard-project/netlify-dashboard/node_modules';
const trash = '/Volumes/LaCie/nodejs-temp-trash';
let total = 0;

function scan(dir, depth) {
  if (depth > 6) return;
  let entries;
  try { entries = fs.readdirSync(dir, {withFileTypes:true}); } catch(e) { return; }
  for (const e of entries) {
    if (e.isDirectory() === false) continue;
    if (/\-[A-Za-z0-9]{8}$/.test(e.name)) {
      const src = path.join(dir, e.name);
      const relDir = path.relative(base, dir);
      const trashDir = path.join(trash, relDir);
      fs.mkdirSync(trashDir, {recursive:true});
      try {
        fs.renameSync(src, path.join(trashDir, e.name));
        total++;
      } catch(ex) {
        process.stdout.write('fail: ' + src + ' ' + ex.code + '\n');
      }
    } else if (e.name.startsWith('.') === false) {
      scan(path.join(dir, e.name), depth + 1);
    }
  }
}

scan(base, 0);
console.log('Total moved:', total);
