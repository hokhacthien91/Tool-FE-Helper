export interface MoveNodeAction {
  type: 'moveNode';
  nodeId: string;
  newParentId: string;
  index?: number;
}

export async function executeMoveNode(action: MoveNodeAction): Promise<boolean> {
  var node = await figma.getNodeByIdAsync(action.nodeId);
  if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') {
    console.error('[MoveNode] Node not found: ' + action.nodeId);
    return false;
  }

  var parent = await figma.getNodeByIdAsync(action.newParentId);
  if (!parent || !('appendChild' in parent)) {
    console.error('[MoveNode] Parent not found or cannot have children: ' + action.newParentId);
    return false;
  }

  var parentFrame = parent as FrameNode;
  if (action.index !== undefined && action.index >= 0) {
    parentFrame.insertChild(action.index, node as SceneNode);
  } else {
    parentFrame.appendChild(node as SceneNode);
  }

  return true;
}
