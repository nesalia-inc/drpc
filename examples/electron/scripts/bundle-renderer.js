import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Get workspace packages paths - go up from examples/electron to the root
const rootPath = path.join(projectRoot, '..', '..');
const electronClientPath = path.join(rootPath, 'packages', 'electron-client', 'dist', 'index.js');
const fpPath = path.join(rootPath, 'node_modules', '@deessejs', 'fp', 'dist', 'index.js');

console.log('Project root:', projectRoot);
console.log('Root path:', rootPath);
console.log('Electron client path:', electronClientPath);
console.log('FP path:', fpPath);

// Check if paths exist
console.log('electron-client exists:', fs.existsSync(electronClientPath));
console.log('fp exists:', fs.existsSync(fpPath));

await esbuild.build({
  entryPoints: [path.join(__dirname, '..', 'src', 'renderer', 'app.ts')],
  bundle: true,
  outfile: path.join(__dirname, '..', 'dist', 'renderer', 'app.js'),
  format: 'esm',
  platform: 'browser',
  target: ['chrome120'],
  sourcemap: true,
  minify: false,
  alias: {
    '@deessejs/electron-client': electronClientPath,
    '@deessejs/fp': fpPath,
  },
});

console.log('Bundled renderer/app.ts -> dist/renderer/app.js');