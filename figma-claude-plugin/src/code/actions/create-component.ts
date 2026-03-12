export interface CreateComponentAction {
  type: 'createComponent';
  sourceNodeId: string;
  name?: string;
}

export interface CreateInstanceAction {
  type: 'createInstance';
  componentNodeId: string;
  name?: string;
  x?: number;
  y?: number;
}

export async function executeCreateComponent(action: CreateComponentAction): Promise<SceneNode | null> {
  var node = await figma.getNodeByIdAsync(action.sourceNodeId);
  if (!node) {
    console.error('[CreateComponent] Node not found: ' + action.sourceNodeId);
    return null;
  }

  // If it's already a component, just rename
  if (node.type === 'COMPONENT') {
    if (action.name) node.name = action.name;
    return node as SceneNode;
  }

  // If it's a frame, convert to component
  if (node.type === 'FRAME' || node.type === 'GROUP') {
    var component = figma.createComponent();
    var frame = node as FrameNode;

    component.name = action.name || frame.name;
    component.x = frame.x;
    component.y = frame.y;
    component.resize(frame.width, frame.height);

    // Copy layout properties if frame
    if (node.type === 'FRAME') {
      component.layoutMode = frame.layoutMode;
      if (frame.layoutMode !== 'NONE') {
        component.primaryAxisSizingMode = frame.primaryAxisSizingMode;
        component.counterAxisSizingMode = frame.counterAxisSizingMode;
        component.paddingLeft = frame.paddingLeft;
        component.paddingRight = frame.paddingRight;
        component.paddingTop = frame.paddingTop;
        component.paddingBottom = frame.paddingBottom;
        component.itemSpacing = frame.itemSpacing;
      }
      component.fills = JSON.parse(JSON.stringify(frame.fills));
      component.strokes = JSON.parse(JSON.stringify(frame.strokes));
      if (frame.cornerRadius !== figma.mixed) {
        component.cornerRadius = frame.cornerRadius as number;
      }
    }

    // Move children to component
    var children = [];
    for (var i = 0; i < frame.children.length; i++) {
      children.push(frame.children[i]);
    }
    for (var j = 0; j < children.length; j++) {
      component.appendChild(children[j]);
    }

    // Insert component where frame was
    var parent = frame.parent;
    if (parent && 'insertChild' in parent) {
      var idx = parent.children.indexOf(frame);
      (parent as FrameNode).insertChild(idx, component);
    }

    frame.remove();
    return component;
  }

  return null;
}

export async function executeCreateInstance(action: CreateInstanceAction): Promise<SceneNode | null> {
  var node = await figma.getNodeByIdAsync(action.componentNodeId);
  if (!node || node.type !== 'COMPONENT') {
    console.error('[CreateInstance] Component not found: ' + action.componentNodeId);
    return null;
  }

  var component = node as ComponentNode;
  var instance = component.createInstance();

  if (action.name) instance.name = action.name;
  if (action.x !== undefined) instance.x = action.x;
  if (action.y !== undefined) instance.y = action.y;

  return instance;
}
