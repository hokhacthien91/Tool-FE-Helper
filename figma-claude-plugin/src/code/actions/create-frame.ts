export interface CreateFrameAction {
  type: 'createFrame';
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  cornerRadius?: number;
  fills?: Array<{ type: string; color: string; opacity?: number }>;
  parentNodeId?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export async function executeCreateFrame(action: CreateFrameAction): Promise<SceneNode> {
  const frame = figma.createFrame();
  frame.name = action.name;

  if (action.x !== undefined) frame.x = action.x;
  if (action.y !== undefined) frame.y = action.y;
  if (action.width !== undefined && action.height !== undefined) {
    frame.resize(action.width, action.height);
  } else if (action.width !== undefined) {
    frame.resize(action.width, frame.height);
  } else if (action.height !== undefined) {
    frame.resize(frame.width, action.height);
  }

  if (action.layoutMode) frame.layoutMode = action.layoutMode;
  if (action.primaryAxisSizingMode) frame.primaryAxisSizingMode = action.primaryAxisSizingMode;
  if (action.counterAxisSizingMode) frame.counterAxisSizingMode = action.counterAxisSizingMode;
  if (action.paddingLeft !== undefined) frame.paddingLeft = action.paddingLeft;
  if (action.paddingRight !== undefined) frame.paddingRight = action.paddingRight;
  if (action.paddingTop !== undefined) frame.paddingTop = action.paddingTop;
  if (action.paddingBottom !== undefined) frame.paddingBottom = action.paddingBottom;
  if (action.itemSpacing !== undefined) frame.itemSpacing = action.itemSpacing;
  if (action.cornerRadius !== undefined) frame.cornerRadius = action.cornerRadius;

  if (action.fills && action.fills.length > 0) {
    frame.fills = action.fills.map((f) => {
      const rgb = hexToRgb(f.color);
      return {
        type: 'SOLID' as const,
        color: { r: rgb.r, g: rgb.g, b: rgb.b },
        opacity: f.opacity ?? 1,
      };
    });
  }

  // Append to parent if specified
  if (action.parentNodeId) {
    const parent = await figma.getNodeByIdAsync(action.parentNodeId);
    if (parent && 'appendChild' in parent) {
      (parent as FrameNode).appendChild(frame);
    }
  }

  return frame;
}
