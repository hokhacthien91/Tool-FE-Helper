export interface SetEffectsAction {
  type: 'setEffects';
  nodeId: string;
  effects: Array<{
    type: 'DROP_SHADOW' | 'INNER_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
    color?: string;
    opacity?: number;
    offsetX?: number;
    offsetY?: number;
    radius?: number;
    spread?: number;
  }>;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  var h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16) / 255,
    g: parseInt(h.substring(2, 4), 16) / 255,
    b: parseInt(h.substring(4, 6), 16) / 255,
  };
}

export async function executeSetEffects(action: SetEffectsAction): Promise<boolean> {
  var node = await figma.getNodeByIdAsync(action.nodeId);
  if (!node || !('effects' in node)) {
    console.error('[SetEffects] Node not found: ' + action.nodeId);
    return false;
  }

  var sceneNode = node as SceneNode & BlendMixin;
  var newEffects: Effect[] = [];

  for (var i = 0; i < action.effects.length; i++) {
    var e = action.effects[i];

    if (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW') {
      var rgb = hexToRgb(e.color || '#000000');
      newEffects.push({
        type: e.type,
        visible: true,
        color: {
          r: rgb.r,
          g: rgb.g,
          b: rgb.b,
          a: e.opacity !== undefined ? e.opacity : 0.25,
        },
        offset: {
          x: e.offsetX !== undefined ? e.offsetX : 0,
          y: e.offsetY !== undefined ? e.offsetY : 4,
        },
        radius: e.radius !== undefined ? e.radius : 8,
        spread: e.spread !== undefined ? e.spread : 0,
        blendMode: 'NORMAL',
      });
    } else if (e.type === 'LAYER_BLUR' || e.type === 'BACKGROUND_BLUR') {
      newEffects.push({
        type: e.type,
        visible: true,
        radius: e.radius !== undefined ? e.radius : 10,
      });
    }
  }

  sceneNode.effects = newEffects;
  return true;
}
