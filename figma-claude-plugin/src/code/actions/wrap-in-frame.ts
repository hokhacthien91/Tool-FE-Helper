export interface WrapInFrameAction {
  type: 'wrapInFrame';
  parentNodeId: string;
  childNames: string[];
  childIndices?: number[];
  frameName?: string;
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  cornerRadius?: number;
  fills?: Array<{ type: string; color: string; opacity?: number }>;
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  width?: number;
  height?: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  var clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16) / 255,
    g: parseInt(clean.substring(2, 4), 16) / 255,
    b: parseInt(clean.substring(4, 6), 16) / 255,
  };
}

function findChildByName(parent: FrameNode, name: string): SceneNode | null {
  var lower = name.toLowerCase();

  // 1. Exact match on direct children
  for (var i = 0; i < parent.children.length; i++) {
    if (parent.children[i].name.toLowerCase() === lower) {
      return parent.children[i];
    }
  }

  // 2. Partial match (child name includes target)
  for (var j = 0; j < parent.children.length; j++) {
    if (parent.children[j].name.toLowerCase().includes(lower)) {
      return parent.children[j];
    }
  }

  // 3. Partial match (target includes child name)
  for (var k = 0; k < parent.children.length; k++) {
    if (lower.includes(parent.children[k].name.toLowerCase())) {
      return parent.children[k];
    }
  }

  // 4. If name looks like a number, use as index
  var idx = parseInt(name, 10);
  if (!isNaN(idx) && idx >= 0 && idx < parent.children.length) {
    return parent.children[idx];
  }

  // 5. Deep search with findAll — but only return if the found node's parent is our parent
  var found = parent.findAll(function (n) {
    return n.name.toLowerCase().includes(lower);
  });
  for (var f = 0; f < found.length; f++) {
    if (found[f].parent && found[f].parent!.id === parent.id) {
      return found[f];
    }
  }

  return null;
}

export async function executeWrapInFrame(action: WrapInFrameAction): Promise<FrameNode | null> {
  var parent = await figma.getNodeByIdAsync(action.parentNodeId);
  if (!parent || !('children' in parent)) {
    console.error('[WrapInFrame] Parent not found: ' + action.parentNodeId);
    return null;
  }

  var parentFrame = parent as FrameNode;
  var childrenToWrap: SceneNode[] = [];

  // Log available children for debugging
  var childNames: string[] = [];
  for (var d = 0; d < parentFrame.children.length; d++) {
    childNames.push(parentFrame.children[d].name);
  }
  console.log('[WrapInFrame] Parent "' + parentFrame.name + '" has children: ' + childNames.join(', '));

  // Option A: find by childIndices (more reliable)
  if (action.childIndices && action.childIndices.length > 0) {
    for (var ii = 0; ii < action.childIndices.length; ii++) {
      var idx = action.childIndices[ii];
      if (idx >= 0 && idx < parentFrame.children.length) {
        childrenToWrap.push(parentFrame.children[idx]);
      }
    }
  }

  // Option B: find by childNames
  if (childrenToWrap.length === 0 && action.childNames && action.childNames.length > 0) {
    var alreadyFound = new Set<string>();
    for (var i = 0; i < action.childNames.length; i++) {
      var match = findChildByName(parentFrame, action.childNames[i]);
      if (match && !alreadyFound.has(match.id)) {
        childrenToWrap.push(match);
        alreadyFound.add(match.id);
        console.log('[WrapInFrame] Matched "' + action.childNames[i] + '" → "' + match.name + '" (' + match.id + ')');
      } else {
        console.warn('[WrapInFrame] Could not find child matching "' + action.childNames[i] + '"');
      }
    }
  }

  // Fallback: if still nothing found, wrap ALL direct children
  if (childrenToWrap.length === 0 && parentFrame.children.length > 0) {
    console.warn('[WrapInFrame] No matches found, wrapping all ' + parentFrame.children.length + ' children');
    for (var a = 0; a < parentFrame.children.length; a++) {
      childrenToWrap.push(parentFrame.children[a]);
    }
  }

  if (childrenToWrap.length === 0) {
    console.error('[WrapInFrame] Parent has no children to wrap');
    return null;
  }

  // Create wrapper frame
  var wrapper = figma.createFrame();
  wrapper.name = action.frameName || 'Wrapper';

  // Insert wrapper at position of first child
  var firstChildIndex = 0;
  for (var k = 0; k < parentFrame.children.length; k++) {
    if (parentFrame.children[k].id === childrenToWrap[0].id) {
      firstChildIndex = k;
      break;
    }
  }
  parentFrame.insertChild(firstChildIndex, wrapper);

  // Move children into wrapper
  for (var c = 0; c < childrenToWrap.length; c++) {
    wrapper.appendChild(childrenToWrap[c]);
  }

  // Apply layout properties
  if (action.layoutMode && action.layoutMode !== 'NONE') {
    wrapper.layoutMode = action.layoutMode;
  }
  if (action.primaryAxisSizingMode) wrapper.primaryAxisSizingMode = action.primaryAxisSizingMode;
  if (action.counterAxisSizingMode) wrapper.counterAxisSizingMode = action.counterAxisSizingMode;
  if (action.itemSpacing !== undefined) wrapper.itemSpacing = action.itemSpacing;
  if (action.paddingLeft !== undefined) wrapper.paddingLeft = action.paddingLeft;
  if (action.paddingRight !== undefined) wrapper.paddingRight = action.paddingRight;
  if (action.paddingTop !== undefined) wrapper.paddingTop = action.paddingTop;
  if (action.paddingBottom !== undefined) wrapper.paddingBottom = action.paddingBottom;
  if (action.cornerRadius !== undefined) wrapper.cornerRadius = action.cornerRadius;
  if (action.width) wrapper.resize(action.width, wrapper.height);
  if (action.height) wrapper.resize(wrapper.width, action.height);

  // Apply fills
  if (action.fills && action.fills.length > 0) {
    var paints: Paint[] = [];
    for (var f = 0; f < action.fills.length; f++) {
      var fill = action.fills[f];
      if (fill.type === 'SOLID' && fill.color) {
        var rgb = hexToRgb(fill.color);
        paints.push({
          type: 'SOLID',
          color: rgb,
          opacity: fill.opacity !== undefined ? fill.opacity : 1,
        });
      }
    }
    if (paints.length > 0) wrapper.fills = paints;
  }

  return wrapper;
}
