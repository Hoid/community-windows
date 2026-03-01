import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const htmlPath = resolve(process.cwd(), 'dist/index.html');
const html = readFileSync(htmlPath, 'utf-8');

if (!html.includes('assets/')) {
  throw new Error('Storefront smoke test failed: build output has no assets reference.');
}

console.log('Storefront smoke test passed.');
