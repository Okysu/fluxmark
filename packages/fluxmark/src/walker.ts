import type {
  FluxBlockNode,
  FluxDocument,
  FluxNode,
  FluxParentNode,
  FluxVisitFunction,
  FluxVisitor,
  FluxVisitorHooks,
  FluxWalkContext,
} from './types';

interface MutableWalkContext extends FluxWalkContext {
  skipped: boolean;
  removed: boolean;
  replacement: FluxNode | null;
}

function createContext(
  path: FluxNode[],
  parent: FluxParentNode | null,
): MutableWalkContext {
  const context: MutableWalkContext = {
    path,
    skipped: false,
    removed: false,
    replacement: null,
    skip() {
      context.skipped = true;
    },
    remove() {
      if (parent === null) throw new Error('The Document root cannot be removed.');
      context.removed = true;
      context.replacement = null;
    },
    replace(node: FluxNode) {
      if (parent === null && node.type !== 'Document') {
        throw new Error('The Document root can only be replaced by another Document.');
      }
      if (parent !== null && node.type === 'Document') {
        throw new Error('A Document cannot be inserted as a child node.');
      }
      if (parent?.type === 'List' && node.type !== 'ListItem') {
        throw new Error('List children must be replaced by ListItem nodes.');
      }
      if (parent?.type !== 'List' && node.type === 'ListItem') {
        throw new Error('ListItem nodes can only be direct children of a List.');
      }
      context.replacement = node;
      context.removed = false;
    },
  };
  return context;
}

function childrenOf(node: FluxNode): FluxNode[] | null {
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

function hooksFor<N extends FluxNode>(
  visitor: FluxVisitor,
  node: N,
): FluxVisitorHooks<N> | undefined {
  return visitor[node.type] as FluxVisitorHooks<N> | undefined;
}

function callHook<N extends FluxNode>(
  hooks: FluxVisitorHooks<N> | undefined,
  phase: 'enter' | 'leave',
  node: N,
  parent: FluxParentNode | null,
  index: number,
  context: FluxWalkContext,
): void {
  const callback: FluxVisitFunction<N> | undefined = hooks?.[phase];
  callback?.(node, parent, index, context);
}

function visitNode<N extends FluxNode>(
  initialNode: N,
  parent: FluxParentNode | null,
  index: number,
  path: FluxNode[],
  visitor: FluxVisitor,
): FluxNode | null {
  let node: FluxNode = initialNode;
  const context = createContext(path, parent);
  const wildcard = visitor['*'];

  callHook(wildcard, 'enter', node, parent, index, context);
  if (!context.removed && context.replacement === null) {
    callHook(hooksFor(visitor, node), 'enter', node, parent, index, context);
  }
  if (context.removed) return null;
  if (context.replacement !== null) node = context.replacement;

  if (!context.skipped) {
    const children = childrenOf(node);
    if (children !== null) {
      path.push(node);
      let childIndex = 0;
      while (childIndex < children.length) {
        const child = children[childIndex];
        if (child === undefined) {
          childIndex += 1;
          continue;
        }
        const result = visitNode(child, node as FluxParentNode, childIndex, path, visitor);
        if (result === null) {
          children.splice(childIndex, 1);
        } else {
          children[childIndex] = result;
          childIndex += 1;
        }
      }
      path.pop();
    }
  }

  context.replacement = null;
  context.skipped = false;
  callHook(hooksFor(visitor, node), 'leave', node, parent, index, context);
  if (!context.removed && context.replacement === null) {
    callHook(wildcard, 'leave', node, parent, index, context);
  }
  if (context.removed) return null;
  if (context.replacement !== null) node = context.replacement;
  return node;
}

/**
 * Mutable depth-first traversal with safe subtree skipping, removal and replacement.
 * The input document is edited in place and also returned for convenient chaining.
 */
export function walkAST(ast: FluxDocument, visitor: FluxVisitor): FluxDocument {
  const result = visitNode(ast, null, 0, [], visitor);
  if (result === null || result.type !== 'Document') {
    throw new Error('AST walking did not preserve the Document root.');
  }
  return result;
}

export class FluxASTWalker {
  public constructor(private readonly visitor: FluxVisitor) {}

  public walk(ast: FluxDocument): FluxDocument {
    return walkAST(ast, this.visitor);
  }
}

export function countASTNodes(ast: FluxDocument): number {
  let count = 0;
  walkAST(ast, {
    '*': {
      enter() {
        count += 1;
      },
    },
  });
  return count;
}

export function isFluxContainer(node: FluxNode): node is FluxParentNode {
  return childrenOf(node) !== null;
}

export function isFluxBlockNode(node: FluxNode): node is FluxBlockNode {
  return node.type !== 'Document';
}
