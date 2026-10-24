import { writeFile } from 'node:fs/promises';
import { getFluxDefaultStyles } from '../dist/index.js';

await writeFile(new URL('../dist/fluxmark.css', import.meta.url), getFluxDefaultStyles(), 'utf8');
