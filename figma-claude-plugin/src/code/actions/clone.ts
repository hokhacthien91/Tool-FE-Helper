export interface CloneAction {
  type: 'clone';
  sourceNodeId: string;
  newName?: string;
  offsetX?: number;
  offsetY?: number;
}

export async function executeClone(action: CloneAction): Promise<SceneNode | null> {
  const node = await figma.getNodeByIdAsync(action.sourceNodeId);
  if (!node || !('clone' in node)) {
    console.error(`[Clone] Node not found: ${action.sourceNodeId}`);
    return null;
  }

  const cloned = (node as SceneNode).clone();

  if (action.newName) {
    cloned.name = action.newName;
  }

  if (action.offsetX !== undefined) {
    cloned.x += action.offsetX;
  }
  if (action.offsetY !== undefined) {
    cloned.y += action.offsetY;
  }

  return cloned;
}
