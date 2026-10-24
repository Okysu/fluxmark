import type {
  FluxBlockNode,
  FluxDocument,
  FluxHtmlNodeOverride,
  FluxHtmlRendererOptions,
  FluxHtmlRendererOverrides,
  FluxInlineToken,
  FluxNode,
} from '../types';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

export function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/[`]/g, '&#96;');
}

/** Allow relative URLs and a small explicit protocol whitelist. */
export function safeFluxUrl(value: string): string | null {
  const url = value.trim();
  if (url.length === 0 || /[\u0000-\u0020\u007f]/.test(url)) return null;
  const scheme = /^([a-zA-Z][a-zA-Z\d+.-]*):/.exec(url)?.[1];
  if (scheme !== undefined) {
    return ALLOWED_PROTOCOLS.has(`${scheme.toLowerCase()}:`) ? url : null;
  }
  if (url.startsWith('//') || url.startsWith('\\')) return null;
  return url;
}

function childrenOf(node: FluxNode): FluxBlockNode[] | null {
  switch (node.type) {
    case 'Document':
    case 'Section':
    case 'Callout':
    case 'List':
    case 'ListItem':
    case 'CustomBlock':
      return node.children;
    default:
      return null;
  }
}

function safeClassToken(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
  return normalized.length > 0 ? normalized : 'default';
}

export class FluxHtmlRenderer {
  private readonly overrides: FluxHtmlRendererOverrides;
  private readonly prefix: string;
  private readonly documentWrapper: boolean;
  private readonly allowHtml: boolean;

  public constructor(options: FluxHtmlRendererOptions = {}) {
    this.overrides = { ...(options.overrides ?? {}) };
    this.prefix = safeClassToken(options.classPrefix ?? 'fx');
    this.documentWrapper = options.documentWrapper ?? true;
    this.allowHtml = options.allowHtml ?? false;
  }

  public render(document: FluxDocument): string {
    return this.renderNode(document);
  }

  public renderInline(tokens: FluxInlineToken[]): string {
    if (this.overrides.InlineToken === undefined) {
      let html = '';
      for (const token of tokens) html += this.renderTokenDefault(token);
      return html;
    }
    return tokens.map((token) => this.renderToken(token)).join('');
  }

  private renderChildren(children: FluxBlockNode[]): string {
    let html = '';
    for (const child of children) html += this.renderNode(child);
    return html;
  }

  private renderNode(node: FluxNode): string {
    const children = childrenOf(node);
    const childrenHtml = children === null ? '' : this.renderChildren(children);
    const override = this.overrides[node.type] as
      | FluxHtmlNodeOverride<FluxNode>
      | undefined;
    if (override === undefined) return this.renderDefault(node, childrenHtml);
    return override(node, childrenHtml, {
      escapeHtml,
      escapeAttribute,
      safeUrl: safeFluxUrl,
      renderInline: (tokens) => this.renderInline(tokens),
      renderChildren: (nodes) => this.renderChildren(nodes),
      defaultRender: () => this.renderDefault(node, childrenHtml),
    });
  }

  private renderToken(token: FluxInlineToken): string {
    const override = this.overrides.InlineToken;
    if (override === undefined) return this.renderTokenDefault(token);
    return override(
      token,
      (target: FluxInlineToken = token) => this.renderTokenDefault(target),
      {
        escapeHtml,
        escapeAttribute,
        safeUrl: safeFluxUrl,
        renderInline: (tokens) => this.renderInline(tokens),
        renderChildren: (nodes) => this.renderChildren(nodes),
      },
    );
  }

  private renderTokenDefault(token: FluxInlineToken): string {
    if (token.type === 'break') return '<br />';
    if (token.type === 'html') {
      return this.allowHtml
        ? token.content
        : `<span class="${this.prefix}-raw-html">${escapeHtml(token.content)}</span>`;
    }
    if (token.type === 'image') {
      const src = safeFluxUrl(token.attributes.src ?? '');
      if (src === null) {
        const fallback = token.content.length > 0
          ? token.content
          : token.attributes.src ?? '';
        return `<span class="${this.prefix}-image-fallback">${escapeHtml(fallback)}</span>`;
      }
      return `<img class="${this.prefix}-image" src="${escapeAttribute(src)}" alt="${escapeAttribute(token.content)}" loading="lazy" decoding="async" />`;
    }
    let html = escapeHtml(token.content);
    const { style } = token;
    const custom = style.customModifiers.length === 0
      ? null
      : new Set(style.customModifiers.map((modifier) => modifier.toLowerCase()));

    if (token.type === 'code' || style.code) {
      html = `<code class="${this.prefix}-inline-code">${html}</code>`;
    }
    if (custom?.has('kbd')) html = `<kbd class="${this.prefix}-kbd">${html}</kbd>`;
    if (style.bold) html = `<strong>${html}</strong>`;
    if (style.italic) html = `<em>${html}</em>`;
    if (style.underline) html = `<u>${html}</u>`;
    if (style.strike) html = `<s>${html}</s>`;
    if (style.mark) html = `<mark>${html}</mark>`;
    if (custom?.has('badge')) {
      html = `<span class="${this.prefix}-badge">${html}</span>`;
    }
    if (custom?.has('spoiler')) {
      html = `<span class="${this.prefix}-spoiler" role="button" tabindex="0" aria-label="Spoiler">${html}</span>`;
    }

    if (style.href !== null) {
      const href = safeFluxUrl(style.href);
      if (href !== null) {
        const external = /^https?:\/\//i.test(href);
        const target = external
          ? ' target="_blank" rel="noopener noreferrer nofollow"'
          : '';
        html = `<a class="${this.prefix}-link" href="${escapeAttribute(href)}"${target}>${html}</a>`;
      }
    }

    if (style.tooltip !== null) {
      const tooltip = escapeAttribute(style.tooltip);
      html = `<span class="${this.prefix}-tooltip" data-flux-tooltip="${tooltip}" tabindex="0">${html}</span>`;
    }

    if (style.customModifiers.length > 0) {
      const unknownModifiers = style.customModifiers.filter(
        (modifier) => !['kbd', 'badge', 'spoiler'].includes(modifier.toLowerCase()),
      );
      if (unknownModifiers.length > 0) {
        html = `<span data-flux-modifiers="${escapeAttribute(unknownModifiers.join(' '))}">${html}</span>`;
      }
    }

    const color = style.color !== null && /^#(?:[\da-fA-F]{3}|[\da-fA-F]{6})$/.test(style.color)
      ? ` style="color:${style.color}"`
      : '';
    if (color.length > 0) html = `<span${color}>${html}</span>`;
    return html;
  }

  private renderDefault(node: FluxNode, childrenHtml: string): string {
    const p = this.prefix;
    switch (node.type) {
      case 'Document':
        return this.documentWrapper
          ? `<article class="${p}-document">${childrenHtml}</article>`
          : childrenHtml;
      case 'Section': {
        const level = Math.max(1, Math.min(6, node.level));
        const id = node.id === undefined ? '' : ` id="${escapeAttribute(node.id)}"`;
        return `<section class="${p}-section ${p}-level-${level}"${id}><h${level} class="${p}-heading">${this.renderInline(node.title)}</h${level}>${childrenHtml}</section>`;
      }
      case 'Paragraph':
        return `<p class="${p}-paragraph">${this.renderInline(node.tokens)}</p>`;
      case 'Callout': {
        const variant = safeClassToken(node.variant);
        const title = node.title.length > 0
          ? `<div class="${p}-callout-title">${this.renderInline(node.title)}</div>`
          : '';
        const tag = node.variant === 'quote' ? 'blockquote' : 'aside';
        return `<${tag} class="${p}-callout ${p}-callout-${variant}" data-variant="${escapeAttribute(node.variant)}">${title}<div class="${p}-callout-content">${childrenHtml}</div></${tag}>`;
      }
      case 'CodeBlock': {
        const language = safeClassToken(node.language || 'text');
        const label = node.language.length > 0 ? escapeHtml(node.language) : 'text';
        return `<div class="${p}-code-block" data-language="${escapeAttribute(node.language)}"><div class="${p}-code-header"><span class="${p}-window-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${label}</span></div><pre><code class="language-${language}">${escapeHtml(node.code)}</code></pre></div>`;
      }
      case 'DataTable': {
        const caption = node.title.length > 0
          ? `<figcaption>${this.renderInline(node.title)}</figcaption>`
          : '';
        const head = node.columns
          .map((column) => `<th scope="col">${escapeHtml(column)}</th>`)
          .join('');
        const rows = node.rows
          .map((row) => {
            const cells = node.columns
              .map((column) => {
                const cell = row.cells[column];
                return `<td data-column="${escapeAttribute(column)}">${cell === undefined ? '' : this.renderInline(cell.tokens)}</td>`;
              })
              .join('');
            return `<tr data-line="${row.line}">${cells}</tr>`;
          })
          .join('');
        return `<figure class="${p}-datatable-wrapper">${caption}<div class="${p}-table-scroll"><table class="${p}-datatable"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div></figure>`;
      }
      case 'List': {
        const tag = node.ordered ? 'ol' : 'ul';
        const kind = node.ordered ? 'ordered' : 'unordered';
        const start = node.ordered && node.start !== 1 ? ` start="${node.start}"` : '';
        return `<${tag} class="${p}-list ${p}-list-${kind}"${start}>${childrenHtml}</${tag}>`;
      }
      case 'ListItem': {
        const task = node.checked !== null;
        const checkbox = task
          ? `<input class="${p}-task-checkbox" type="checkbox" data-flux-task data-flux-line="${node.line}" data-flux-offset="${node.taskMarkerOffset ?? ''}" aria-label="Toggle task on line ${node.line}"${node.checked ? ' checked' : ''} />`
          : '';
        return `<li class="${p}-list-item${task ? ` ${p}-task-item` : ''}" data-line="${node.line}">${checkbox}${childrenHtml}</li>`;
      }
      case 'HorizontalRule':
        return `<hr class="${p}-divider" />`;
      case 'RawHtml':
        return this.allowHtml
          ? node.content
          : `<pre class="${p}-raw-html">${escapeHtml(node.content)}</pre>`;
      case 'CustomBlock': {
        const content = node.content.length > 0
          ? `<pre class="${p}-custom-content">${escapeHtml(node.content)}</pre>`
          : '';
        return `<div class="${p}-custom-block" data-name="${escapeAttribute(node.name)}">${content}${childrenHtml}</div>`;
      }
    }
  }
}

export function toHTML(
  document: FluxDocument,
  options: FluxHtmlRendererOptions = {},
): string {
  return new FluxHtmlRenderer(options).render(document);
}
