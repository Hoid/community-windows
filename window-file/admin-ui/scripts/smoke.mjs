import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const outDir = resolve(process.cwd(), '../static/admin');
const assetsDir = resolve(outDir, 'assets');

if (!existsSync(resolve(outDir, 'index.html'))) {
  throw new Error('Admin UI smoke test failed: static/admin/index.html is missing.');
}
if (!existsSync(assetsDir) || readdirSync(assetsDir).length === 0) {
  throw new Error('Admin UI smoke test failed: static/admin/assets is empty.');
}

console.log('Admin UI smoke test passed.');
