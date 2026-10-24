import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import { performance } from 'node:perf_hooks';
import MarkdownIt from 'markdown-it';
import { marked } from 'marked';
import { FluxHtmlRenderer, FluxMarkParser } from '../packages/fluxmark/dist/index.js';
import { rawUrl, sources } from './sources.mjs';
import {
  normalizeMarkdown,
  renderNormalizedFluxMark,
  renderNormalizedMarkdown,
} from './normalize.mjs';

const cacheDirectory = new URL('./.cache/', import.meta.url);
const samples = 11;
const targetSampleMilliseconds = 150;
let sink = 0;

async function loadSource(source) {
  await mkdir(cacheDirectory, { recursive: true });
  const cachePath = new URL(`${source.id}.md`, cacheDirectory);
  try {
    return await readFile(cachePath, 'utf8');
  } catch {
    const response = await fetch(rawUrl(source));
    if (!response.ok) {
      throw new Error(`Failed to download ${source.id}: HTTP ${response.status}`);
    }
    const content = await response.text();
    await writeFile(cachePath, content);
    return content;
  }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}

function countWords(blocks) {
  let count = 0;
  for (const block of blocks) {
    if (block.type === 'paragraph' || block.type === 'heading') {
      const text = block.runs.map((run) => run.text).join(' ');
      count += text.trim().split(/\s+/).filter(Boolean).length;
    } else if (block.type === 'code') {
      count += block.content.split(/\s+/).filter(Boolean).length;
    } else if (block.type === 'list') {
      for (const item of block.items) count += countWords(item.blocks);
    } else if (block.type === 'quote') {
      count += countWords(block.blocks);
    }
  }
  return count;
}

function measure(fn) {
  for (let index = 0; index < 3; index += 1) {
    sink += String(fn()).length;
  }

  const calibrationStart = performance.now();
  sink += String(fn()).length;
  const calibration = Math.max(0.01, performance.now() - calibrationStart);
  const iterations = Math.max(1, Math.min(250, Math.ceil(targetSampleMilliseconds / calibration)));
  const durations = [];

  for (let sample = 0; sample < samples; sample += 1) {
    globalThis.gc?.();
    const start = performance.now();
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      sink += String(fn()).length;
    }
    durations.push((performance.now() - start) / iterations);
  }

  return {
    iterations,
    medianMs: median(durations),
    p95Ms: percentile(durations, 0.95),
    minMs: Math.min(...durations),
    samples: durations.map((value) => Number(value.toFixed(4))),
  };
}

function characterStats(markdownText, fluxText) {
  const markdownCharacters = [...markdownText].length;
  const fluxCharacters = [...fluxText].length;
  const markdownNonWhitespace = [...markdownText.replace(/\s/gu, '')].length;
  const fluxNonWhitespace = [...fluxText.replace(/\s/gu, '')].length;
  return {
    markdownCharacters,
    fluxCharacters,
    characterDelta: fluxCharacters - markdownCharacters,
    characterDeltaPercent: Number(
      (((fluxCharacters - markdownCharacters) / markdownCharacters) * 100).toFixed(2),
    ),
    markdownNonWhitespace,
    fluxNonWhitespace,
    nonWhitespaceDeltaPercent: Number(
      (((fluxNonWhitespace - markdownNonWhitespace) / markdownNonWhitespace) * 100).toFixed(2),
    ),
  };
}

function sourceRows(entries) {
  return entries
    .map((entry) => {
      const stats = characterStats(entry.normalizedMarkdown, entry.normalizedFluxMark);
      return `| ${entry.id} | ${entry.group} | ${entry.words.toLocaleString()} | ${entry.stats.images} | ${stats.markdownCharacters.toLocaleString()} | ${stats.fluxCharacters.toLocaleString()} | ${stats.characterDeltaPercent > 0 ? '+' : ''}${stats.characterDeltaPercent}% |`;
    })
    .join('\n');
}

function totalRow(entries) {
  const markdownText = entries.map((entry) => entry.normalizedMarkdown).join('\n\n');
  const fluxText = entries.map((entry) => entry.normalizedFluxMark).join('\n\n');
  const stats = characterStats(markdownText, fluxText);
  return `| **Total** | | **${entries.reduce((sum, entry) => sum + entry.words, 0).toLocaleString()}** | | **${stats.markdownCharacters.toLocaleString()}** | **${stats.fluxCharacters.toLocaleString()}** | **${stats.characterDeltaPercent > 0 ? '+' : ''}${stats.characterDeltaPercent}%** |`;
}

const loaded = [];
for (const source of sources) {
  const input = await loadSource(source);
  const { blocks, stats } = normalizeMarkdown(input);
  const normalizedMarkdown = renderNormalizedMarkdown(blocks);
  const normalizedFluxMark = renderNormalizedFluxMark(blocks);
  const fluxAst = new FluxMarkParser().parse(normalizedFluxMark);
  if (fluxAst.issues.length > 0) {
    throw new Error(
      `${source.id} produced FluxMark issues: ${fluxAst.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }
  loaded.push({
    ...source,
    group: source.group ?? 'prose',
    input,
    blocks,
    stats,
    normalizedMarkdown,
    normalizedFluxMark,
    fluxAst,
    words: countWords(blocks),
  });
}

const groups = [
  { id: 'rich', label: 'Link/media-rich public READMEs' },
  { id: 'all', label: 'All public documentation sources' },
];

for (const group of groups) {
  const entries = group.id === 'all'
    ? loaded
    : loaded.filter((entry) => entry.group === group.id);
  const markdownCorpus = entries.map((entry) => entry.normalizedMarkdown).join('\n\n');
  const fluxMarkCorpus = entries.map((entry) => entry.normalizedFluxMark).join('\n\n');
  const mdBytes = Buffer.byteLength(markdownCorpus);
  const fluxBytes = Buffer.byteLength(fluxMarkCorpus);
  const markdown = new MarkdownIt({ html: true });
  const fluxParser = new FluxMarkParser();
  const fluxRenderer = new FluxHtmlRenderer();

  const engines = {
    FluxMark: {
      parse: measure(() => fluxParser.parse(fluxMarkCorpus)),
      render: measure(() => fluxRenderer.render(fluxParser.parse(fluxMarkCorpus))),
    },
    'markdown-it': {
      parse: measure(() => markdown.parse(markdownCorpus, {})),
      render: measure(() => markdown.render(markdownCorpus)),
    },
    marked: {
      parse: measure(() => marked.lexer(markdownCorpus)),
      render: measure(() => marked.parse(markdownCorpus)),
    },
  };

  const fluxRender = engines.FluxMark.render.medianMs;
  for (const engine of Object.values(engines)) {
    engine.renderMbPerSecond = mdBytes / 1024 / 1024 / (engine.render.medianMs / 1000);
    engine.parseMbPerSecond = mdBytes / 1024 / 1024 / (engine.parse.medianMs / 1000);
    engine.renderRelativeToFlux = engine.render.medianMs / fluxRender;
  }
  engines.FluxMark.renderMbPerSecond =
    fluxBytes / 1024 / 1024 / (engines.FluxMark.render.medianMs / 1000);
  engines.FluxMark.parseMbPerSecond =
    fluxBytes / 1024 / 1024 / (engines.FluxMark.parse.medianMs / 1000);

  group.entries = entries;
  group.markdownCorpus = markdownCorpus;
  group.fluxMarkCorpus = fluxMarkCorpus;
  group.mdBytes = mdBytes;
  group.fluxBytes = fluxBytes;
  group.characters = characterStats(markdownCorpus, fluxMarkCorpus);
  group.words = entries.reduce((sum, entry) => sum + entry.words, 0);
  group.images = entries.reduce((sum, entry) => sum + entry.stats.images, 0);
  group.engines = engines;
}

const results = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: `${platform()} ${release()}`,
    cpu: cpus()[0]?.model ?? 'unknown',
    samples,
    targetSampleMilliseconds,
    gcExposed: typeof globalThis.gc === 'function',
  },
  sources: loaded.map((entry) => {
    const characters = characterStats(entry.normalizedMarkdown, entry.normalizedFluxMark);
    return {
      id: entry.id,
      group: entry.group,
      source: `${entry.repository}/${entry.path}@${entry.commit.slice(0, 8)}`,
      license: entry.license,
      originalBytes: Buffer.byteLength(entry.input),
      words: entry.words,
      images: entry.stats.images,
      omitted: entry.stats,
      ...characters,
    };
  }),
  groups: Object.fromEntries(
    groups.map((group) => [
      group.id,
      {
        label: group.label,
        documents: group.entries.length,
        words: group.words,
        images: group.images,
        markdownBytes: group.mdBytes,
        fluxBytes: group.fluxBytes,
        ...group.characters,
        engines: group.engines,
      },
    ]),
  ),
};

const rich = results.groups.rich;
const all = results.groups.all;
const sourceTable = sourceRows(loaded);

function engineTable(engines) {
  return Object.entries(engines)
    .map(
      ([name, engine]) =>
        `| ${name} | ${engine.parse.medianMs.toFixed(2)} | ${engine.render.medianMs.toFixed(2)} | ${engine.renderMbPerSecond.toFixed(2)} | ${engine.renderRelativeToFlux.toFixed(2)}× |`,
    )
    .join('\n');
}

const report = `# FluxMark benchmark results

Generated at ${results.generatedAt} with Node.js ${process.version} on ${results.environment.platform}, ${results.environment.cpu}. Samples: ${samples}; exposed GC: ${results.environment.gcExposed ? 'yes' : 'no'}.

## What is measured

Public Markdown sources are normalized into a common semantic subset of headings, paragraphs, blockquotes, simple lists, fenced code, links, inline emphasis and image references. The same normalized block tree is serialized as Markdown and FluxMark. The benchmark measures parsing and full semantic HTML string rendering with Markdown-it, marked and FluxMark.

Image references are normalized to links for both formats because FluxMark has no image node; raw HTML and tables that cannot be represented equivalently are omitted from both sides. This is a compiler throughput benchmark, not a browser paint benchmark. Results depend on hardware, Node.js and package versions.

The **rich** corpus contains six public README/media pages chosen for heavy link and image-reference usage. The **all** corpus adds six prose-heavy documentation chapters.

## Source size

| Source | Group | Words | Images | Normalized Markdown chars | FluxMark chars | FluxMark delta |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
${sourceTable}
${totalRow(loaded)}

### Link/media-rich subset

${rich.documents} documents, ${rich.words.toLocaleString()} words, ${rich.images} image references. FluxMark used **${Math.abs(rich.characterDeltaPercent).toFixed(2)}% fewer source characters** and **${Math.abs(rich.nonWhitespaceDeltaPercent).toFixed(2)}% fewer non-whitespace characters**.

## Throughput

### Link/media-rich subset

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
${engineTable(rich.engines)}

FluxMark render speedup versus Markdown-it: **${(rich.engines['markdown-it'].render.medianMs / rich.engines.FluxMark.render.medianMs).toFixed(2)}×**
FluxMark render speedup versus marked: **${(rich.engines.marked.render.medianMs / rich.engines.FluxMark.render.medianMs).toFixed(2)}×**

### All sources

| Engine | Parse median (ms) | Render median (ms) | Render MiB/s | Render time vs FluxMark |
| --- | ---: | ---: | ---: | ---: |
${engineTable(all.engines)}

FluxMark render speedup versus Markdown-it: **${(all.engines['markdown-it'].render.medianMs / all.engines.FluxMark.render.medianMs).toFixed(2)}×**
FluxMark render speedup versus marked: **${(all.engines.marked.render.medianMs / all.engines.FluxMark.render.medianMs).toFixed(2)}×**

## Sources

| ID | Pinned source | License |
| --- | --- | --- |
${loaded.map((entry) => `| ${entry.id} | [${entry.repository}/${entry.path}](${rawUrl(entry)}) | ${entry.license} |`).join('\n')}

## Reproduce

\`\`\`bash
pnpm bench
\`\`\`

The benchmark downloads pinned source revisions into \`benchmarks/.cache\` and reuses the cache on later runs. Use \`node --expose-gc benchmarks/run.mjs\` directly after building the SDK to optimize GC behavior.
`;

console.log(
  [
    'FluxMark benchmark',
    `Rich corpus: ${rich.documents} docs, ${rich.words.toLocaleString()} words, ${rich.images} image refs`,
    `Source: Markdown ${rich.markdownCharacters.toLocaleString()} chars, FluxMark ${rich.fluxCharacters.toLocaleString()} chars (${rich.characterDeltaPercent}%)`,
    '',
    'Engine          Parse ms   Render ms   Render MiB/s',
    ...Object.entries(rich.engines).map(
      ([name, engine]) =>
        `${name.padEnd(15)} ${engine.parse.medianMs.toFixed(2).padStart(8)} ${engine.render.medianMs.toFixed(2).padStart(11)} ${engine.renderMbPerSecond.toFixed(2).padStart(14)}`,
    ),
    '',
    `FluxMark render speedup vs markdown-it: ${(rich.engines['markdown-it'].render.medianMs / rich.engines.FluxMark.render.medianMs).toFixed(2)}x`,
    `FluxMark render speedup vs marked: ${(rich.engines.marked.render.medianMs / rich.engines.FluxMark.render.medianMs).toFixed(2)}x`,
    `All-source character delta: ${all.characterDeltaPercent}%`,
    ...(process.argv.includes('--write')
      ? ['', 'Wrote benchmarks/RESULTS.md and benchmarks/results.json']
      : []),
  ].join('\n'),
);

if (process.argv.includes('--write')) {
  await writeFile(new URL('./RESULTS.md', import.meta.url), report);
  await writeFile(new URL('./results.json', import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
}
