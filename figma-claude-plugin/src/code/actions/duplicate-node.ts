export interface DuplicateNodeAction {
  type: 'duplicateNode';
  nodeId: string;
  newName?: string;
  offsetX?: number;
  offsetY?: number;
}

export async function executeDuplicateNode(action: DuplicateNodeAction): Promise<SceneNode | null> {
  var node = await figma.getNodeByIdAsync(action.nodeId);
  if (!node || !('clone' in node)) {
    console.error('[DuplicateNode] Node not found: ' + action.nodeId);
    return null;
  }

  var clone = (node as SceneNode).clone();
  if (action.newName) clone.name = action.newName;
  if (action.offsetX) clone.x += action.offsetX;
  if (action.offsetY) clone.y += action.offsetY;

  return clone;
}
