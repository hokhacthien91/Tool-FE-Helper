const ps = require('./ps');
const positioning = require('./positioning');
const logger = require('./logger');
const { Risk } = require('./types');

// Run the replace batch for the given preview items. All work happens inside
// a single executeAsModal so the user can undo it as one history step.
async function runReplace(items, config) {
  const cfg = withDefaults(config);
  const results = [];

  await ps.executeAsModal(async () => {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.selected || !it.canReplace) {
        results.push(skipResult(it, 'Deselected or blocked'));
        continue;
      }
      try {
        const r = await replaceOne(it, cfg);
        results.push(r);
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        logger.error(`Replace failed: ${describe(it)}`, { error: msg });
        results.push({
          targetId: it.target.id,
          documentName: it.target.documentName,
          targetPath: it.target.parentPath,
          status: 'error',
          message: msg,
        });
      }
    }
  }, 'Replace Matching Layers');

  return results;
}

async function replaceOne(item, cfg) {
  const targetLayer = item.targetLayer;
  const sourceLayer = item.sourceLayer;
  const targetMeta = item.target;

  if (cfg.skipLockedTargets && targetMeta.locked) {
    return skipResult(item, 'Locked target skipped');
  }

  // Capture state before mutation.
  const targetParent = ps.directParent(targetLayer);
  const targetIndex = ps.layerIndexInParent(targetLayer);
  const targetBounds = ps.getBounds(targetLayer);
  const targetVis = !!targetLayer.visible;
  const targetOpacity = safeGet(() => targetLayer.opacity);
  const targetBlend = safeGet(() => targetLayer.blendMode);
  const targetName = targetMeta.name;

  // Duplicate source so the new node lands right next to the target. Putting
  // the duplicate directly relative to the target avoids a separate move step.
  let dupe;
  try {
    dupe = await sourceLayer.duplicate(targetLayer, ps.PLACEMENT.PLACEBEFORE);
  } catch (_) {
    // Fallback: duplicate without placement, then move into place below.
    dupe = await sourceLayer.duplicate();
  }
  if (!dupe) throw new Error('Source duplicate returned no layer');

  // Make sure the duplicate ends up under the target's parent. It usually does
  // when placed PLACEBEFORE the target, but `duplicate()` without placement
  // would keep it next to the source.
  try {
    if (targetParent && ps.directParent(dupe) !== targetParent) {
      await dupe.move(targetLayer, ps.PLACEMENT.PLACEBEFORE);
    }
  } catch (_) {}

  // Match position.
  await positioning.applyPosition(dupe, item.source.bounds, targetBounds, cfg.positionMode, cfg.anchor);

  // Apply preserve options.
  if (cfg.preserveVisibility) {
    try { dupe.visible = targetVis; } catch (_) {}
  }
  if (cfg.preserveOpacity && targetOpacity != null) {
    try { dupe.opacity = targetOpacity; } catch (_) {}
  }
  if (cfg.preserveBlendMode && targetBlend) {
    try { dupe.blendMode = targetBlend; } catch (_) {}
  }
  if (!cfg.useSourceName && targetName) {
    try { dupe.name = targetName; } catch (_) {}
  }

  // Finally remove the original target.
  try {
    await targetLayer.delete();
  } catch (e) {
    // Roll back the duplicate so we don't leave artefacts behind.
    try { await dupe.delete(); } catch (_) {}
    throw new Error('Failed to delete original target: ' + (e && e.message ? e.message : e));
  }

  logger.info(`Replaced "${targetMeta.name}" in ${targetMeta.documentName}`, {
    path: targetMeta.parentPath,
    risks: item.riskFlags,
  });

  return {
    targetId: targetMeta.id,
    documentName: targetMeta.documentName,
    targetPath: targetMeta.parentPath,
    status: 'success',
  };
}

function skipResult(item, message) {
  logger.warn(`Skipped: ${describe(item)}`, { reason: message });
  return {
    targetId: item.target.id,
    documentName: item.target.documentName,
    targetPath: item.target.parentPath,
    status: 'skipped',
    message,
  };
}

function describe(item) {
  return `${item.target.documentName}/${item.target.parentPath}/${item.target.name}`;
}

function safeGet(fn) {
  try { return fn(); } catch (_) { return null; }
}

function withDefaults(c) {
  const cfg = c || {};
  return {
    positionMode: cfg.positionMode || 'keepTargetBounds',
    anchor: cfg.anchor || 'topLeft',
    preserveVisibility: !!cfg.preserveVisibility,
    preserveOpacity: !!cfg.preserveOpacity,
    preserveBlendMode: !!cfg.preserveBlendMode,
    useSourceName: cfg.useSourceName !== false,
    skipLockedTargets: cfg.skipLockedTargets !== false,
  };
}

module.exports = { runReplace };
