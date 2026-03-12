export interface ModifyTextAction {
  type: 'modifyText';
  nodeId: string;
  characters?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fillColor?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export async function executeModifyText(action: ModifyTextAction): Promise<boolean> {
  const node = await figma.getNodeByIdAsync(action.nodeId);
  if (!node || node.type !== 'TEXT') {
    console.error(`[ModifyText] Text node not found: ${action.nodeId}`);
    return false;
  }

  const textNode = node as TextNode;

  // Load font before modifying
  const fontFamily = action.fontFamily || (textNode.fontName as FontName).family;
  const fontStyle = action.fontStyle || (textNode.fontName as FontName).style;

  await figma.loadFontAsync({ family: fontFamily, style: fontStyle });

  if (action.characters !== undefined) {
    textNode.characters = action.characters;
  }

  if (action.fontSize !== undefined) {
    textNode.fontSize = action.fontSize;
  }

  if (action.fontFamily || action.fontStyle) {
    textNode.fontName = { family: fontFamily, style: fontStyle };
  }

  if (action.fillColor) {
    const rgb = hexToRgb(action.fillColor);
    textNode.fills = [
      {
        type: 'SOLID',
        color: { r: rgb.r, g: rgb.g, b: rgb.b },
      },
    ];
  }

  return true;
}

// Find text nodes by name within parent and modify
export async function executeModifyTextByName(
  parentId: string,
  targetName: string,
  changes: Omit<ModifyTextAction, 'type' | 'nodeId'>
): Promise<boolean> {
  const parent = await figma.getNodeByIdAsync(parentId);
  if (!parent || !('findAll' in parent)) return false;

  const textNodes = (parent as FrameNode).findAll(
    (n) => n.type === 'TEXT' && n.name.toLowerCase().includes(targetName.toLowerCase())
  ) as TextNode[];

  let success = false;
  for (const textNode of textNodes) {
    const fontName = textNode.fontName as FontName;
    await figma.loadFontAsync({
      family: changes.fontFamily || fontName.family,
      style: changes.fontStyle || fontName.style,
    });

    if (changes.characters !== undefined) textNode.characters = changes.characters;
    if (changes.fontSize !== undefined) textNode.fontSize = changes.fontSize;
    if (changes.fillColor) {
      const h = changes.fillColor.replace('#', '');
      textNode.fills = [
        {
          type: 'SOLID',
          color: {
            r: parseInt(h.substring(0, 2), 16) / 255,
            g: parseInt(h.substring(2, 4), 16) / 255,
            b: parseInt(h.substring(4, 6), 16) / 255,
          },
        },
      ];
    }
    success = true;
  }

  return success;
}
