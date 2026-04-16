const ps = require('./ps');

// Resolve the requested scope into an array of root nodes that the scanner
// can walk. Roots are either Documents, Artboards, or Groups.
function resolveScope(scope, sourceCtx) {
  switch (scope) {
    case 'currentDocument':
      return docToRoots(ps.getActiveDocument());
    case 'selectedArtboards':
      return resolveSelectedArtboards();
    case 'openedDocuments':
      return ps.getOpenedDocuments().flatMap(docToRoots);
    case 'selectedFiles':
    case 'folderRecursive':
      // V2: requires opening external PSDs through file pickers + persistent
      // storage entitlements. Surface a clear error to the UI for now.
      throw new Error(`Scope "${scope}" is not implemented yet (V2).`);
    default:
      return docToRoots(ps.getActiveDocument());
  }
}

function docToRoots(doc) {
  return doc ? [doc] : [];
}

function resolveSelectedArtboards() {
  const doc = ps.getActiveDocument();
  if (!doc) return [];
  const sel = ps.getSelectedLayers(doc);
  const artboards = [];
  const seen = new Set();
  for (const layer of sel) {
    const ab = ps.findArtboard(layer) || (ps.isArtboard(layer) ? layer : null);
    if (ab && !seen.has(ab.id)) {
      seen.add(ab.id);
      artboards.push(ab);
    }
  }
  if (artboards.length === 0) {
    throw new Error('No artboards in selection. Select at least one layer inside an artboard.');
  }
  return artboards;
}

module.exports = { resolveScope };
