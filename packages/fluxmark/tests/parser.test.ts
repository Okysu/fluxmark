import { describe, expect, it } from 'vitest';
import { parseFluxMarkDocument, toggleTaskInSource } from '../src/parser';
import { parseFluxInline } from '../src/inline';
import type { FluxCallout, FluxCodeBlock, FluxDataTable, FluxList, FluxParagraph, FluxRawHtml, FluxSection } from '../src/types';

describe('FluxMark block parser', () => {
  it('derives heading levels from section depth and supports explicit hashes', () => {
    const ast = parseFluxMarkDocument(`# Root
  Introduction.
  # Child
    Deep content.
## Explicit`);
    const root = ast.children[0] as FluxSection;
    const child = root.children[1] as FluxSection;
    const explicit = ast.children[1] as FluxSection;
    expect(root.level).toBe(1);
    expect(child.level).toBe(2);
    expect(explicit.level).toBe(2);
    expect((root.children[0] as FluxParagraph).tokens[0]?.content).toBe('Introduction.');
    expect(child.children).toHaveLength(1);
  });

  it('keeps multiline callout content without repeated markers', () => {
    const ast = parseFluxMarkDocument(`> [warn] Careful
  First line
  second line

  - one
  - two
After`);
    const callout = ast.children[0] as FluxCallout;
    expect(callout.variant).toBe('warn');
    expect(callout.children.map((node) => node.type)).toEqual(['Paragraph', 'List']);
    expect(callout.children[0]?.type).toBe('Paragraph');
    expect(ast.children[1]?.type).toBe('Paragraph');
  });

  it('collects fenced-looking code literally, including blank lines', () => {
    const ast = parseFluxMarkDocument(`$ markdown
  \`\`\`
  # not a heading

  *not bold*
  \`\`\`
After`);
    const code = ast.children[0] as FluxCodeBlock;
    expect(code.language).toBe('markdown');
    expect(code.code).toBe('```\n# not a heading\n\n*not bold*\n```');
    expect(ast.children[1]?.type).toBe('Paragraph');
  });

  it('builds deduplicated table columns from compact and vertical records', () => {
    const ast = parseFluxMarkDocument(`@ Roadmap
  - Name: [Core|b] | State: [Stable|badge] | Link: [Site|https://example.com]
  - Name: Renderer
    State: WIP
    Note: [Hint|?中文说明]
After`);
    const table = ast.children[0] as FluxDataTable;
    expect(table.columns).toEqual(['Name', 'State', 'Link', 'Note']);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]?.cells.Name?.tokens[0]?.style.bold).toBe(true);
    expect(table.rows[0]?.cells.Link?.tokens[0]?.style.href).toBe('https://example.com');
    expect(table.rows[1]?.cells.State?.tokens[0]?.content).toBe('WIP');
    expect(table.rows[1]?.cells.Note?.tokens[0]?.style.tooltip).toBe('中文说明');

    const sameIndent = parseFluxMarkDocument(`@ Same indent
  - A: one
  B: two`);
    const aligned = sameIndent.children[0] as FluxDataTable;
    expect(aligned.columns).toEqual(['A', 'B']);
    expect(aligned.rows[0]?.cells.B?.tokens[0]?.content).toBe('two');
  });

  it('preserves raw HTML blocks', () => {
    const ast = parseFluxMarkDocument(`!html
  <div class="callout">
    <strong>Raw</strong>
  </div>
After`);
    const raw = ast.children[0] as FluxRawHtml;
    expect(raw.type).toBe('RawHtml');
    expect(raw.content).toContain('<div class="callout">');
    expect(raw.content).toContain('<strong>Raw</strong>');
    expect(ast.children[1]?.type).toBe('Paragraph');
  });

  it('uses a header row for compact positional table records', () => {
    const ast = parseFluxMarkDocument(`@ Compact
  - Name | State | Link
  - Core | Stable | https://example.com
  - Renderer | WIP | local`);
    const table = ast.children[0] as FluxDataTable;
    expect(table.columns).toEqual(['Name', 'State', 'Link']);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]?.cells.Name?.tokens[0]?.content).toBe('Core');
    expect(table.rows[0]?.cells.Link?.tokens[0]?.content).toBe('https://example.com');
    expect(table.rows[1]?.cells.State?.tokens[0]?.content).toBe('WIP');
  });

  it('stores prototype-like table column names as safe own properties', () => {
    const ast = parseFluxMarkDocument(`@ Safe keys
  - __proto__: first | constructor: second
  - constructor: third`);
    const table = ast.children[0] as FluxDataTable;
    expect(table.columns).toEqual(['__proto__', 'constructor']);
    expect(table.rows[0]?.cells.__proto__?.tokens[0]?.content).toBe('first');
    expect(table.rows[0]?.cells['constructor']?.tokens[0]?.content).toBe('second');
    expect(table.rows[1]?.cells.__proto__).toBeUndefined();
    expect(table.rows[1]?.cells['constructor']?.tokens[0]?.content).toBe('third');
  });

  it('supports physical and marker-based list nesting and outline numbers', () => {
    const ast = parseFluxMarkDocument(`- root
-- child
--- grand
-- sibling
- next
1. one
1.1. nested
1.2. nested two
2. two
* [ ] todo
* [x] done`);
    const unordered = ast.children[0] as FluxList;
    const ordered = ast.children[1] as FluxList;
    const tasks = ast.children[2] as FluxList;
    expect(unordered.children).toHaveLength(2);
    expect(unordered.children[0]?.children.at(-1)?.type).toBe('List');
    const prefixed = unordered.children[0]?.children.at(-1) as FluxList;
    expect(prefixed.children).toHaveLength(2);
    expect(prefixed.children[0]?.children.at(-1)?.type).toBe('List');
    expect(ordered.children).toHaveLength(2);
    expect(ordered.children[0]?.children.at(-1)?.type).toBe('List');
    expect(tasks.children[0]?.checked).toBe(false);
    expect(tasks.children[1]?.checked).toBe(true);
    expect(tasks.children[0]?.line).toBe(10);
  });

  it('round-trips task toggles at exact CRLF source offsets', () => {
    const source = '* [ ] first\r\n* [x] second\r\n';
    const toggled = toggleTaskInSource(source, 1, true);
    expect(toggled).toBe('* [x] first\r\n* [x] second\r\n');
    expect(toggleTaskInSource(toggled, 2)).toBe('* [x] first\r\n* [ ] second\r\n');
    const ast = parseFluxMarkDocument(toggled);
    const list = ast.children[0] as FluxList;
    const offset = list.children[0]?.taskMarkerOffset;
    expect(offset).toBe(3);
    expect(toggled[offset ?? 0]).toBe('x');
  });

  it('handles long delimiter-heavy input in one pass', () => {
    const source = `2 * 3 * 4 and my_var_name_v2 `.repeat(20_000);
    const tokens = parseFluxInline(source);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]?.content).toBe(source);
    expect(tokens[0]?.style.bold).toBe(false);
    expect(tokens[0]?.style.italic).toBe(false);
  });
});
