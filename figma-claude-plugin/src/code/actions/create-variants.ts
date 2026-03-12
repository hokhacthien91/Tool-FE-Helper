export interface CreateVariantsAction {
  type: 'createVariants';
  sourceNodeId: string;
  count: number;
  spacing?: number;
  direction?: 'vertical' | 'horizontal';
  namePrefix?: string;
  variantNames?: string[];
}

export async function executeCreateVariants(
  action: CreateVariantsAction
): Promise<SceneNode[]> {
  const node = await figma.getNodeByIdAsync(action.sourceNodeId);
  if (!node || !('clone' in node)) {
    console.error(`[CreateVariants] Node not found: ${action.sourceNodeId}`);
    return [];
  }

  const source = node as SceneNode;
  const spacing = action.spacing ?? 100;
  const direction = action.direction ?? 'vertical';
  const clones: SceneNode[] = [];

  for (let i = 0; i < action.count; i++) {
    const cloned = source.clone();

    // Name
    if (action.variantNames && action.variantNames[i]) {
      cloned.name = action.variantNames[i];
    } else if (action.namePrefix) {
      cloned.name = `${action.namePrefix} ${i + 1}`;
    } else {
      cloned.name = `${source.name} - Variant ${i + 1}`;
    }

    // Position
    if (direction === 'vertical') {
      cloned.x = source.x;
      cloned.y = source.y + (source.height + spacing) * (i + 1);
    } else {
      cloned.x = source.x + (source.width + spacing) * (i + 1);
      cloned.y = source.y;
    }

    clones.push(cloned);
  }

  return clones;
}
