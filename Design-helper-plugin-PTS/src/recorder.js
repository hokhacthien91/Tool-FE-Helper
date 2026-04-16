// Recorder — captures edit descriptors via notification listener while the
// user records edits in Photoshop, then filters and replays them on targets.
//
// Flow:
// 1. startRecording() — create action slot (PS visual feedback) + start listener.
// 2. User edits source layer in PS.
// 3. User clicks native ■ stop in Actions panel.
// 4. finishCapture() — stop listener, return captured descriptors.
// 5. Filter out select-layer + internal events.
// 6. Replay filtered descriptors on each target via batchPlay.

const photoshop = require('photoshop');
const logger = require('./logger');

const SET_NAME = 'RML_Recording';

// --- Capture state ---
let capturedDescriptors = [];
let listenerFn = null;
let capturing = false;

// Events to always ignore — internal PS system events.
const SYSTEM_EVENTS = new Set([
  'modalJavaScriptScopeEnter',
  'modalJavaScriptScopeExit',
  'historyStateChanged',
  'toolModalStateChanged',
  'invokeCommand',
  'queryAllowed',
  'wait',
  'idle',
]);

function makeActionName() {
  return 'rec_' + Date.now();
}

async function startRecording() {
  const actionName = makeActionName();

  // Create action slot — PS auto-starts recording, giving the user the red
  // dot visual feedback in the Actions panel.
  await photoshop.core.executeAsModal(async () => {
    try {
      await photoshop.action.batchPlay([{
        _obj: 'delete',
        _target: [{ _ref: 'actionSet', _name: SET_NAME }],
      }], {});
    } catch (_) {}

    await photoshop.action.batchPlay([{
      _obj: 'make',
      _target: [{ _ref: 'actionSet' }],
      using: { _obj: 'actionSet', name: SET_NAME },
    }], {});

    try {
      await photoshop.action.batchPlay([{
        _obj: 'select',
        _target: [{ _ref: 'actionSet', _name: SET_NAME }],
      }], {});
    } catch (_) {}

    await photoshop.action.batchPlay([{
      _obj: 'make',
      _target: [{ _ref: 'action' }],
      using: { _obj: 'action', name: actionName, parentName: SET_NAME },
    }], {});
  }, { commandName: 'Start recording' });

  // Start capturing AFTER action creation so we don't capture our own
  // setup descriptors.
  startCapturing();

  logger.info(`Recording started: set="${SET_NAME}" action="${actionName}"`);
  return { setName: SET_NAME, actionName };
}

function startCapturing() {
  capturedDescriptors = [];
  capturing = true;

  listenerFn = (event, descriptor) => {
    if (!capturing) return;
    if (!descriptor) return;

    // Skip internal/system events.
    if (SYSTEM_EVENTS.has(event)) return;
    if (descriptor.dontRecord === true) return;
    if (descriptor._isCommand === false) return;

    // Deep-clone the descriptor so PS can't mutate it later.
    let clone;
    try {
      clone = JSON.parse(JSON.stringify(descriptor));
    } catch (_) {
      clone = Object.assign({}, descriptor);
    }

    capturedDescriptors.push({ event, descriptor: clone });
  };

  try {
    photoshop.action.addNotificationListener([{ event: 'all' }], listenerFn);
  } catch (e) {
    logger.warn('Failed to start event listener: ' + (e.message || e));
  }
}

// Call after user has pressed native ■ stop.
function finishCapture() {
  capturing = false;
  if (listenerFn) {
    try {
      photoshop.action.removeNotificationListener([{ event: 'all' }], listenerFn);
    } catch (_) {}
    listenerFn = null;
  }

  const raw = capturedDescriptors.slice();
  capturedDescriptors = [];

  // Classify each captured descriptor.
  const commands = raw.map((item, i) => {
    const d = item.descriptor;
    const eventID = item.event || d._obj || '';
    const isLayerSelect = detectLayerSelect(eventID, d);
    return {
      index: i + 1,
      name: eventID,
      eventID,
      descriptor: d,
      isLayerSelect,
    };
  });

  return commands;
}

function detectLayerSelect(eventID, descriptor) {
  if (eventID !== 'select') return false;
  if (!descriptor) return false;
  try {
    const json = JSON.stringify(descriptor);
    return json.indexOf('"layer"') >= 0;
  } catch (_) { return false; }
}

// Read step count from the PS-side action (still needed to verify recording
// has stopped — Get fails while recording is active).
async function readStepCount(setName, actionName) {
  try {
    const res = await photoshop.action.batchPlay([{
      _obj: 'get',
      _target: [{ _ref: 'action', _name: actionName, _parent: { _ref: 'actionSet', _name: setName } }],
    }], { synchronousExecution: true });
    const d = res && res[0];
    if (!d) return { error: 'No descriptor returned' };
    if (d._obj === 'error') return { error: d.message || 'Get failed', stillRecording: /not currently available/i.test(d.message || '') };
    return { count: d.count || 0, id: d.ID };
  } catch (e) {
    return { error: e.message || String(e), stillRecording: true };
  }
}

function findRecordedAction(actionName) {
  try {
    const tree = photoshop.app.actionTree;
    if (!tree) return null;
    for (const set of Array.from(tree)) {
      try {
        const actions = Array.from(set.actions || []);
        for (const a of actions) if (a.name === actionName) return a;
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

async function cleanupRecording(setName) {
  // Also stop capturing in case user cancels mid-recording.
  if (capturing) finishCapture();

  const name = setName || SET_NAME;
  try {
    await photoshop.core.executeAsModal(async () => {
      await photoshop.action.batchPlay([{
        _obj: 'delete',
        _target: [{ _ref: 'actionSet', _name: name }],
      }], {});
    }, { commandName: 'Cleanup recording' });
    logger.info(`Deleted recording set "${name}"`);
    return true;
  } catch (e) {
    logger.warn('Cleanup failed: ' + (e.message || e));
    return false;
  }
}

module.exports = {
  startRecording, readStepCount, finishCapture,
  findRecordedAction, cleanupRecording, SET_NAME,
};
