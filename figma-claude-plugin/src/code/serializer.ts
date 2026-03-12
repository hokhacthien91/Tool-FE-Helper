// Serialize Figma nodes into JSON that Claude can understand

export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  opacity?: number;
  fills?: SerializedFill[];
  strokes?: SerializedStroke[];
  cornerRadius?: number;
  characters?: string;
  fontSize?: number;
  fontName?: { family: string; style: string };
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  layoutGrow?: number;
  layoutAlign?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  childCount?: number;
  children?: SerializedNode[];
}

interface SerializedFill {
  type: string;
  color?: string;
  opacity?: number;
}

interface SerializedStroke {
  type: string;
  color?: string;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function serializeFills(fills: readonly Paint[]): SerializedFill[] {
  return fills
    .filter((f) => f.visible !== false)
    .map((f) => {
      if (f.type === 'SOLID') {
        return {
          type: 'SOLID',
          color: rgbToHex(f.color.r, f.color.g, f.color.b),
          opacity: f.opacity,
        };
      }
      return { type: f.type };
    });
}

function serializeStrokes(strokes: readonly Paint[]): SerializedStroke[] {
  return strokes
    .filter((s) => s.visible !== false)
    .map((s) => {
      if (s.type === 'SOLID') {
        return {
          type: 'SOLID',
          color: rgbToHex(s.color.r, s.color.g, s.color.b),
        };
      }
      return { type: s.type };
    });
}

export function serializeNode(node: SceneNode, depth = 0, maxDepth = 5): SerializedNode {
  const result: SerializedNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    x: Math.round(node.x),
    y: Math.round(node.y),
    width: Math.round(node.width),
    height: Math.round(node.height),
    visible: node.visible,
  };

  if ('opacity' in node) {
    result.opacity = node.opacity;
  }

  if ('fills' in node && node.fills !== figma.mixed) {
    result.fills = serializeFills(node.fills as readonly Paint[]);
  }

  if ('strokes' in node) {
    result.strokes = serializeStrokes(node.strokes as readonly Paint[]);
  }

  if ('cornerRadius' in node && node.cornerRadius !== figma.mixed) {
    result.cornerRadius = node.cornerRadius as number;
  }

  // Text-specific
  if (node.type === 'TEXT') {
    result.characters = node.characters;
    if (node.fontSize !== figma.mixed) {
      result.fontSize = node.fontSize as number;
    }
    if (node.fontName !== figma.mixed) {
      result.fontName = node.fontName as { family: string; style: string };
    }
  }

  // Layout-specific
  if ('layoutMode' in node) {
    const frame = node as FrameNode;
    result.layoutMode = frame.layoutMode;
    result.primaryAxisSizingMode = frame.primaryAxisSizingMode;
    result.counterAxisSizingMode = frame.counterAxisSizingMode;
    result.primaryAxisAlignItems = frame.primaryAxisAlignItems;
    result.counterAxisAlignItems = frame.counterAxisAlignItems;
    result.paddingLeft = frame.paddingLeft;
    result.paddingRight = frame.paddingRight;
    result.paddingTop = frame.paddingTop;
    result.paddingBottom = frame.paddingBottom;
    result.itemSpacing = frame.itemSpacing;
  }

  // Layout child properties
  if ('layoutGrow' in node) {
    result.layoutGrow = (node as FrameNode).layoutGrow;
  }
  if ('layoutAlign' in node) {
    result.layoutAlign = (node as FrameNode).layoutAlign;
  }

  // Children (with depth limit)
  if ('children' in node) {
    const children = (node as FrameNode).children;
    result.childCount = children.length;
    if (depth < maxDepth) {
      result.children = children.map((child) =>
        serializeNode(child, depth + 1, maxDepth)
      );
    }
  }

  return result;
}

export function serializeSelection(): SerializedNode[] {
  return figma.currentPage.selection.map((node) => serializeNode(node));
}
