export interface CreateRectangleAction {
  type: 'createRectangle';
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cornerRadius?: number;
  fills?: Array<{ type: string; color: string; opacity?: number }>;
  strokes?: Array<{ type: string; color: string }>;
  strokeWeight?: number;
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

export async function executeCreateRectangle(action: CreateRectangleAction): Promise<SceneNode> {
  const rect = figma.createRectangle();

  if (action.name) rect.name = action.name;
  if (action.x !== undefined) rect.x = action.x;
  if (action.y !== undefined) rect.y = action.y;

  const w = action.width ?? 100;
  const h = action.height ?? 100;
  rect.resize(w, h);

  if (action.cornerRadius !== undefined) {
    rect.cornerRadius = action.cornerRadius;
  }

  if (action.fills && action.fills.length > 0) {
    rect.fills = action.fills.map((f) => {
      const rgb = hexToRgb(f.color);
      return {
        type: 'SOLID' as const,
        color: { r: rgb.r, g: rgb.g, b: rgb.b },
        opacity: f.opacity ?? 1,
      };
    });
  }

  if (action.strokes && action.strokes.length > 0) {
    rect.strokes = action.strokes.map((s) => {
      const rgb = hexToRgb(s.color);
      return {
        type: 'SOLID' as const,
        color: { r: rgb.r, g: rgb.g, b: rgb.b },
      };
    });
  }

  if (action.strokeWeight !== undefined) {
    rect.strokeWeight = action.strokeWeight;
  }

  if (action.parentNodeId) {
    const parent = await figma.getNodeByIdAsync(action.parentNodeId);
    if (parent && 'appendChild' in parent) {
      (parent as FrameNode).appendChild(rect);
    }
  }

  return rect;
}
