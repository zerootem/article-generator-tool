import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const source = resolve('src/styles/app.css');
const destination = resolve('public/assets/css/app.css');
mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
console.log('Synchronized public/assets/css/app.css for article export.');
