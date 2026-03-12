export interface ModifyLayoutAction {
  type: 'modifyLayout';
  nodeId: string;
  layoutMode?: 'NONE' | 'HORIZONTAL' | 'VERTICAL';
  primaryAxisSizingMode?: 'FIXED' | 'AUTO';
  counterAxisSizingMode?: 'FIXED' | 'AUTO';
  primaryAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
  counterAxisAlignItems?: 'MIN' | 'CENTER' | 'MAX';
  layoutGrow?: number;
  layoutAlign?: 'STRETCH' | 'INHERIT';
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  counterAxisSpacing?: number;
  layoutWrap?: 'NO_WRAP' | 'WRAP';
  cornerRadius?: number;
  clipsContent?: boolean;
  width?: number;
  height?: number;
}

export async function executeModifyLayout(action: ModifyLayoutAction): Promise<boolean> {
  var node = await figma.getNodeByIdAsync(action.nodeId);
  if (!node || !('layoutMode' in node)) {
    console.error('[ModifyLayout] Frame node not found: ' + action.nodeId);
    return false;
  }

  var frame = node as FrameNode;

  if (action.layoutMode !== undefined) frame.layoutMode = action.layoutMode;
  if (action.primaryAxisSizingMode !== undefined)
    frame.primaryAxisSizingMode = action.primaryAxisSizingMode;
  if (action.counterAxisSizingMode !== undefined)
    frame.counterAxisSizingMode = action.counterAxisSizingMode;
  if (action.primaryAxisAlignItems !== undefined)
    frame.primaryAxisAlignItems = action.primaryAxisAlignItems;
  if (action.counterAxisAlignItems !== undefined)
    frame.counterAxisAlignItems = action.counterAxisAlignItems;
  if (action.layoutGrow !== undefined)
    frame.layoutGrow = action.layoutGrow;
  if (action.layoutAlign !== undefined)
    frame.layoutAlign = action.layoutAlign;
  if (action.paddingLeft !== undefined) frame.paddingLeft = action.paddingLeft;
  if (action.paddingRight !== undefined) frame.paddingRight = action.paddingRight;
  if (action.paddingTop !== undefined) frame.paddingTop = action.paddingTop;
  if (action.paddingBottom !== undefined) frame.paddingBottom = action.paddingBottom;
  if (action.itemSpacing !== undefined) frame.itemSpacing = action.itemSpacing;
  if (action.layoutWrap !== undefined) frame.layoutWrap = action.layoutWrap;
  if (action.clipsContent !== undefined) frame.clipsContent = action.clipsContent;
  if (action.width !== undefined) frame.resize(action.width, frame.height);
  if (action.height !== undefined) frame.resize(frame.width, action.height);

  if (action.cornerRadius !== undefined) {
    frame.cornerRadius = action.cornerRadius;
  }

  return true;
}
