const ps = require('./ps');

function readSource() {
  const doc = ps.getActiveDocument();
  if (!doc) return { error: 'No active document. Open a PSD and select a layer or group.' };

  const sel = ps.getSelectedLayers(doc);
  if (sel.length === 0) return { error: 'No selection. Select exactly one layer or group.' };
  if (sel.length > 1) return { error: `Selection has ${sel.length} layers. Select exactly one.` };

  const layer = sel[0];
  const meta = buildMeta(layer, doc);
  return { meta, layer, doc };
}

function buildMeta(layer, doc) {
  const artboard = ps.findArtboard(layer);
  return {
    id: safeId(layer),
    documentId: safeId(doc),
    documentName: doc ? (doc.title || doc.name || '') : '',
    artboardId: artboard ? safeId(artboard) : null,
    artboardName: artboard ? artboard.name : null,
    name: layer.name || '',
    type: ps.mapLayerType(layer),
    parentId: safeId(ps.directParent(layer)),
    parentPath: ps.parentPath(layer),
    layerIndex: ps.layerIndexInParent(layer),
    bounds: ps.getBounds(layer),
    visible: !!layer.visible,
    opacity: safeNumber(() => layer.opacity),
    blendMode: safeString(() => layer.blendMode),
    locked: ps.isLocked(layer),
    hasMask: ps.hasMask(layer),
    isClippingMask: ps.isClippingMask(layer),
  };
}

function safeId(x) {
  if (!x) return null;
  try { return x.id != null ? String(x.id) : null; } catch (_) { return null; }
}

function safeNumber(fn) {
  try { const v = fn(); return typeof v === 'number' ? v : null; } catch (_) { return null; }
}

function safeString(fn) {
  try { const v = fn(); return typeof v === 'string' ? v : null; } catch (_) { return null; }
}

module.exports = { readSource, buildMeta };
