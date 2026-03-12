export interface ReorderChildrenAction {
  type: 'reorderChildren';
  parentNodeId: string;
  childOrder: string[];  // child names in desired order
}

export async function executeReorderChildren(action: ReorderChildrenAction): Promise<boolean> {
  var parent = await figma.getNodeByIdAsync(action.parentNodeId);
  if (!parent || !('children' in parent)) {
    console.error('[ReorderChildren] Parent not found: ' + action.parentNodeId);
    return false;
  }

  var parentFrame = parent as FrameNode;
  var ordered: SceneNode[] = [];

  // Build ordered list based on names
  for (var i = 0; i < action.childOrder.length; i++) {
    var targetName = action.childOrder[i].toLowerCase();
    for (var j = 0; j < parentFrame.children.length; j++) {
      var child = parentFrame.children[j];
      if (child.name.toLowerCase().includes(targetName)) {
        ordered.push(child);
        break;
      }
    }
  }

  // Re-insert children in new order
  // Figma uses insertChild(index, node) — insert from last to first
  for (var k = ordered.length - 1; k >= 0; k--) {
    parentFrame.insertChild(0, ordered[k]);
  }

  return true;
}
