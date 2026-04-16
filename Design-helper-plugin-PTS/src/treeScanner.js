const ps = require('./ps');
const { buildMeta } = require('./sourceInspector');

// Returns flat list of { layer, meta } for every layer in the given roots.
// `roots` is an array of nodes (Documents, Groups, or Artboards).
function scan(roots) {
  const out = [];
  for (const root of roots) {
    const doc = resolveDoc(root);
    for (const layer of ps.walk(root)) {
      try {
        out.push({ layer, meta: buildMeta(layer, doc) });
      } catch (_) {
        // Skip nodes that fail to introspect.
      }
    }
  }
  return out;
}

function resolveDoc(node) {
  // Walk up until we hit something that looks like a Document.
  let cur = node;
  while (cur && cur.parent && cur.parent !== cur) {
    cur = cur.parent;
  }
  return cur;
}

module.exports = { scan };
