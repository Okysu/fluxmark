import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MarkdownToFluxMark } from './migrate-markdown.mjs';
import { parseFluxMark, renderToHTML } from '../packages/fluxmark/dist/index.js';

const fixture = `Reference
=========

A **strong** and *em* with \`code | ]\`, [ref][id], [title](https://e.test "T"), ![alt](https://e.test/a.png "I"), and <span class="x">html</span>.

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
  assert.match(html, /\*literal\*/);
  assert.match(html, /\| pipe/);
});

test('escapes raw HTML by default', () => {
  const converter = new MarkdownToFluxMark();
  const flux = converter.convert('<span>unsafe</span>');
  const html = renderToHTML(parseFluxMark(flux));
  assert.doesNotMatch(html, /<span>unsafe<\/span>/);
  assert.match(html, /&lt;span&gt;/);
});
