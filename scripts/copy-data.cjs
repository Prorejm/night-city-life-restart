// 跨平台复制 data/*.json 到 view/data/
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'data');
const dest = path.resolve(__dirname, '..', 'view', 'data');

if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const files = fs.readdirSync(src).filter(f => f.endsWith('.json'));
for (const file of files) {
  fs.copyFileSync(path.join(src, file), path.join(dest, file));
}
console.log(`Copied ${files.length} data files to view/data/`);
