export interface SetVisibilityAction {
  type: 'setVisibility';
  nodeId: string;
  visible: boolean;
}

export async function executeSetVisibility(action: SetVisibilityAction): Promise<boolean> {
  const node = await figma.getNodeByIdAsync(action.nodeId);
  if (!node || !('visible' in node)) {
    console.error(`[SetVisibility] Node not found: ${action.nodeId}`);
    return false;
  }

  (node as SceneNode).visible = action.visible;
  return true;
}

// Find by name and toggle visibility
export async function executeSetVisibilityByName(
  parentId: string,
  targetName: string,
  visible: boolean
): Promise<boolean> {
  const parent = await figma.getNodeByIdAsync(parentId);
  if (!parent || !('findAll' in parent)) return false;

  const targets = (parent as FrameNode).findAll((n) =>
    n.name.toLowerCase().includes(targetName.toLowerCase())
  );

  for (const target of targets) {
    target.visible = visible;
  }

  return targets.length > 0;
}
