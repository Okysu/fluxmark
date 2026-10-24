const INLINE_ELEMENTS = new Set([
  'A',
  'ABBR',
  'B',
  'BDI',
  'BDO',
  'CITE',
  'CODE',
  'DATA',
  'DFN',
  'EM',
  'I',
  'INPUT',
  'KBD',
  'MARK',
  'Q',
  'S',
  'SAMP',
  'SMALL',
  'SPAN',
  'STRONG',
  'SUB',
  'SUP',
  'TIME',
  'U',
  'VAR',
]);

function indentation(depth: number): string {
  return '  '.repeat(depth);
}

function openingTag(element: Element): string {
  const clone = element.cloneNode(false) as Element;
  const html = clone.outerHTML;
  return html.slice(0, html.indexOf('>') + 1);
}

function formatNode(node: ChildNode, depth: number): string[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const value = node.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    return value.length > 0 ? [`${indentation(depth)}${value}`] : [];
  }
  if (node.nodeType === Node.COMMENT_NODE) {
    return [`${indentation(depth)}<!--${node.textContent ?? ''}-->`];
  }
  if (!(node instanceof Element)) return [];

  const tag = node.tagName.toLowerCase();
  if (tag === 'pre' || tag === 'script' || tag === 'style') {
    return [`${indentation(depth)}${node.outerHTML}`];
  }

  const children = Array.from(node.childNodes);
  const containsBlock = children.some(
    (child) => child instanceof Element && !INLINE_ELEMENTS.has(child.tagName),
  );
  if (!containsBlock) return [`${indentation(depth)}${node.outerHTML}`];

  const lines = [`${indentation(depth)}${openingTag(node)}`];
  for (const child of children) lines.push(...formatNode(child, depth + 1));
  lines.push(`${indentation(depth)}</${tag}>`);
  return lines;
}

/** A small, dependency-free formatter for already-sanitized renderer output. */
export function formatFluxHtml(html: string): string {
  if (html.trim().length === 0 || typeof DOMParser === 'undefined') return html;
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  return Array.from(parsed.body.childNodes)
    .flatMap((node) => formatNode(node, 0))
    .join('\n');
}
