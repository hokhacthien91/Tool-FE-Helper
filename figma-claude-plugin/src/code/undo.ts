// Track actions for undo support
// Stores node IDs created by the last batch so they can be removed

interface UndoEntry {
  timestamp: number;
  createdNodeIds: string[];
  description: string;
}

var undoStack: UndoEntry[] = [];
var MAX_UNDO = 10;

export function pushUndo(createdNodeIds: string[], description: string) {
  undoStack.push({
    timestamp: Date.now(),
    createdNodeIds: createdNodeIds,
    description: description,
  });
  if (undoStack.length > MAX_UNDO) {
    undoStack.shift();
  }
}

export async function popUndo(): Promise<{ removed: number; description: string } | null> {
  var entry = undoStack.pop();
  if (!entry) return null;

  var removed = 0;
  for (var i = 0; i < entry.createdNodeIds.length; i++) {
    var node = await figma.getNodeByIdAsync(entry.createdNodeIds[i]);
    if (node && 'remove' in node) {
      (node as SceneNode).remove();
      removed++;
    }
  }

  return { removed: removed, description: entry.description };
}

export function getUndoCount(): number {
  return undoStack.length;
}

export function getLastUndoDescription(): string | null {
  if (undoStack.length === 0) return null;
  return undoStack[undoStack.length - 1].description;
}
