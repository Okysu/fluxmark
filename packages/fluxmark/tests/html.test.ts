import { describe, expect, it } from 'vitest';
import { FluxMark } from '../src/compiler';
import { FluxHtmlRenderer, safeFluxUrl, toHTML } from '../src/renderers/html';
import { parseFluxMarkDocument, createFluxNodeBase } from '../src/parser';
import { walkAST } from '../src/walker';
import type { FluxPluginDefinition, FluxSection } from '../src/types';

describe('FluxHtmlRenderer and compiler plugins', () => {
  it('renders semantic blocks and interactive task metadata', () => {
    const ast = parseFluxMarkDocument(`# Title
  > [tip] Hello
    World
  * [x] Done
  @ Stats
    - Name: Core | State: [Stable|badge]`);
    const html = toHTML(ast);
    expect(html).toContain('<section class="fx-section fx-level-1">');
    expect(html).toContain('<aside class="fx-callout fx-callout-tip"');
    expect(html).toContain('data-flux-task');
    expect(html).toContain('data-flux-line="4"');
    expect(html).toContain('<table class="fx-datatable">');
    expect(html).toContain('<span class="fx-badge">Stable</span>');
  });

  it('only passes raw HTML through when explicitly allowed', () => {
    const ast = parseFluxMarkDocument('!html\n  <div class="raw">unsafe</div>\n\nA !<span class="x">raw!</span> tag');
    expect(toHTML(ast)).not.toContain('<div class="raw">');
    expect(toHTML(ast)).toContain('&lt;div class=&quot;raw&quot;&gt;');
    const trusted = new FluxHtmlRenderer({ allowHtml: true }).render(ast);
    expect(trusted).toContain('<div class="raw">unsafe</div>');
    expect(trusted).toContain('<span class="x">');
  });

  it('escapes markup and blocks dangerous URL protocols', () => {
    const html = toHTML(parseFluxMarkDocument('[<img src=x onerror=alert(1)>|b]'));
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(safeFluxUrl('javascript:alert(1)')).toBeNull();
    expect(safeFluxUrl('JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeFluxUrl('https://example.com')).toBe('https://example.com');
    expect(safeFluxUrl('/guide')).toBe('/guide');
  });

  it('renders safe images and escapes their alt text', () => {
    const html = toHTML(parseFluxMarkDocument('![https://example.com/architecture.png|A <diagram>]'));
    expect(html).toContain('class="fx-image"');
    expect(html).toContain('src="https://example.com/architecture.png"');
    expect(html).toContain('alt="A &lt;diagram&gt;"');
    const blocked = toHTML(parseFluxMarkDocument('![javascript:alert(1)|bad]'));
    expect(blocked).not.toContain('<img');
    expect(blocked).toContain('fx-image-fallback');
  });

  it('lets block and inline overrides wrap default rendering', () => {
    const ast = parseFluxMarkDocument('# Hello\n  [Ctrl+C|kbd]');
    const html = new FluxHtmlRenderer({
      overrides: {
        Section(node, _children, helper) {
          return `<div class="section-shell" data-level="${node.level}">${helper.defaultRender()}</div>`;
        },
        InlineToken(token, defaultRender) {
          return token.style.customModifiers.includes('kbd')
            ? `<span class="key-shell">${defaultRender()}</span>`
            : defaultRender();
        },
      },
    }).render(ast);
    expect(html).toContain('class="section-shell" data-level="1"');
    expect(html).toContain('<span class="key-shell"><kbd class="fx-kbd">Ctrl+C</kbd></span>');
  });

  it('runs block, pipe, AST and HTML plugin lifecycle hooks', () => {
    const plugin: FluxPluginDefinition = {
      name: 'showcase',
      blockRules: [
        {
          name: 'math',
          parse({ line }) {
            if (!line.content.startsWith('! math ')) return null;
            return {
              node: {
                ...createFluxNodeBase(line),
                type: 'CustomBlock',
                name: 'math',
                content: line.content.slice(7),
                attributes: {},
                children: [],
              },
            };
          },
        },
      ],
      pipeModifiers: {
        badge(modifier, { attributes }) {
          attributes.kind = modifier;
          return true;
        },
      },
      astTransforms: [
        (document) => {
          walkAST(document, {
            Section: {
              enter(node: FluxSection) {
                node.id = node.title.map((token) => token.content).join('').toLowerCase();
              },
            },
          });
        },
      ],
      htmlRenderers: {
        CustomBlock(node, _children, helper) {
          return `<output data-kind="math">${helper.escapeHtml(node.content)}</output>`;
        },
        InlineToken(token, defaultRender) {
          return token.attributes.kind === 'badge'
            ? `<data value="badge">${defaultRender()}</data>`
            : defaultRender();
        },
      },
    };
    const flux = new FluxMark().use(plugin);
    const html = flux.renderToHTML('# Intro\n  [v1|badge]\n! math x^2');
    expect(html).toContain('id="intro"');
    expect(html).toContain('<data value="badge"><span class="fx-badge">v1</span></data>');
    expect(html).toContain('<output data-kind="math">x^2</output>');
  });

  it('supports typed plugin factories and registered callout variants', () => {
    const factory = (options: { variant: string }) => ({
      calloutVariants: [options.variant],
    });
    const flux = new FluxMark().use(factory, { variant: 'info' });
    const ast = flux.parse('> [info] Registered\n  Body');
    expect(ast.children[0]).toMatchObject({ type: 'Callout', variant: 'info' });
  });

  it('allows instance overrides to take precedence over plugin renderers', () => {
    const flux = new FluxMark().use({
      htmlRenderers: {
        Paragraph() {
          return '<p>plugin</p>';
        },
      },
    });
    const html = flux.renderToHTML('Text', {
      overrides: {
        Paragraph(_node, _children, helper) {
          return `<main>${helper.defaultRender()}</main>`;
        },
      },
    });
    expect(html).toBe('<article class="fx-document"><main><p class="fx-paragraph">Text</p></main></article>');
  });
});
