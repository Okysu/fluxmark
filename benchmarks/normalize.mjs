import MarkdownIt from 'markdown-it';

const markdown = new MarkdownIt({ html: true });

const SAFE_CHARACTERS = new Map([
  ['*', '∗'],
  ['_', '＿'],
  ['=', '＝'],
  ['~', '～'],
  ['[', '［'],
  [']', '］'],
  ['|', '｜'],
  ['`', 'ˋ'],
  ['<', '‹'],
  ['>', '›'],
  ['\\', '＼'],
  ['#', '＃'],
  ['@', '＠'],
  ['$', '＄'],
  ['-', '‐'],
  ['+', '＋'],
]);

const INLINE_SPACE = ' ';

function stripNonContent(source) {
  return source
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/^:::[^\n]*$/gm, '')
    .replace(/^(?:import|export)\s+.*$/gm, '');
}

function sanitizeText(value) {
  let output = '';
  for (const character of value.replace(/\s+/g, ' ')) {
    output += SAFE_CHARACTERS.get(character) ?? character;
  }
  return output;
}

function normalizeHref(value) {
  if (typeof value !== 'string') return null;
  const href = value.trim();
  if (!/^(?:https?:\/\/|mailto:)/i.test(href)) return null;
  return href.replace(/[<>()\s,|]/g, (character) => encodeURIComponent(character));
}

function normalizeImageSrc(value) {
  if (typeof value !== 'string') return null;
  const src = value.trim();
  if (src.length === 0 || /[\u0000-\u0020\u007f]/.test(src)) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(src) && !/^https?:\/\//i.test(src)) return null;
  return src.replace(/[<>()\s,|]/g, (character) => encodeURIComponent(character));
}

function sameStyle(left, right) {
  return (
    left.bold === right.bold &&
    left.italic === right.italic &&
    left.strike === right.strike &&
    left.code === right.code &&
    left.image === right.image &&
    left.href === right.href
  );
}

function pushRun(runs, text, style) {
  if (text.length === 0) return;
  const last = runs[runs.length - 1];
  if (last !== undefined && sameStyle(last, style)) {
    last.text += text;
  } else {
    runs.push({ text, ...style });
  }
}

function parseInline(token, stats) {
  const runs = [];
  const active = { bold: 0, italic: 0, strike: 0, href: null };
  const style = () => ({
    bold: active.bold > 0,
    italic: active.italic > 0,
    strike: active.strike > 0,
    code: false,
    image: false,
    href: active.href,
  });

  function walk(children) {
    for (const child of children) {
      if (child.type === 'text') {
        pushRun(runs, sanitizeText(child.content), style());
      } else if (child.type === 'code_inline') {
        const content = child.content;
        if (content.includes('`')) {
          stats.inlineCodeWithBacktick += 1;
          pushRun(runs, sanitizeText(content), { ...style(), code: false });
        } else {
          pushRun(runs, content, { ...style(), code: true });
        }
      } else if (child.type === 'strong_open') {
        active.bold += 1;
      } else if (child.type === 'strong_close') {
        active.bold -= 1;
      } else if (child.type === 'em_open') {
        active.italic += 1;
      } else if (child.type === 'em_close') {
        active.italic -= 1;
      } else if (child.type === 's_open') {
        active.strike += 1;
      } else if (child.type === 's_close') {
        active.strike -= 1;
      } else if (child.type === 'link_open') {
        const href = normalizeHref(child.attrGet('href'));
        if (href !== null) {
          active.href = href;
        } else {
          stats.relativeLinks += 1;
        }
      } else if (child.type === 'link_close') {
        active.href = null;
      } else if (child.type === 'image') {
        stats.images += 1;
        const alt = sanitizeText(child.content);
        const href = normalizeImageSrc(child.attrGet('src'));
        if (href !== null) {
          pushRun(runs, alt, { ...style(), image: true, href });
        } else if (alt.length > 0) {
          pushRun(runs, alt, style());
        }
      } else if (child.type === 'softbreak' || child.type === 'hardbreak') {
        pushRun(runs, INLINE_SPACE, style());
      } else if (child.type === 'html_inline') {
        stats.inlineHtml += 1;
      } else if (child.children !== null) {
        walk(child.children);
      }
    }
  }

  walk(token.children ?? []);
  return runs;
}

function findClose(tokens, openIndex, openType, closeType) {
  let depth = 1;
  for (let index = openIndex + 1; index < tokens.length; index += 1) {
    if (tokens[index].type === openType) depth += 1;
    else if (tokens[index].type === closeType) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return tokens.length;
}

function parseList(tokens, openIndex, ordered, end, stats) {
  const closeType = ordered ? 'ordered_list_close' : 'bullet_list_close';
  const close = findClose(tokens, openIndex, tokens[openIndex].type, closeType);
  const items = [];
  let index = openIndex + 1;
  while (index < close && index < end) {
    const token = tokens[index];
    if (token.type === 'list_item_open') {
      const itemClose = findClose(tokens, index, 'list_item_open', 'list_item_close');
      const blocks = parseBlocks(tokens, index + 1, itemClose, stats);
      items.push({ blocks });
      index = itemClose + 1;
    } else {
      index += 1;
    }
  }
  return {
    block: { type: 'list', ordered, items },
    next: close + 1,
  };
}

function parseTable(tokens, openIndex, stats) {
  stats.tables += 1;
  const close = findClose(tokens, openIndex, 'table_open', 'table_close');
  const headers = [];
  const rows = [];
  let cells = [];
  let inHeader = false;
  for (let index = openIndex + 1; index < close; index += 1) {
    const token = tokens[index];
    if (token.type === 'thead_open') {
      inHeader = true;
    } else if (token.type === 'thead_close') {
      inHeader = false;
    } else if (token.type === 'tr_open') {
      cells = [];
    } else if (token.type === 'th_open') {
      const inline = tokens[index + 1];
      headers.push(inline?.type === 'inline' ? parseInline(inline, stats) : []);
    } else if (token.type === 'td_open') {
      const inline = tokens[index + 1];
      cells.push(inline?.type === 'inline' ? parseInline(inline, stats) : []);
    } else if (token.type === 'tr_close' && !inHeader && cells.length > 0) {
      rows.push(cells);
      cells = [];
    }
  }
  return {
    block: { type: 'table', headers, rows },
    next: close + 1,
  };
}

function parseBlocks(tokens, start, end, stats) {
  const blocks = [];
  let index = start;
  while (index < end) {
    const token = tokens[index];
    if (token.type === 'heading_open') {
      const inline = tokens[index + 1];
      const level = Number(token.tag.slice(1));
      blocks.push({
        type: 'heading',
        level,
        runs: inline?.type === 'inline' ? parseInline(inline, stats) : [],
      });
      index += 3;
    } else if (token.type === 'paragraph_open') {
      const inline = tokens[index + 1];
      blocks.push({
        type: 'paragraph',
        runs: inline?.type === 'inline' ? parseInline(inline, stats) : [],
      });
      index += 3;
    } else if (token.type === 'fence' || token.type === 'code_block') {
      const language =
        token.type === 'fence'
          ? (token.info.trim().split(/\s+/)[0] ?? '').replace(/[^\w-]/g, '')
          : '';
      blocks.push({ type: 'code', language, content: token.content.replace(/\n$/, '') });
      index += 1;
    } else if (token.type === 'blockquote_open') {
      const close = findClose(tokens, index, 'blockquote_open', 'blockquote_close');
      blocks.push({
        type: 'quote',
        blocks: parseBlocks(tokens, index + 1, close, stats),
      });
      index = close + 1;
    } else if (token.type === 'bullet_list_open' || token.type === 'ordered_list_open') {
      const list = parseList(tokens, index, token.type === 'ordered_list_open', end, stats);
      blocks.push(list.block);
      index = list.next;
    } else if (token.type === 'table_open') {
      const table = parseTable(tokens, index, stats);
      blocks.push(table.block);
      index = table.next;
    } else if (token.type === 'html_block') {
      stats.htmlBlocks += 1;
      index += 1;
    } else if (token.type === 'hr') {
      blocks.push({ type: 'hr' });
      index += 1;
    } else {
      index += 1;
    }
  }
  return blocks;
}

export function normalizeMarkdown(source) {
  const stats = {
    tables: 0,
    images: 0,
    htmlBlocks: 0,
    inlineHtml: 0,
    relativeLinks: 0,
    inlineCodeWithBacktick: 0,
  };
  const tokens = markdown.parse(stripNonContent(source), {});
  const blocks = parseBlocks(tokens, 0, tokens.length, stats);
  return { blocks, stats };
}

function inlineMarkdown(runs) {
  return runs
    .map((run) => {
      if (run.image) {
        return run.href === null ? run.text : `![${run.text}](<${run.href}>)`;
      }
      let value = run.text;
      if (run.code) value = `\`${value}\``;
      if (run.bold) value = `**${value}**`;
      if (run.italic) value = `_${value}_`;
      if (run.strike) value = `~~${value}~~`;
      if (run.href !== null) value = `[${value}](<${run.href}>)`;
      return value;
    })
    .join('');
}

function inlineFluxMark(runs) {
  return runs
    .map((run) => {
      if (run.image) {
        if (run.href === null) return run.text;
        return run.text.length > 0 ? `![${run.href}|${run.text}]` : `![${run.href}]`;
      }
      const styles = [];
      if (run.bold) styles.push('b');
      if (run.italic) styles.push('i');
      if (run.strike) styles.push('s');
      if (run.code) styles.push('c');
      if (run.href !== null) styles.push(run.href);
      if (styles.length === 0) return run.text;
      if (run.code && styles.length === 1) return `\`${run.text}\``;
      if (!run.code && run.href === null) {
        if (run.bold && !run.italic && !run.strike) return `*${run.text}*`;
        if (run.italic && !run.bold && !run.strike) return `_${run.text}_`;
        if (run.strike && !run.bold && !run.italic) return `~${run.text}~`;
      }
      return `[${run.text}|${styles.join(',')}]`;
    })
    .join('');
}

function tableHeaders(runs, index) {
  const text = runs.map((run) => run.text).join('').trim();
  return (text.length > 0 ? text : `Column ${index + 1}`).replace(/:/g, '：');
}

function fenceFor(content) {
  let length = 3;
  const runs = content.match(/`+/g) ?? [];
  for (const run of runs) length = Math.max(length, run.length + 1);
  return '`'.repeat(length);
}

function indentLines(value, prefix) {
  return value
    .split('\n')
    .map((line) => (line.length > 0 ? `${prefix}${line}` : ''))
    .join('\n');
}

function renderBlocks(blocks, dialect, depth = 0) {
  const indent = dialect === 'md' ? '  '.repeat(depth) : '\t'.repeat(depth);
  const lines = [];
  const inline = dialect === 'md' ? inlineMarkdown : inlineFluxMark;

  for (const block of blocks) {
    if (block.type === 'heading') {
      lines.push(`${indent}${'#'.repeat(block.level)} ${inline(block.runs)}`);
    } else if (block.type === 'paragraph') {
      const text = inline(block.runs).trim();
      if (text.length > 0) lines.push(`${indent}${text}`);
    } else if (block.type === 'hr') {
      lines.push(`${indent}---`);
    } else if (block.type === 'code') {
      if (dialect === 'md') {
        const fence = fenceFor(block.content);
        lines.push(`${indent}${fence}${block.language}`);
        lines.push(indentLines(block.content, indent));
        lines.push(`${indent}${fence}`);
      } else {
        lines.push(`${indent}$${block.language.length > 0 ? ` ${block.language}` : ''}`);
        lines.push(indentLines(block.content, `${indent}\t`));
      }
    } else if (block.type === 'table') {
      const headers = block.headers.map((runs, index) => tableHeaders(runs, index));
      if (dialect === 'md') {
        lines.push(`${indent}| ${headers.join(' | ')} |`);
        lines.push(`${indent}| ${headers.map(() => '---').join(' | ')} |`);
        for (const row of block.rows) {
          const cells = headers.map((_header, index) => inline(row[index] ?? []).trim());
          lines.push(`${indent}| ${cells.join(' | ')} |`);
        }
      } else {
        const rowIndent = `${indent}\t`;
        lines.push(`${indent}@`);
        if (headers.length < 2) {
          for (const row of block.rows) {
            const fields = headers.map(
              (header, index) => `${header}: ${inline(row[index] ?? []).trim()}`,
            );
            lines.push(`${rowIndent}- ${fields.join(' | ')}`);
          }
        } else {
          lines.push(`${rowIndent}- ${headers.join(' | ')}`);
          for (const row of block.rows) {
            const cells = headers.map((_header, index) => inline(row[index] ?? []).trim());
            lines.push(`${rowIndent}- ${cells.join(' | ')}`);
          }
        }
      }
    } else if (block.type === 'quote') {
      if (dialect === 'md') {
        const content = renderBlocks(block.blocks, 'md', depth);
        for (const line of content.split('\n')) {
          lines.push(line.length > 0 ? `${indent}> ${line.slice(indent.length)}` : '>');
        }
      } else {
        const first = block.blocks[0];
        if (first?.type === 'paragraph') {
          lines.push(`${indent}> ${inline(first.runs)}`);
          lines.push(renderBlocks(block.blocks.slice(1), 'flux', depth + 1));
        } else {
          lines.push(`${indent}>`);
          lines.push(renderBlocks(block.blocks, 'flux', depth + 1));
        }
      }
    } else if (block.type === 'list') {
      block.items.forEach((item, itemIndex) => {
        const marker = block.ordered ? `${itemIndex + 1}. ` : '- ';
        const first = item.blocks[0];
        if (first?.type === 'paragraph') {
          lines.push(`${indent}${marker}${inline(first.runs).trim()}`);
          const rest = renderBlocks(item.blocks.slice(1), dialect, depth + 1);
          if (rest.trim().length > 0) lines.push(rest);
        } else {
          lines.push(`${indent}${marker.trimEnd()}`);
          const content = renderBlocks(item.blocks, dialect, depth + 1);
          if (content.trim().length > 0) lines.push(content);
        }
      });
    }
    lines.push('');
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}

export function renderNormalizedMarkdown(blocks) {
  return renderBlocks(blocks, 'md');
}

export function renderNormalizedFluxMark(blocks) {
  return renderBlocks(blocks, 'flux');
}
