import { walkAST } from 'fluxmark';
import type {
  FluxBlockRule,
  FluxInlineToken,
  FluxPluginDefinition,
} from 'fluxmark';
import type { PlaygroundLocale } from './i18n';

function inlineText(tokens: FluxInlineToken[]): string {
  return tokens.map((token) => (token.type === 'break' ? ' ' : token.content)).join('');
}

export function slugifySectionTitle(value: string): string {
  const slug = value
    .normalize('NFKC')
    .toLocaleLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}\s_-]/gu, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || 'section';
}

const timelineRule: FluxBlockRule = {
  name: 'playground-timeline',
  priority: 220,
  parse(context) {
    const match = /^:::timeline(?:[\t ]+(.*))?$/.exec(context.line.content);
    if (match === null) return null;

    const entries: string[] = [];
    let cursor = context.index + 1;
    let closed = false;
    while (cursor < context.lines.length) {
      const line = context.lines[cursor];
      if (line === undefined) break;
      if (line.content.trim() === ':::' && line.indent === context.line.indent) {
        closed = true;
        cursor += 1;
        break;
      }
      if (line.raw.trim().length > 0 && line.indent <= context.line.indent) break;
      if (line.raw.trim().length > 0) entries.push(line.content.trim());
      cursor += 1;
    }

    const lastIndex = Math.max(context.index, cursor - 1);
    const lastLine = context.lines[lastIndex] ?? context.line;
    return {
      consumed: Math.max(1, cursor - context.index),
      node: {
        type: 'CustomBlock',
        name: 'timeline',
        content: entries.join('\n'),
        attributes: {
          title: match[1]?.trim() || 'Timeline',
          closed: String(closed),
        },
        children: [],
        line: context.line.number,
        column: context.line.indent + 1,
        indent: context.line.indent,
        range: {
          start: context.line.offset,
          end: lastLine.offset + lastLine.raw.length,
        },
      },
    };
  },
};

/**
 * A compact extension example covering block parsing, inline pipes, AST
 * transforms and semantic HTML overrides.
 */
export function createPlaygroundPlugin(locale: PlaygroundLocale): FluxPluginDefinition {
  const labels =
    locale === 'zh'
      ? {
          kicker: '自定义块',
          timeline: '时间线',
          anchor: '链接到本节',
          planned: '计划中',
        }
      : {
          kicker: 'CUSTOM BLOCK',
          timeline: 'Timeline',
          anchor: 'Link to',
          planned: 'planned',
        };

  return {
    name: 'playground-extension-kit',
    blockRules: [timelineRule],
    pipeModifiers: {
      kbd: (_modifier, context) => {
        context.attributes['flux-pipe'] = 'kbd';
        return true;
      },
      badge: (_modifier, context) => {
        context.attributes['flux-pipe'] = 'badge';
        return true;
      },
      spoiler: (_modifier, context) => {
        context.attributes['flux-pipe'] = 'spoiler';
        return true;
      },
    },
    astTransforms: [
      (document) => {
        const usedSlugs = new Map<string, number>();
        walkAST(document, {
          Section: {
            enter(section) {
              const base = slugifySectionTitle(inlineText(section.title));
              const occurrence = usedSlugs.get(base) ?? 0;
              usedSlugs.set(base, occurrence + 1);
              section.id = occurrence === 0 ? base : `${base}-${occurrence + 1}`;
            },
          },
        });
      },
    ],
    htmlRenderers: {
      Section(node, childrenHtml, helper) {
        const id = node.id ?? slugifySectionTitle(inlineText(node.title));
        const level = Math.min(6, Math.max(1, node.level));
        const escapedId = helper.escapeAttribute(id);
        return `<section class="fx-section fx-level-${level} playground-section" id="${escapedId}" data-source-line="${node.line}"><h${level} class="fx-heading"><a class="playground-anchor" href="#${escapedId}" aria-label="${helper.escapeAttribute(`${labels.anchor} ${id}`)}"><span aria-hidden="true">#</span></a>${helper.renderInline(node.title)}</h${level}>${childrenHtml}</section>`;
      },
      CustomBlock(node, childrenHtml, helper) {
        if (node.name !== 'timeline') return helper.defaultRender();
        const title = helper.escapeHtml(node.attributes['title'] ?? labels.timeline);
        const entries = node.content.split('\n').filter((entry) => entry.trim().length > 0);
        const items = entries
          .map((entry, index) => {
            const separator = entry.indexOf('|');
            const label = separator >= 0 ? entry.slice(0, separator).trim() : entry.trim();
            const status =
              separator >= 0 ? entry.slice(separator + 1).trim() : labels.planned;
            const normalized = status
              .toLocaleLowerCase()
              .replace(/[^\p{Letter}\p{Number}_-]+/gu, '-');
            return `<li class="playground-timeline-item"><span class="playground-timeline-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span class="playground-timeline-label">${helper.escapeHtml(label)}</span><span class="playground-timeline-status" data-state="${helper.escapeAttribute(normalized || 'planned')}">${helper.escapeHtml(status)}</span></li>`;
          })
          .join('');
        return `<div class="playground-timeline" data-source-line="${node.line}"><div class="playground-timeline-heading"><span class="playground-timeline-kicker">${labels.kicker}</span><h4>${title}</h4></div><ol>${items}</ol>${childrenHtml}</div>`;
      },
    },
  };
}
