export interface CreateTextAction {
  type: 'createText';
  name?: string;
  characters: string;
  x?: number;
  y?: number;
  width?: number;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fillColor?: string;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
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

export async function executeCreateText(action: CreateTextAction): Promise<SceneNode> {
  const fontFamily = action.fontFamily || 'Inter';
  const fontStyle = action.fontStyle || 'Regular';

  await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

  const text = figma.createText();
  text.fontName = { family: fontFamily, style: fontStyle };
  text.characters = action.characters;

  if (action.name) text.name = action.name;
  if (action.x !== undefined) text.x = action.x;
  if (action.y !== undefined) text.y = action.y;
  if (action.fontSize) text.fontSize = action.fontSize;
  if (action.textAlignHorizontal) text.textAlignHorizontal = action.textAlignHorizontal;

  if (action.width !== undefined) {
    text.resize(action.width, text.height);
    text.textAutoResize = 'HEIGHT';
  }

  if (action.fillColor) {
    const rgb = hexToRgb(action.fillColor);
    text.fills = [
      {
        type: 'SOLID',
        color: { r: rgb.r, g: rgb.g, b: rgb.b },
      },
    ];
  }

  // Append to parent if specified
  if (action.parentNodeId) {
    const parent = await figma.getNodeByIdAsync(action.parentNodeId);
    if (parent && 'appendChild' in parent) {
      (parent as FrameNode).appendChild(text);
    }
  }

  return text;
}
