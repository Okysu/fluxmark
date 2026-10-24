#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Parser } from 'commonmark';
import MarkdownIt from 'markdown-it';

const parser = new Parser();
const markdown = new MarkdownIt({ html: true });
const TABS = '\t';

function escapeAttribute(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function escapeFluxText(value) {
  let result = '';
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if ('\\[]|*_=~`'.includes(character)) {
      result += `\\${character}`;
    } else if (character === '!' && /[<[]/.test(value[index + 1] ?? '')) {
      result += '\\!';
    } else {
      result += character;
    }
  }
  return result;
}

function escapePipeContent(value) {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('[', '\\[')
    .replaceAll(']', '\\]')
    .replaceAll('|', '\\|');
}

function safeDestination(value) {
  return encodeURI(value)
    .replaceAll('|', '%7C')
    .replaceAll('[', '%5B')
    .replaceAll(']', '%5D');
}

function fluxDestination(value) {
  const encoded = safeDestination(value);
  if (
    /^(?:https?:\/\/|mailto:|tel:|#)/i.test(encoded) ||
    /^\/(?!\/)/.test(encoded) ||
    /^\.{1,2}\//.test(encoded) ||
    /^[^\s]+\/[^\s]+/.test(encoded) ||
    /^[^\s]+\.[a-z0-9]+(?:[#?].*)?$/i.test(encoded)
  ) {
    return encoded;
  }
  return `url:${encoded}`;
}

function protectBlockStart(line) {
  if (/^(?:#|>|\$|@)(?:[ \t]|$)/.test(line)) return `\\${line}`;
  if (/^!html(?:[ \t]|$)/.test(line)) return `\\${line}`;
  if (/^(?:[-+*]|\d+[.)])[ \t]/.test(line)) return `\\${line}`;
  if (/^-{3,}[ \t]*$/.test(line)) return `\\${line}`;
  return line;
}

export class MarkdownToFluxMark {
  constructor() {
    this.rawHtmlBlocks = 0;
    this.rawHtmlInline = 0;
    this.linksWithTitle = 0;
    this.tables = 0;
  }

  convert(source) {
    const { markdown: prepared, tables } = this.extractTables(source);
    const document = parser.parse(prepared);
    let output = this.renderBlocks(document.firstChild, 0, 0).join('\n');
    for (const table of tables) {
      const placeholder = table.placeholder;
      const pattern = new RegExp(`^([ \\t]*)${placeholder}$`, 'm');
      output = output.replace(pattern, (_match, indent) => {
        const lines = [`${indent}@`];
        lines.push(`${indent}${TABS}- ${table.headers.join(' | ')}`);
        for (const row of table.rows) {
          lines.push(`${indent}${TABS}- ${row.join(' | ')}`);
        }
        return lines.join('\n');
      });
    }
    return `${output.replace(/\n{3,}/g, '\n\n').trimEnd()}\n`;
  }

  extractTables(source) {
    const tokens = markdown.parse(source, {});
    const tables = [];
    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.type !== 'table_open' || token.map === null) continue;
      const headers = [];
      const rows = [];
      let currentRow = [];
      let inHeader = false;
      for (let cursor = index + 1; cursor < tokens.length; cursor += 1) {
        const current = tokens[cursor];
        if (current.type === 'table_close') break;
        if (current.type === 'thead_open') {
          inHeader = true;
        } else if (current.type === 'thead_close') {
          inHeader = false;
        } else if (current.type === 'tr_open') {
          currentRow = [];
        } else if (current.type === 'th_open' || current.type === 'td_open') {
          const inline = tokens[cursor + 1];
          const value = inline?.type === 'inline' ? this.renderCell(inline.content) : '';
          if (current.type === 'th_open') headers.push(value);
          else currentRow.push(value);
        } else if (current.type === 'tr_close' && !inHeader && currentRow.length > 0) {
          rows.push(currentRow);
          currentRow = [];
        }
      }
      this.tables += 1;
      tables.push({
        start: token.map[0],
        end: token.map[1],
        placeholder: `FLUXTABLE${tables.length}`,
        headers,
        rows,
      });
    }
    if (tables.length === 0) return { markdown: source, tables };

    const lines = source.split('\n');
    for (const table of [...tables].sort((left, right) => right.start - left.start)) {
      const line = lines[table.start] ?? '';
      const pipe = line.indexOf('|');
      const prefix = pipe >= 0 ? line.slice(0, pipe) : '';
      const separator = prefix.includes('>') ? [] : [''];
      lines.splice(table.start, table.end - table.start, ...separator, `${prefix}${table.placeholder}`, '');
    }
    return { markdown: lines.join('\n'), tables };
  }

  renderCell(source) {
    const document = parser.parse(source);
    const paragraph = document.firstChild;
    return paragraph === null ? '' : this.renderInline(paragraph.firstChild).trim();
  }


  renderBlocks(first, depth, sectionDepth) {
    const blocks = [];
    const openSections = [];
    for (let node = first; node !== null; node = node.next) {
      if (node.type === 'heading') {
        while (
          openSections.length > 0 &&
          openSections[openSections.length - 1] >= node.level
        ) {
          openSections.pop();
        }
        const headingDepth = depth + openSections.length;
        const hashes = Math.max(
          1,
          node.level - (sectionDepth + openSections.length),
        );
        blocks.push({
          type: 'heading',
          lines: [
            `${TABS.repeat(headingDepth)}${'#'.repeat(hashes)} ${this.renderInline(node.firstChild)}`,
          ],
        });
        openSections.push(node.level);
        continue;
      }

      const contentDepth = depth + openSections.length;
      blocks.push({
        type: node.type,
        lines: this.renderBlock(node, contentDepth, sectionDepth + openSections.length),
      });
    }
    const lines = [];
    let previous = null;
    for (const block of blocks) {
      if (block.lines.length === 0) continue;
      if (
        lines.length > 0 &&
        previous !== 'code_block' &&
        previous !== 'html_block'
      ) {
        lines.push('');
      }
      lines.push(...block.lines);
      previous = block.type;
    }
    return lines;
  }

  renderBlock(node, depth, sectionDepth) {
    const indent = TABS.repeat(depth);
    switch (node.type) {
      case 'paragraph': {
        const content = this.renderInline(node.firstChild);
        return content.split('\n').map((line) => `${indent}${protectBlockStart(line)}`);
      }
      case 'block_quote': {
        const lines = [`${indent}>`];
        lines.push(...this.renderBlocks(node.firstChild, depth + 1, sectionDepth));
        return lines;
      }
      case 'list': {
        const lines = [];
        let index = 0;
        const ordered = node.listType === 'ordered';
        const start = node.listStart ?? 1;
        for (let item = node.firstChild; item !== null; item = item.next) {
          const marker = ordered ? `${start + index}.` : '-';
          const first = item.firstChild;
          if (first !== null && first.type === 'paragraph') {
            const content = this.renderInline(first.firstChild);
            if (!content.includes('\n')) {
              lines.push(`${indent}${marker} ${content}`);
              const rest = first.next;
              lines.push(
                ...this.renderBlocks(rest, depth + 1, sectionDepth),
              );
            } else {
              lines.push(`${indent}${marker}`);
              lines.push(
                ...this.renderBlocks(item.firstChild, depth + 1, sectionDepth),
              );
            }
          } else {
            lines.push(`${indent}${marker}`);
            lines.push(...this.renderBlocks(item.firstChild, depth + 1, sectionDepth));
          }
          index += 1;
        }
        return lines;
      }
      case 'code_block': {
        const language = (node.info ?? '').trim().split(/\s+/)[0]?.replace(/[^\w-]/g, '') ?? '';
        const lines = [`${indent}$${language.length > 0 ? ` ${language}` : ''}`];
        const content = node.literal.replace(/\n$/, '');
        for (const line of content.split('\n')) {
          lines.push(line.length === 0 ? '' : `${TABS.repeat(depth + 1)}${line}`);
        }
        return lines;
      }
      case 'html_block': {
        this.rawHtmlBlocks += 1;
        const lines = [`${indent}!html`];
        const content = node.literal.replace(/\n$/, '');
        for (const line of content.split('\n')) {
          lines.push(line.length === 0 ? '' : `${TABS.repeat(depth + 1)}${line}`);
        }
        return lines;
      }
      case 'thematic_break':
        return [`${indent}---`];
      default:
        return [];
    }
  }

  renderInline(first) {
    let result = '';
    for (let node = first; node !== null; node = node.next) {
      result += this.renderInlineNode(node);
    }
    return result;
  }

  renderInlineNode(node) {
    switch (node.type) {
      case 'text':
        return escapeFluxText(node.literal);
      case 'softbreak':
        return ' ';
      case 'linebreak':
        return '\n';
      case 'code':
        return `[${escapePipeContent(node.literal.replace(/\n/g, ' '))}|c]`;
      case 'strong':
        return `*${this.renderInline(node.firstChild)}*`;
      case 'emph':
        return `_${this.renderInline(node.firstChild)}_`;
      case 'html_inline':
        this.rawHtmlInline += 1;
        return `!${node.literal}`;
      case 'link':
        return this.renderLink(node);
      case 'image':
        return this.renderImage(node);
      default:
        return this.renderInline(node.firstChild);
    }
  }

  renderLink(node) {
    const label = this.renderInline(node.firstChild);
    const plainLabel = this.inlinePlainText(node.firstChild);
    const hasFormatting = this.hasFormatting(node.firstChild);
    const title = node.title ?? '';
    if (title.length > 0 || hasFormatting || node.destination === '') {
      if (title.length > 0) this.linksWithTitle += 1;
      const titleAttribute = title.length > 0
        ? ` title="${escapeAttribute(title)}"`
        : '';
      return `!<a href="${escapeAttribute(safeDestination(node.destination))}"${titleAttribute}>${label}!</a>`;
    }
    return `[${escapePipeContent(plainLabel)}|${escapePipeContent(fluxDestination(node.destination))}]`;
  }

  renderImage(node) {
    const alt = this.inlinePlainText(node.firstChild);
    const title = node.title ?? '';
    if (title.length > 0) {
      return `!<img src="${escapeAttribute(safeDestination(node.destination))}" alt="${escapeAttribute(alt)}" title="${escapeAttribute(title)}" />`;
    }
    return `![${escapePipeContent(safeDestination(node.destination))}|${escapePipeContent(alt)}]`;
  }

  hasFormatting(first) {
    for (let node = first; node !== null; node = node.next) {
      if (!['text', 'softbreak'].includes(node.type)) return true;
    }
    return false;
  }

  inlinePlainText(first) {
    let text = '';
    for (let node = first; node !== null; node = node.next) {
      if (node.type === 'text' || node.type === 'code' || node.type === 'html_inline') {
        text += node.literal;
      } else if (node.type === 'softbreak' || node.type === 'linebreak') {
        text += ' ';
      } else {
        text += this.inlinePlainText(node.firstChild);
      }
    }
    return text;
  }
}

function usage() {
  console.error('Usage: node tools/migrate-markdown.mjs <input.md> [--output <file.fx>] [--stdout]');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = args[0];
  if (inputPath === undefined) usage();
  const outputIndex = args.indexOf('--output');
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
  const toStdout = args.includes('--stdout') || outputPath === undefined;

  const absoluteInput = resolve(inputPath);
  const source = await readFile(absoluteInput, 'utf8');
  const converter = new MarkdownToFluxMark();
  const flux = converter.convert(source);

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
      'CommonMark migration notes:',
      `  raw HTML blocks preserved: ${converter.rawHtmlBlocks}`,
      `  raw inline HTML preserved: ${converter.rawHtmlInline}`,
      `  links with title converted through raw HTML: ${converter.linksWithTitle}`,
      `  GFM tables converted: ${converter.tables}`,
      '  Raw HTML output requires renderToHTML(..., { allowHtml: true }).',
      '  GFM task lists and footnotes are not converted.',
    ].join('\n'),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await main();
}
