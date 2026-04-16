// Replay engine — replays individual recorded commands on each matched target
// layer, skipping "select layer" steps so that the edits apply to the target
// (which is already the active layer) instead of the original source.

const ps = require('./ps');
const logger = require('./logger');

async function runReplay(items, recording) {
  if (!recording) throw new Error('No recording to replay.');

  // Prefer per-command replay (skips layer-select steps). Fall back to the
  // old whole-action play if commands weren't extracted.
  if (recording.commands && recording.commands.length) {
    return replayByCommands(items, recording);
  }
  return replayByAction(items, recording);
}

// --- Per-command replay (new approach) ---

async function replayByCommands(items, recording) {
  const allCmds = recording.commands;
  const editCmds = allCmds.filter((c) => !c.isLayerSelect);
  const skipped = allCmds.length - editCmds.length;

  if (skipped > 0) {
    logger.info(`Filtered out ${skipped} layer-select step(s). Replaying ${editCmds.length} edit command(s) per target.`);
  }

  if (!editCmds.length) {
    logger.warn('No edit commands left after filtering — nothing to replay.');
    return [];
  }

  const results = [];

  await ps.executeAsModal(async () => {
    for (const it of items) {
      if (!it.selected || !it.canReplace) {
        results.push(skip(it, 'Deselected or blocked'));
        continue;
      }
      try {
        // Select the target layer.
        await ps.action.batchPlay([{
          _obj: 'select',
          _target: [{ _ref: 'layer', _id: it.targetLayer.id }],
          makeVisible: false,
        }], {});

        // Replay each edit command on the now-active target.
        for (const cmd of editCmds) {
          try {
            await ps.action.batchPlay([cmd.descriptor], {
              modalBehavior: 'execute',
            });
          } catch (cmdErr) {
            logger.warn(`  command "${cmd.name}" failed on "${it.target.name}": ${cmdErr.message || cmdErr}`);
          }
        }

        logger.info(`Replayed on "${it.target.name}" in ${it.target.documentName}`);
        results.push(ok(it));
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        logger.error(`Replay failed on "${it.target.name}": ${msg}`);
        results.push(err(it, msg));
      }
    }
  }, 'Replay recording');

  return results;
}

// --- Whole-action replay (fallback) ---

async function replayByAction(items, recording) {
  const { actionId, setName, actionName } = recording;
  const results = [];

  await ps.executeAsModal(async () => {
    for (const it of items) {
      if (!it.selected || !it.canReplace) {
        results.push(skip(it, 'Deselected or blocked'));
        continue;
      }
      try {
        await ps.action.batchPlay([{
          _obj: 'select',
          _target: [{ _ref: 'layer', _id: it.targetLayer.id }],
          makeVisible: false,
        }], {});

        const target = actionId
          ? [{ _ref: 'action', _id: actionId }]
          : [{ _ref: 'action', _name: actionName, _parent: { _ref: 'actionSet', _name: setName } }];

        await ps.action.batchPlay([{
          _obj: 'play',
          _target: target,
        }], {});

        logger.info(`Replayed on "${it.target.name}" in ${it.target.documentName}`);
        results.push(ok(it));
      } catch (e) {
        const msg = e && e.message ? e.message : String(e);
        logger.error(`Replay failed on "${it.target.name}": ${msg}`);
        results.push(err(it, msg));
      }
    }
  }, 'Replay recording');

  return results;
}

// --- Helpers ---

function ok(it) {
  return { targetId: it.target.id, documentName: it.target.documentName, targetPath: it.target.parentPath, status: 'success' };
}
function skip(it, reason) {
  logger.warn(`Skipped: ${it.target.name} — ${reason}`);
  return { targetId: it.target.id, documentName: it.target.documentName, targetPath: it.target.parentPath, status: 'skipped', message: reason };
}
function err(it, msg) {
  return { targetId: it.target.id, documentName: it.target.documentName, targetPath: it.target.parentPath, status: 'error', message: msg };
}

module.exports = { runReplay };
