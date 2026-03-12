export interface DeleteNodeAction {
  type: 'deleteNode';
  nodeId: string;
}

export async function executeDeleteNode(action: DeleteNodeAction): Promise<boolean> {
  var node = await figma.getNodeByIdAsync(action.nodeId);
  if (!node || node.type === 'PAGE' || node.type === 'DOCUMENT') {
    console.error('[DeleteNode] Node not found: ' + action.nodeId);
    return false;
  }

  (node as SceneNode).remove();
  return true;
}
