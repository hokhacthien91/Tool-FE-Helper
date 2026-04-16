// Shared constants and type tags. Types themselves are documented via JSDoc.

const LayerType = {
  GROUP: 'group',
  TEXT: 'text',
  PIXEL: 'pixel',
  SHAPE: 'shape',
  SMART_OBJECT: 'smartObject',
  ADJUSTMENT: 'adjustment',
  ARTBOARD: 'artboard',
  OTHER: 'other',
};

const Risk = {
  SAFE: 'SAFE',
  LOCKED: 'LOCKED',
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  CLIPPING_RISK: 'CLIPPING_RISK',
  MASK_RISK: 'MASK_RISK',
  SMART_OBJECT_RISK: 'SMART_OBJECT_RISK',
  READ_ONLY_DOC: 'READ_ONLY_DOC',
  SOURCE_SUBTREE: 'SOURCE_SUBTREE',
};

module.exports = { LayerType, Risk };
