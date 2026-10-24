#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { normalizeMarkdown, renderNormalizedFluxMark } from '../benchmarks/normalize.mjs';

function usage() {
  console.error('Usage: node tools/migrate-markdown.mjs <input.md> [--output <file.fx>] [--stdout]');
  process.exit(1);
}

const args = process.argv.slice(2);
const inputPath = args[0];
if (inputPath === undefined) usage();
const outputIndex = args.indexOf('--output');
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
const toStdout = args.includes('--stdout') || outputPath === undefined;

const absoluteInput = resolve(inputPath);
const source = await readFile(absoluteInput, 'utf8');
const { blocks, stats } = normalizeMarkdown(source);
const flux = renderNormalizedFluxMark(blocks);

if (toStdout) {
  process.stdout.write(flux);
} else {
  const absoluteOutput = resolve(outputPath);
  if (absoluteOutput === absoluteInput) {
    console.error('Refusing to overwrite the Markdown input.');
    process.exit(1);
  }
  await writeFile(absoluteOutput, flux, 'utf8');
  console.error(`Wrote ${basename(absoluteOutput)}`);
}

console.error(
  [
    'Migration notes:',
    `  tables: ${stats.tables}`,
    `  images: ${stats.images}`,
    `  omitted raw HTML blocks: ${stats.htmlBlocks}`,
    `  dropped relative links: ${stats.relativeLinks}`,
    '  This converter normalizes Markdown into FluxMark and does not preserve raw HTML.',
  ].join('\n'),
);
