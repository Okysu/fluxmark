import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MarkdownToFluxMark } from './migrate-markdown.mjs';
import { parseFluxMark, renderToHTML } from '../packages/fluxmark/dist/index.js';

const fixture = `Reference
=========

A **strong** and *em* with \`code | ]\`, [ref][id], [title](https://e.test "T"), [relative](docs/page.md), [anchor](#install), ![alt](https://e.test/a.png "I"), and <span class="x">html</span>.

[id]: https://e.test/ref "R"

> quote

1. one
   - nested

\`\`\`js
const x = 1;
\`\`\`

<div class="raw">
  <b>HTML</b>
</div>

Hard break.\\
Next line with \\*literal\\* and \\| pipe.
`;

test('converts CommonMark structure, raw HTML and escapes into parseable FluxMark', () => {
  const converter = new MarkdownToFluxMark();
  const flux = converter.convert(fixture);
  assert.match(flux, /!html/);
  assert.match(flux, /!<span class="x">/);
  assert.match(flux, /!<a href="https:\/\/e\.test\/ref" title="R">/);
  assert.match(flux, /\\\*literal\\\*/);
  assert.ok(converter.rawHtmlBlocks >= 1);
  assert.ok(converter.rawHtmlInline >= 2);

  const ast = parseFluxMark(flux);
  assert.deepEqual(ast.issues, []);
  const html = renderToHTML(ast, { allowHtml: true });
  assert.match(html, /<h1 class="fx-heading">Reference<\/h1>/);
  assert.match(html, /<span class="x">html<\/span>/);
  assert.match(html, /<div class="raw">/);
  assert.match(html, /<a href="https:\/\/e\.test\/ref" title="R">ref<\/a>/);
  assert.match(html, /<a class="fx-link" href="docs\/page\.md">relative<\/a>/);
  assert.match(html, /<a class="fx-link" href="#install">anchor<\/a>/);
  assert.match(html, /\*literal\*/);
  assert.match(html, /\| pipe/);
});

test('converts GFM tables, including nested tables', () => {
  const source = '| A | B |\n| --- | --- |\n| 1 | 2 |\n\n> | C | D |\n> | --- | --- |\n> | 3 | 4 |';
  const converter = new MarkdownToFluxMark();
  const flux = converter.convert(source);
  assert.equal(converter.tables, 2);
  const html = renderToHTML(parseFluxMark(flux), { allowHtml: true });
  assert.match(html, /<th scope="col">A<\/th>/);
  assert.match(html, /<td data-column="B">2<\/td>/);
  assert.match(html, /<blockquote class="fx-callout fx-callout-quote"/);
  assert.match(html, /<th scope="col">C<\/th>/);
});

test('escapes raw HTML by default', () => {
  const converter = new MarkdownToFluxMark();
  const flux = converter.convert('<span>unsafe</span>');
  const html = renderToHTML(parseFluxMark(flux));
  assert.doesNotMatch(html, /<span>unsafe<\/span>/);
  assert.match(html, /&lt;span&gt;/);
});
