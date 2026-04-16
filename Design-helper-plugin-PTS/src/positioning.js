const ps = require('./ps');

// Apply a position mode to `newLayer` so it lines up with the original target's
// bounds (which were captured before the target was deleted).
async function applyPosition(newLayer, sourceBounds, targetBounds, mode, anchor) {
  if (!targetBounds) return;
  const cur = ps.getBounds(newLayer);
  if (!cur) return;

  if (mode === 'useSourcePosition') return;

  if (mode === 'keepTargetAnchor') {
    const a = anchor || 'topLeft';
    const dx = targetBounds.left - cur.left + anchorOffsetX(a, targetBounds, cur);
    const dy = targetBounds.top - cur.top + anchorOffsetY(a, targetBounds, cur);
    if (dx || dy) await safeTranslate(newLayer, dx, dy);
    return;
  }

  // keepTargetBounds: scale to match target dimensions, then translate.
  if (cur.width > 0 && cur.height > 0
    && (Math.abs(cur.width - targetBounds.width) > 0.5 || Math.abs(cur.height - targetBounds.height) > 0.5)) {
    const sx = (targetBounds.width / cur.width) * 100;
    const sy = (targetBounds.height / cur.height) * 100;
    await safeScale(newLayer, sx, sy);
  }
  const after = ps.getBounds(newLayer) || cur;
  const dx = targetBounds.left - after.left;
  const dy = targetBounds.top - after.top;
  if (dx || dy) await safeTranslate(newLayer, dx, dy);
}

function anchorOffsetX(anchor, target, cur) {
  switch (anchor) {
    case 'center': return (target.width - cur.width) / 2;
    case 'bottomLeft': return 0;
    default: return 0;
  }
}
function anchorOffsetY(anchor, target, cur) {
  switch (anchor) {
    case 'center': return (target.height - cur.height) / 2;
    case 'bottomLeft': return target.height - cur.height;
    default: return 0;
  }
}

async function safeTranslate(layer, dx, dy) {
  try {
    if (typeof layer.translate === 'function') {
      await layer.translate(dx, dy);
      return;
    }
  } catch (_) {}
  // Fallback via batchPlay
  try {
    await ps.action.batchPlay([{
      _obj: 'move',
      _target: [{ _ref: 'layer', _id: layer.id }],
      to: { _obj: 'offset', horizontal: { _unit: 'pixelsUnit', _value: dx }, vertical: { _unit: 'pixelsUnit', _value: dy } },
    }], {});
  } catch (_) {}
}

async function safeScale(layer, xPercent, yPercent) {
  try {
    if (typeof layer.scale === 'function') {
      await layer.scale(xPercent, yPercent);
      return;
    }
  } catch (_) {}
  try {
    await ps.action.batchPlay([{
      _obj: 'transform',
      _target: [{ _ref: 'layer', _id: layer.id }],
      freeTransformCenterState: { _enum: 'quadCenterState', _value: 'QCSAverage' },
      width: { _unit: 'percentUnit', _value: xPercent },
      height: { _unit: 'percentUnit', _value: yPercent },
      interfaceIconFrameDimmed: { _enum: 'interpolationType', _value: 'bicubic' },
    }], {});
  } catch (_) {}
}

module.exports = { applyPosition };
