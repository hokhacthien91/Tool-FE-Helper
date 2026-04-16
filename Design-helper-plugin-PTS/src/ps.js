// Thin, defensive wrapper around the Photoshop UXP API so the rest of the
// plugin can stay independent of exact API surface differences between PS
// versions.

const photoshop = require('photoshop');
const { LayerType } = require('./types');

const app = photoshop.app;
const core = photoshop.core;
const action = photoshop.action;
const constants = photoshop.constants;

const PLACEMENT = constants && constants.ElementPlacement ? constants.ElementPlacement : {
  PLACEBEFORE: 'placeBefore',
  PLACEAFTER: 'placeAfter',
  PLACEATBEGINNING: 'placeAtBeginning',
  PLACEATEND: 'placeAtEnd',
  PLACEINSIDE: 'placeInside',
};

function getActiveDocument() {
  return app.activeDocument || null;
}

function getOpenedDocuments() {
  return Array.from(app.documents || []);
}

function getSelectedLayers(doc) {
  const d = doc || app.activeDocument;
  if (!d) return [];
  return Array.from(d.activeLayers || []);
}

function isGroup(layer) {
  if (!layer) return false;
  if (typeof layer.layers !== 'undefined' && layer.layers !== null) return true;
  const kind = layer.kind;
  return kind === 'layerGroup' || kind === 'group' || kind === (constants && constants.LayerKind && constants.LayerKind.group);
}

function isArtboard(layer) {
  if (!layer) return false;
  try {
    if (layer.isArtboard === true) return true;
  } catch (_) {}
  try {
    if (constants && constants.LayerKind && layer.kind === constants.LayerKind.artboard) return true;
  } catch (_) {}
  try {
    const id = layer._id || layer.id;
    if (id == null) return false;
    const [res] = action.batchPlay(
      [{ _obj: 'get', _target: [{ _property: 'artboardEnabled' }, { _ref: 'layer', _id: id }] }],
      { synchronousExecution: true, modalBehavior: 'execute' }
    );
    return !!(res && res.artboardEnabled);
  } catch (_) {
    return false;
  }
}

function mapLayerType(layer) {
  if (!layer) return LayerType.OTHER;
  if (isArtboard(layer)) return LayerType.ARTBOARD;
  if (isGroup(layer)) return LayerType.GROUP;
  const k = layer.kind;
  const LK = (constants && constants.LayerKind) || {};
  if (k === LK.text || k === 'text') return LayerType.TEXT;
  if (k === LK.smartObject || k === 'smartObject') return LayerType.SMART_OBJECT;
  if (k === LK.vector || k === 'vector' || k === 'shape' || k === LK.solidColor || k === LK.gradient || k === LK.pattern) return LayerType.SHAPE;
  if (k === LK.adjustment || k === 'adjustment') return LayerType.ADJUSTMENT;
  if (k === LK.pixel || k === 'pixel' || k === LK.background || k === 'background') return LayerType.PIXEL;
  return LayerType.OTHER;
}

function getBounds(layer) {
  try {
    const b = layer.bounds;
    if (!b) return null;
    const left = b.left, top = b.top, right = b.right, bottom = b.bottom;
    return {
      left, top, right, bottom,
      width: right - left,
      height: bottom - top,
    };
  } catch (_) { return null; }
}

function isLocked(layer) {
  try {
    if (layer.allLocked) return true;
    if (layer.locked === true) return true;
  } catch (_) {}
  return false;
}

function hasMask(layer) {
  try { return !!layer.hasMask; } catch (_) { return false; }
}

function isClippingMask(layer) {
  try { return !!layer.isClippingMask; } catch (_) { return false; }
}

// Walk up `.parent` chain. Returns array of ancestor groups/artboards, closest first.
function ancestors(layer) {
  const chain = [];
  let cur = layer && layer.parent;
  while (cur && cur !== cur.parent && isLayerLike(cur)) {
    chain.push(cur);
    cur = cur.parent;
  }
  return chain;
}

function isLayerLike(x) {
  // Documents do not have `.parent` that is another layer. This also filters out
  // the Document itself.
  return x && typeof x.name === 'string' && !(x.backgroundLayer !== undefined && x.activeLayers !== undefined);
}

function parentPath(layer) {
  return ancestors(layer).map((n) => n.name).reverse().join('/');
}

function findArtboard(layer) {
  const chain = ancestors(layer);
  for (const a of chain) if (isArtboard(a)) return a;
  if (isArtboard(layer)) return layer;
  return null;
}

function directParent(layer) {
  try {
    const p = layer.parent;
    return p || null;
  } catch (_) { return null; }
}

function layerIndexInParent(layer) {
  const parent = directParent(layer);
  if (!parent) return -1;
  const siblings = getChildren(parent);
  for (let i = 0; i < siblings.length; i++) {
    if (sameLayer(siblings[i], layer)) return i;
  }
  return -1;
}

function sameLayer(a, b) {
  if (!a || !b) return false;
  try { if (a.id != null && b.id != null) return a.id === b.id; } catch (_) {}
  return a === b;
}

function getChildren(parentNode) {
  if (!parentNode) return [];
  const list = parentNode.layers;
  if (!list) return [];
  return Array.from(list);
}

// Yields every descendant layer under the given node (inclusive false).
function* walk(node) {
  const kids = getChildren(node);
  for (const child of kids) {
    yield child;
    if (isGroup(child) || isArtboard(child)) {
      yield* walk(child);
    }
  }
}

async function executeAsModal(fn, commandName) {
  return core.executeAsModal(async (ctx) => {
    if (ctx && ctx.hostControl && typeof ctx.hostControl.suspendHistory === 'function') {
      let historyId = null;
      try {
        historyId = await ctx.hostControl.suspendHistory({
          documentID: app.activeDocument ? app.activeDocument.id : undefined,
          name: commandName || 'Replace Matching Layers',
        });
      } catch (_) { historyId = null; }
      try {
        return await fn(ctx);
      } finally {
        if (historyId != null) {
          try { await ctx.hostControl.resumeHistory(historyId); } catch (_) {}
        }
      }
    }
    return fn(ctx);
  }, { commandName: commandName || 'Replace Matching Layers' });
}

function setActiveDocument(doc) {
  try { app.activeDocument = doc; } catch (_) {}
}

module.exports = {
  app, core, action, constants, PLACEMENT,
  getActiveDocument, getOpenedDocuments, getSelectedLayers,
  isGroup, isArtboard, mapLayerType, getBounds, isLocked, hasMask, isClippingMask,
  ancestors, parentPath, findArtboard, directParent, layerIndexInParent,
  sameLayer, getChildren, walk, executeAsModal, setActiveDocument,
};
