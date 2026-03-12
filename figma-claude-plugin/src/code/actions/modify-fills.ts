export interface ModifyFillsAction {
  type: 'modifyFills';
  nodeId: string;
  fills: Array<{ type: string; color: string; opacity?: number }>;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export async function executeModifyFills(action: ModifyFillsAction): Promise<boolean> {
  const node = await figma.getNodeByIdAsync(action.nodeId);
  if (!node || !('fills' in node)) {
    console.error(`[ModifyFills] Node not found or has no fills: ${action.nodeId}`);
    return false;
  }

  const sceneNode = node as GeometryMixin & SceneNode;
  const newFills: Paint[] = action.fills.map((f) => {
    const rgb = hexToRgb(f.color);
    return {
      type: 'SOLID' as const,
      color: { r: rgb.r, g: rgb.g, b: rgb.b },
      opacity: f.opacity ?? 1,
    };
  });

  sceneNode.fills = newFills;
  return true;
}

// Find nodes by name within a parent and modify their fills
export async function executeModifyFillsByName(
  parentId: string,
  targetName: string,
  fills: Array<{ type: string; color: string; opacity?: number }>
): Promise<boolean> {
  const parent = await figma.getNodeByIdAsync(parentId);
  if (!parent || !('findAll' in parent)) return false;

  const targets = (parent as FrameNode).findAll((n) =>
    n.name.toLowerCase().includes(targetName.toLowerCase())
  );

  let success = false;
  for (const target of targets) {
    if ('fills' in target) {
      const rgb = hexToRgb(fills[0].color);
      (target as GeometryMixin & SceneNode).fills = [
        {
          type: 'SOLID' as const,
          color: { r: rgb.r, g: rgb.g, b: rgb.b },
          opacity: fills[0].opacity ?? 1,
        },
      ];
      success = true;
    }
  }

  return success;
}
