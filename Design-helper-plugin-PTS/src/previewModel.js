const { Risk } = require('./types');
const ps = require('./ps');

// Decorate raw matches into MatchResult-shaped items with risk flags and
// `canReplace` decision. Items with hard blockers will have canReplace=false.
function buildPreview(sourceMeta, sourceLayer, matchedItems, opts) {
  const skipLocked = !!(opts && opts.skipLockedTargets);
  return matchedItems.map((item) => {
    const flags = computeRisks(sourceMeta, item.meta, item.layer);
    const hardBlocked = skipLocked && flags.includes(Risk.LOCKED);
    return {
      source: sourceMeta,
      sourceLayer,
      target: item.meta,
      targetLayer: item.layer,
      riskFlags: flags.length ? flags : [Risk.SAFE],
      selected: !hardBlocked,
      canReplace: !hardBlocked,
    };
  });
}

function computeRisks(source, target, targetLayer) {
  const flags = [];
  if (target.locked) flags.push(Risk.LOCKED);
  if (source.type !== target.type) flags.push(Risk.TYPE_MISMATCH);
  if (target.isClippingMask || isInClippingChain(targetLayer)) flags.push(Risk.CLIPPING_RISK);
  if (target.hasMask) flags.push(Risk.MASK_RISK);
  if (target.type === 'smartObject' || source.type === 'smartObject') flags.push(Risk.SMART_OBJECT_RISK);
  return flags;
}

function isInClippingChain(layer) {
  try {
    const parent = ps.directParent(layer);
    if (!parent || !parent.layers) return false;
    const sibs = Array.from(parent.layers);
    const idx = sibs.findIndex((s) => ps.sameLayer(s, layer));
    if (idx < 0) return false;
    // Photoshop clipping clips to the layer below in the stack. If any sibling
    // in this stack is clipped, this position is part of a chain.
    for (const s of sibs) {
      try { if (s.isClippingMask) return true; } catch (_) {}
    }
    return false;
  } catch (_) { return false; }
}

// Group preview items for display: by document, then artboard/parent path.
function groupForView(items) {
  const byDoc = new Map();
  for (const it of items) {
    const docKey = it.target.documentName || it.target.documentId || '(unknown)';
    if (!byDoc.has(docKey)) byDoc.set(docKey, []);
    byDoc.get(docKey).push(it);
  }
  return byDoc;
}

module.exports = { buildPreview, groupForView };
