import { describe, expect, it } from 'vitest';
import { parseFluxInline } from '../src/inline';

describe('FluxMark inline parser', () => {
  it('parses orthogonal shortcuts without treating math as emphasis', () => {
    const tokens = parseFluxInline('*bold* **strong** _italic_ =mark= ~strike~ 2 * 3 * 4 = 24');
    expect(tokens.filter((token) => token.style.bold).map((token) => token.content)).toEqual([
      'bold',
      'strong',
    ]);
    expect(tokens.find((token) => token.content === 'italic')?.style.italic).toBe(true);
    expect(tokens.find((token) => token.content === 'mark')?.style.mark).toBe(true);
    expect(tokens.find((token) => token.content === 'strike')?.style.strike).toBe(true);
    expect(tokens.at(-1)?.content).toBe(' 2 * 3 * 4 = 24');
  });

  it('keeps underscores in identifiers completely literal', () => {
    for (const identifier of ['my_var_name_v2', 'foo_bar', 'a_b_c_d']) {
      const tokens = parseFluxInline(identifier);
      expect(tokens.map((token) => token.content).join('')).toBe(identifier);
      expect(tokens.every((token) => !token.style.italic)).toBe(true);
    }
    const boundary = parseFluxInline('foo_bar_!');
    expect(boundary.find((token) => token.content === 'bar')?.style.italic).toBe(true);
  });

  it('combines every pipe modifier and preserves custom extension slots', () => {
    const [token] = parseFluxInline(
      '[Styled|b,i,u,s,m,#38bdf8,https://example.com,kbd,badge,?Tip, with comma]',
    );
    expect(token?.content).toBe('Styled');
    expect(token?.style).toMatchObject({
      bold: true,
      italic: true,
      underline: true,
      strike: true,
      mark: true,
      color: '#38bdf8',
      href: 'https://example.com',
      tooltip: 'Tip, with comma',
      customModifiers: ['kbd', 'badge'],
    });
  });

  it('does not parse delimiters inside code spans or pipelines', () => {
    const tokens = parseFluxInline('`*raw*` [*literal*|b]');
    expect(tokens[0]?.type).toBe('code');
    expect(tokens[0]?.content).toBe('*raw*');
    expect(tokens[0]?.style.bold).toBe(false);
    const pipeline = tokens.find((token) => token.type === 'style');
    expect(pipeline?.content).toBe('*literal*');
    expect(pipeline?.style.bold).toBe(true);
  });

  it('supports overlapping orthogonal styles with flat tokens', () => {
    const tokens = parseFluxInline('*a _both_ b*');
    const both = tokens.find((token) => token.content === 'both');
    expect(both?.style.bold).toBe(true);
    expect(both?.style.italic).toBe(true);
  });

  it('supports backslash escapes and raw inline HTML', () => {
    const escaped = parseFluxInline('\\*literal\\* and [a\\|b\\]|c]');
    expect(escaped.map((token) => token.content).join('')).toBe('*literal* and a|b]');
    expect(escaped.some((token) => token.style.bold)).toBe(false);
    expect(escaped.find((token) => token.style.code)?.content).toBe('a|b]');
    const [html] = parseFluxInline('!<span class="mark">');
    expect(html).toMatchObject({ type: 'html', content: '<span class="mark">' });
  });

  it('parses first-class images as ![src|alt], with optional alt text', () => {
    const [image] = parseFluxInline('![https://example.com/architecture.png|Architecture]');
    expect(image).toMatchObject({
      type: 'image',
      content: 'Architecture',
      attributes: { src: 'https://example.com/architecture.png' },
    });
    const [withoutAlt] = parseFluxInline('![https://example.com/architecture.png]');
    expect(withoutAlt).toMatchObject({
      type: 'image',
      content: '',
      attributes: { src: 'https://example.com/architecture.png' },
    });
  });

  it('treats prototype property names as ordinary custom modifiers', () => {
    const [token] = parseFluxInline('[safe|constructor,toString]');
    expect(token?.style.customModifiers).toEqual(['constructor', 'toString']);
  });
});
