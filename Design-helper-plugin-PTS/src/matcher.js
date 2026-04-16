const ps = require('./ps');

// Compute the parent path relative to the nearest artboard ancestor (if any),
// otherwise relative to the document root.
function artboardRelativeParentPath(meta) {
  if (!meta.artboardName) return meta.parentPath || '';
  const segs = (meta.parentPath || '').split('/').filter(Boolean);
  const idx = segs.indexOf(meta.artboardName);
  if (idx < 0) return segs.join('/');
  return segs.slice(idx + 1).join('/');
}

function matches(source, candidate, rules) {
  if (rules.exactName && source.name !== candidate.name) return false;
  if (rules.sameType && source.type !== candidate.type) return false;
  if (rules.sameParentPath) {
    const a = artboardRelativeParentPath(source);
    const b = artboardRelativeParentPath(candidate);
    if (a !== b) return false;
  }
  if (rules.sameArtboardName && (source.artboardName || null) !== (candidate.artboardName || null)) {
    return false;
  }
  return true;
}

// Returns matches for a source against an array of { layer, meta } scanned items.
function findMatches(sourceMeta, scanned, rules, opts) {
  const opt = opts || {};
  const out = [];
  for (const item of scanned) {
    // Never match the source layer itself.
    if (sameMeta(item.meta, sourceMeta)) continue;
    // Optional: skip the entire subtree under the source's parent (V1: skip
    // anything inside the source group itself).
    if (opt.excludeSourceSubtree && isInsideSourceSubtree(item.meta, sourceMeta)) continue;
    if (matches(sourceMeta, item.meta, rules)) {
      out.push(item);
    }
  }
  return out;
}

function sameMeta(a, b) {
  if (!a || !b) return false;
  if (a.id != null && b.id != null && a.documentId === b.documentId) return a.id === b.id;
  return a.documentId === b.documentId
    && a.parentPath === b.parentPath
    && a.name === b.name
    && a.layerIndex === b.layerIndex;
}

function isInsideSourceSubtree(candidate, source) {
  if (candidate.documentId !== source.documentId) return false;
  // Source must be a group/artboard for it to have a subtree.
  const prefix = source.parentPath ? source.parentPath + '/' + source.name : source.name;
  const candidateParent = candidate.parentPath || '';
  return candidateParent === prefix || candidateParent.indexOf(prefix + '/') === 0;
}

module.exports = { findMatches, matches, artboardRelativeParentPath };
