import { describe, expect, it } from 'vitest';
import { parseFluxMarkDocument } from '../src/parser';
import { countASTNodes, walkAST } from '../src/walker';
import type { FluxCustomBlock } from '../src/types';

describe('walkAST', () => {
  it('runs enter and leave hooks in depth-first order', () => {
    const ast = parseFluxMarkDocument('# Title\n  Body');
    const events: string[] = [];
    walkAST(ast, {
      '*': {
        enter(node) {
          events.push(`enter:${node.type}`);
        },
        leave(node) {
          events.push(`leave:${node.type}`);
        },
      },
    });
    expect(events).toEqual([
      'enter:Document',
      'enter:Section',
      'enter:Paragraph',
      'leave:Paragraph',
      'leave:Section',
      'leave:Document',
    ]);
    expect(countASTNodes(ast)).toBe(3);
  });

  it('skips subtrees without skipping later siblings', () => {
    const ast = parseFluxMarkDocument('# One\n  Hidden\n# Two\n  Visible');
    const paragraphs: string[] = [];
    walkAST(ast, {
      Section: {
        enter(node, _parent, _index, context) {
          if (node.title[0]?.content === 'One') context.skip();
        },
      },
      Paragraph: {
        enter(node) {
          paragraphs.push(node.tokens[0]?.content ?? '');
        },
      },
    });
    expect(paragraphs).toEqual(['Visible']);
  });

  it('removes adjacent nodes safely while iterating', () => {
    const ast = parseFluxMarkDocument('One\n\nTwo\n\nThree\n\nFour');
    walkAST(ast, {
      Paragraph: {
        enter(_node, _parent, _index, context) {
          context.remove();
        },
      },
    });
    expect(ast.children).toHaveLength(0);
  });

  it('replaces a code block with a custom chart node', () => {
    const ast = parseFluxMarkDocument('$ chart\n  a,b\n  1,2');
    walkAST(ast, {
      CodeBlock: {
        enter(node, _parent, _index, context) {
          const replacement: FluxCustomBlock = {
            type: 'CustomBlock',
            name: 'chart',
            content: node.code,
            attributes: { language: node.language },
            children: [],
            line: node.line,
            column: node.column,
            indent: node.indent,
            range: { ...node.range },
          };
          context.replace(replacement);
        },
      },
    });
    expect(ast.children[0]?.type).toBe('CustomBlock');
    expect(ast.children[0]).toMatchObject({ name: 'chart', content: 'a,b\n1,2' });
  });

  it('supports removal and replacement from leave hooks', () => {
    const ast = parseFluxMarkDocument('First\n\nSecond');
    walkAST(ast, {
      Paragraph: {
        leave(_node, _parent, _index, context) {
          context.remove();
        },
      },
    });
    expect(ast.children).toEqual([]);
  });
});
