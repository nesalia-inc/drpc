import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '..', 'dist');

const preloadJs = path.join(distDir, 'preload.js');
const preloadCjs = path.join(distDir, 'preload.cjs');

if (fs.existsSync(preloadJs)) {
  fs.renameSync(preloadJs, preloadCjs);
  console.log('Renamed preload.js -> preload.cjs');
}
