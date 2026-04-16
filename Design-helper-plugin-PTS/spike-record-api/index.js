// Spike plugin — exhaustive probing of the UXP Record API.
//
// Theory: when PS is recording, every batchPlay descriptor is *captured* into
// the action. The native Stop button therefore cannot be a recorded command —
// it must use a non-recordable code path. We probe several ways to hit that
// path from batchPlay.

const photoshop = require('photoshop');
const app = photoshop.app;
const core = photoshop.core;
const action = photoshop.action;
const constants = photoshop.constants;

const SET_NAME = 'RML_Spike';
const ACTION_NAME = 'rec1';

const logEl = () => document.getElementById('log');

// Dedupe consecutive identical lines — keeps the log readable.
let lastLine = null;
let lastLineEl = null;
let lastLineCount = 0;

function line(text, cls) {
  const el = logEl();
  if (text === lastLine && lastLineEl) {
    lastLineCount += 1;
    lastLineEl.textContent = text + `  ×${lastLineCount}\n`;
    el.scrollTop = el.scrollHeight;
    return;
  }
  const span = document.createElement('span');
  if (cls) span.className = cls;
  span.textContent = text + '\n';
  el.appendChild(span);
  el.scrollTop = el.scrollHeight;
  lastLine = text;
  lastLineEl = span;
  lastLineCount = 1;
}

function ok(t) { line('✅ ' + t, 'ok'); }
function warn(t) { line('⚠️  ' + t, 'warn'); }
function err(t) { line('❌ ' + t, 'err'); }
function dim(t) { line(t, 'dim'); }
function info(t) { line(t); }
function hr() { dim('────────────────'); }

function stringify(obj, max = 3000) {
  try {
    const s = JSON.stringify(obj, safeReplacer(), 2);
    return s.length > max ? s.slice(0, max) + '\n…(truncated)' : s;
  } catch (_) { return String(obj); }
}

function safeReplacer() {
  const seen = new WeakSet();
  return (k, v) => {
    if (typeof v === 'object' && v !== null) {
      if (seen.has(v)) return '[cycle]';
      seen.add(v);
    }
    if (typeof v === 'function') return '[fn]';
    return v;
  };
}

async function modal(fn, name) {
  return core.executeAsModal(fn, { commandName: name || 'RML Spike' });
}

function getErrorFromResult(res) {
  if (!res) return null;
  const arr = Array.isArray(res) ? res : [res];
  for (const r of arr) {
    if (r && r._obj === 'error') return r.message || 'unknown error';
  }
  return null;
}

// ----------------------------- Setup ------------------------------------

async function test1_createSetAndAction() {
  hr();
  try {
    await modal(async () => {
      try {
        await action.batchPlay([{
          _obj: 'delete',
          _target: [{ _ref: 'actionSet', _name: SET_NAME }],
        }], {});
        dim(`(pre-cleanup: deleted "${SET_NAME}")`);
      } catch (_) {}

      await action.batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'actionSet' }],
        using: { _obj: 'actionSet', name: SET_NAME },
      }], {});
      ok(`Created action set "${SET_NAME}"`);

      // Bug-fix attempt: target actionSet first, then create action inside.
      // Some PS versions need a select-actionSet step first.
      try {
        await action.batchPlay([{
          _obj: 'select',
          _target: [{ _ref: 'actionSet', _name: SET_NAME }],
        }], {});
        dim(`Selected set "${SET_NAME}" before creating action`);
      } catch (_) {}

      await action.batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'action' }],
        using: { _obj: 'action', name: ACTION_NAME, parentName: SET_NAME },
      }], {});
      ok(`Created action "${ACTION_NAME}"`);
    }, 'Create set + action');
  } catch (e) {
    err('Test 1 failed: ' + e.message);
  }
}

async function verifyParent() {
  try {
    const res = await action.batchPlay([{
      _obj: 'get',
      _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
    }], { synchronousExecution: true });
    const d = res && res[0];
    if (!d) { err('No descriptor returned'); return; }
    const parent = d.parentName;
    if (parent === SET_NAME) {
      ok(`parentName = "${parent}" ✓ correct`);
    } else {
      err(`parentName = "${parent}" — expected "${SET_NAME}"`);
    }
    dim(stringify(d));
  } catch (e) {
    err('Verify failed: ' + e.message);
  }
}

async function cleanup() {
  try {
    await modal(async () => {
      await action.batchPlay([{
        _obj: 'delete',
        _target: [{ _ref: 'actionSet', _name: SET_NAME }],
      }], {});
    }, 'Delete set');
    ok(`Deleted set "${SET_NAME}"`);
  } catch (e) {
    err('Cleanup failed: ' + e.message);
  }
}

// ----------------------------- Try descriptor helper -----------------------

async function tryDescriptor(label, descriptor, options) {
  hr();
  info(`— ${label} —`);
  dim('descriptor: ' + stringify(descriptor, 800));
  if (options) dim('options: ' + stringify(options, 400));
  try {
    const res = await modal(async () => {
      return action.batchPlay([descriptor], options || {});
    }, label);
    const errMsg = getErrorFromResult(res);
    if (errMsg) {
      err(`${label}: PS returned error — ${errMsg}`);
    } else {
      ok(`${label}: no error`);
    }
    dim('result: ' + stringify(res, 800));
  } catch (e) {
    err(`${label}: threw — ${e.message}`);
  }
}

// ----------------------------- Start recording -----------------------------

async function startA() {
  await tryDescriptor('start: record', {
    _obj: 'record',
    _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
  });
}
async function startB() {
  await tryDescriptor('start: startRecording', {
    _obj: 'startRecording',
    _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
  });
}
async function startC() {
  await tryDescriptor('start: set recording=true', {
    _obj: 'set',
    _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
    to: { _obj: 'action', recording: true },
  });
}

// ----------------------------- Stop — new approaches -----------------------

// A — stop with _isCommand:false option. Our theory: non-recordable flag.
async function stopA() {
  await tryDescriptor('stop A: bare stop + _isCommand:false',
    { _obj: 'stop' },
    { _isCommand: false }
  );
}

// B — stop with suppressMessages true.
async function stopB() {
  await tryDescriptor('stop B: stop + suppressMessages',
    { _obj: 'stop' },
    { synchronousExecution: true, modalBehavior: 'execute', suppressMessages: true }
  );
}

// C — descriptor-level _options block, common flag in internal PS descriptors.
async function stopC() {
  await tryDescriptor('stop C: stop + _options.doNotRecord',
    { _obj: 'stop', _options: { doNotRecord: true, dialogOptions: 'dontDisplay' } }
  );
}

// D — endRecording verb.
async function stopD() {
  await tryDescriptor('stop D: endRecording',
    { _obj: 'endRecording' },
    { _isCommand: false }
  );
}

// E — stopAction
async function stopE() {
  await tryDescriptor('stop E: stopAction',
    { _obj: 'stopAction' },
    { _isCommand: false }
  );
}

// F — recordStop
async function stopF() {
  await tryDescriptor('stop F: recordStop',
    { _obj: 'recordStop' },
    { _isCommand: false }
  );
}

async function stopG() { await tryDescriptor('stop G: finish', { _obj: 'finish' }, { _isCommand: false }); }
async function stopH() { await tryDescriptor('stop H: cancel', { _obj: 'cancel' }, { _isCommand: false }); }
async function stopI() { await tryDescriptor('stop I: terminate', { _obj: 'terminate' }, { _isCommand: false }); }
async function stopJ() { await tryDescriptor('stop J: pause', { _obj: 'pause' }, { _isCommand: false }); }
async function stopK() { await tryDescriptor('stop K: break', { _obj: 'break' }, { _isCommand: false }); }
async function stopL() { await tryDescriptor('stop L: abort', { _obj: 'abort' }, { _isCommand: false }); }

// --- Inspired by listener catching PS's own modalJavaScriptScopeEnter/Exit ---

async function stopM() {
  await tryDescriptor('stop M: stop + top-level flags', {
    _obj: 'stop',
    dontRecord: true,
    forceNotify: true,
    _isCommand: false,
  });
}

async function stopN() {
  await tryDescriptor('stop N: set recording=false + top-level flags', {
    _obj: 'set',
    _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
    to: { _obj: 'action', recording: false },
    dontRecord: true,
    forceNotify: true,
    _isCommand: false,
  });
}

async function stopO() {
  await tryDescriptor('stop O: stopRecording + top-level flags', {
    _obj: 'stopRecording',
    dontRecord: true,
    forceNotify: true,
    _isCommand: false,
  });
}

async function stopP() {
  await tryDescriptor('stop P: record false + top-level flags', {
    _obj: 'record',
    _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
    record: false,
    dontRecord: true,
    forceNotify: true,
    _isCommand: false,
  });
}

async function stopQ() {
  await tryDescriptor('stop Q: modalJavaScriptScopeExit (mimic PS internal)', {
    _obj: 'modalJavaScriptScopeExit',
    dontRecord: true,
    forceNotify: true,
    _isCommand: false,
  });
}

// Legacy
async function stop3a() { await tryDescriptor('stop 3a: stop (bare, no options)', { _obj: 'stop' }); }
async function stop3b() { await tryDescriptor('stop 3b: stopRecording', { _obj: 'stopRecording' }); }
async function stop3c() {
  await tryDescriptor('stop 3c: set recording=false', {
    _obj: 'set',
    _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
    to: { _obj: 'action', recording: false },
  });
}

// ----------------------------- API discovery ------------------------------

function listKeys(label, obj) {
  hr();
  info(`${label}`);
  if (!obj) { err('object is null/undefined'); return; }
  const proto = Object.getPrototypeOf(obj);
  const own = Object.getOwnPropertyNames(obj);
  const protoKeys = proto ? Object.getOwnPropertyNames(proto) : [];
  dim('own: ' + own.join(', '));
  if (protoKeys.length) dim('prototype: ' + protoKeys.join(', '));
  // Also pick out anything that smells like recording.
  const all = [...own, ...protoKeys];
  const hits = all.filter((k) => /record|action|stop|play/i.test(k));
  if (hits.length) ok('🔍 matches record/action/stop/play: ' + hits.join(', '));
}

function dumpPhotoshop() { listKeys('photoshop module', photoshop); }
function dumpAction()    { listKeys('photoshop.action', action); }
function dumpApp()       { listKeys('photoshop.app', app); }
function dumpCore()      { listKeys('photoshop.core', core); }

async function dumpActionTree() {
  hr();
  try {
    const res = await action.batchPlay([{
      _obj: 'get',
      _target: [{ _property: 'numberOfActionSets' }, { _ref: 'application' }],
    }], { synchronousExecution: true });
    const count = res && res[0] && res[0].numberOfActionSets;
    ok(`numberOfActionSets = ${count}`);

    for (let i = 1; i <= Math.min(count || 0, 50); i++) {
      try {
        const setRes = await action.batchPlay([{
          _obj: 'get',
          _target: [{ _ref: 'actionSet', _index: i }],
        }], { synchronousExecution: true });
        const d = setRes && setRes[0];
        dim(`  set ${i}: name="${d && d.name}" count=${d && d.count} keys=${d && Object.keys(d).join(',')}`);
      } catch (e) { err(`  set ${i} failed: ${e.message}`); }
    }
  } catch (e) {
    err('dumpActionTree failed: ' + e.message);
  }
}

async function probeRecordable() {
  hr();
  info('Probing: which properties of an action mention recording?');
  try {
    const res = await action.batchPlay([{
      _obj: 'get',
      _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
    }], { synchronousExecution: true });
    const d = res && res[0];
    if (!d) { err('no descriptor'); return; }
    dim('all fields: ' + Object.keys(d).join(', '));
    const candidates = Object.keys(d).filter((k) => /record|state|active|running/i.test(k));
    if (candidates.length) ok('candidates: ' + candidates.join(', '));
    else warn('no obvious record/state fields on action descriptor');
    dim(stringify(d));
  } catch (e) {
    err('probeRecordable failed: ' + e.message);
  }
}

// ----------------------------- Listener -----------------------------------

let listener = null;

function startListener() {
  if (listener) { warn('Listener already running.'); return; }
  hr();
  info('🎧 Listener started. Now press the NATIVE ■ stop button in PS Actions panel.');
  info('Any descriptor PS emits will appear below — look for the stop descriptor.');
  try {
    listener = (event, descriptor) => {
      const str = stringify(descriptor, 600);
      dim(`📡 ${event}`);
      dim('   ' + str.replace(/\n/g, '\n   '));
    };
    // Listen to everything.
    action.addNotificationListener([{ event: 'all' }], listener);
    ok('Listener installed.');
  } catch (e) {
    err('addNotificationListener failed: ' + e.message);
    // Try fallback — some PS versions use a different event key.
    try {
      listener = (event, descriptor) => {
        dim(`📡 ${event}  ${stringify(descriptor, 400)}`);
      };
      action.addNotificationListener([], listener);
      ok('Listener installed (empty filter).');
    } catch (e2) {
      err('Fallback listener failed: ' + e2.message);
      listener = null;
    }
  }
}

function stopListener() {
  if (!listener) { warn('No listener running.'); return; }
  try {
    action.removeNotificationListener([{ event: 'all' }], listener);
    ok('Listener removed.');
  } catch (e) {
    err('Failed to remove listener: ' + e.message);
  } finally {
    listener = null;
  }
}

function listKnownEvents() {
  hr();
  info('Known Photoshop event keywords worth listening to:');
  const events = [
    'all', 'stop', 'startRecording', 'stopRecording', 'record', 'play',
    'make', 'set', 'select', 'delete', 'modify', 'open', 'close', 'save',
  ];
  events.forEach((e) => dim('  ' + e));
}

// ----------------------------- Inspect ------------------------------------

async function readStepCount() {
  hr();
  try {
    const res = await action.batchPlay([{
      _obj: 'get',
      _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
    }], { synchronousExecution: true });
    const d = res && res[0];
    if (!d) { err('no descriptor'); return; }
    ok(`count = ${d.count}  (parentName="${d.parentName}")`);
    dim(stringify(d));
  } catch (e) {
    err('readStepCount failed: ' + e.message);
  }
}

async function dumpActionSet() {
  hr();
  try {
    const res = await action.batchPlay([{
      _obj: 'get',
      _target: [{ _ref: 'actionSet', _name: SET_NAME }],
    }], { synchronousExecution: true });
    ok('set descriptor:');
    dim(stringify(res && res[0]));
  } catch (e) {
    err('dumpActionSet failed: ' + e.message);
  }
}

// ----------------------------- Replay --------------------------------------

async function playOnTargets() {
  hr();
  const doc = app.activeDocument;
  if (!doc) { err('No active document'); return; }
  const sel = Array.from(doc.activeLayers || []);
  if (!sel.length) { err('No target layers selected in PS'); return; }
  info(`Playing "${ACTION_NAME}" on ${sel.length} layer(s)…`);
  try {
    await modal(async () => {
      for (const layer of sel) {
        try {
          await action.batchPlay([{
            _obj: 'select',
            _target: [{ _ref: 'layer', _id: layer.id }],
            makeVisible: false,
          }], {});
          await action.batchPlay([{
            _obj: 'play',
            _target: [{ _ref: 'action', _name: ACTION_NAME, _parent: { _ref: 'actionSet', _name: SET_NAME } }],
          }], {});
          ok(`Played on "${layer.name}" (id ${layer.id})`);
        } catch (e) {
          err(`Play failed on "${layer.name}": ${e.message}`);
        }
      }
    }, 'Play action');
  } catch (e) {
    err('playOnTargets modal failed: ' + e.message);
  }
}

// ----------------------------- New APIs: recordAction / recordCommand ----

function inspectFn(fn, name) {
  hr();
  if (typeof fn !== 'function') { err(`${name} is not a function`); return; }
  ok(`${name}: length=${fn.length} (expects ${fn.length} arg(s))`);
  dim('toString: ' + String(fn).slice(0, 500));
}

function probeRecordAction() {
  inspectFn(action.recordAction, 'photoshop.action.recordAction');
}

function probeRecordCommand() {
  inspectFn(action.recordCommand, 'photoshop.action.recordCommand');
}

async function dumpActionTreeObj() {
  hr();
  const tree = app.actionTree;
  info('app.actionTree type: ' + (typeof tree));
  if (!tree) { err('actionTree is null/undefined'); return; }

  // It may be array-like or an object with .getters.
  try {
    const keys = Object.keys(tree);
    dim('keys: ' + keys.join(', '));
  } catch (e) { dim('Object.keys failed: ' + e.message); }

  try {
    const proto = Object.getPrototypeOf(tree);
    if (proto) dim('proto keys: ' + Object.getOwnPropertyNames(proto).join(', '));
  } catch (_) {}

  try {
    if (typeof tree.length === 'number') ok(`length = ${tree.length}`);
    const arr = Array.from(tree || []);
    ok(`Array.from length = ${arr.length}`);
    arr.forEach((s, i) => {
      try {
        dim(`  [${i}] name="${s && s.name}" keys=${Object.keys(s || {}).join(',')}`);
        const p = Object.getPrototypeOf(s);
        if (p) dim(`       proto: ${Object.getOwnPropertyNames(p).join(',')}`);
      } catch (e) { dim(`  [${i}] introspection failed: ${e.message}`); }
    });
  } catch (e) {
    err('enumerate actionTree failed: ' + e.message);
  }
}

function dumpActionSetClass() {
  hr();
  const C = app.ActionSet;
  info('app.ActionSet: ' + (typeof C));
  if (!C) return;
  dim('own: ' + Object.getOwnPropertyNames(C).join(', '));
  if (C.prototype) {
    dim('prototype: ' + Object.getOwnPropertyNames(C.prototype).join(', '));
  }
}

function dumpActionClass() {
  hr();
  const C = app.Action;
  info('app.Action: ' + (typeof C));
  if (!C) return;
  dim('own: ' + Object.getOwnPropertyNames(C).join(', '));
  if (C.prototype) {
    const protoKeys = Object.getOwnPropertyNames(C.prototype);
    dim('prototype: ' + protoKeys.join(', '));
    const hits = protoKeys.filter((k) => /record|play|stop|start|delete/i.test(k));
    if (hits.length) ok('🎯 action-control methods: ' + hits.join(', '));
  }
}

async function recordActionEmpty() {
  hr();
  info('Calling recordAction(fn) — fn does nothing');
  try {
    const res = await action.recordAction(async () => {
      dim('(inside recordAction callback)');
    });
    ok('recordAction returned: ' + stringify(res, 400));
  } catch (e) {
    err('recordAction threw: ' + e.message);
  }
}

async function recordActionInModal() {
  hr();
  info('Calling recordAction inside executeAsModal + edit a layer');
  try {
    await modal(async () => {
      const doc = app.activeDocument;
      if (!doc) throw new Error('no doc');
      const layer = doc.activeLayers && doc.activeLayers[0];
      if (!layer) throw new Error('no layer selected');

      dim('Before recordAction');
      const res = await action.recordAction(async () => {
        dim('(inside recordAction) — toggling visibility twice so there is something to record');
        layer.visible = !layer.visible;
        layer.visible = !layer.visible;
      });
      ok('recordAction returned: ' + stringify(res, 600));
    }, 'recordAction test');
  } catch (e) {
    err('recordActionInModal: ' + e.message);
  }
}

// ----------------------------- Wire up ------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) { console.warn('missing button ' + id); return; }
    el.addEventListener('click', fn);
  };

  bind('btnT1', test1_createSetAndAction);
  bind('btnCleanup', cleanup);
  bind('btnVerifyParent', verifyParent);

  bind('btnT2a', startA);
  bind('btnT2b', startB);
  bind('btnT2c', startC);

  bind('btnStopA', stopA);
  bind('btnStopB', stopB);
  bind('btnStopC', stopC);
  bind('btnStopD', stopD);
  bind('btnStopE', stopE);
  bind('btnStopF', stopF);
  bind('btnStopG', stopG);
  bind('btnStopH', stopH);
  bind('btnStopI', stopI);
  bind('btnStopJ', stopJ);
  bind('btnStopK', stopK);
  bind('btnStopL', stopL);

  bind('btnStopFlags1', stopM);
  bind('btnStopFlags2', stopN);
  bind('btnStopFlags3', stopO);
  bind('btnStopFlags4', stopP);
  bind('btnStopFlags5', stopQ);

  bind('btnT3a', stop3a);
  bind('btnT3b', stop3b);
  bind('btnT3c', stop3c);

  bind('btnProbeRecordAction', probeRecordAction);
  bind('btnProbeRecordCommand', probeRecordCommand);
  bind('btnDumpActionTreeObj', dumpActionTreeObj);
  bind('btnDumpActionSetClass', dumpActionSetClass);
  bind('btnDumpActionClass', dumpActionClass);
  bind('btnRecordActionEmpty', recordActionEmpty);
  bind('btnRecordActionModal', recordActionInModal);

  bind('btnDumpPhotoshop', dumpPhotoshop);
  bind('btnDumpAction', dumpAction);
  bind('btnDumpApp', dumpApp);
  bind('btnDumpCore', dumpCore);
  bind('btnDumpActionTree', dumpActionTree);
  bind('btnProbeActions', probeRecordable);

  bind('btnDumpNotifs', startListener);
  bind('btnStopNotifs', stopListener);
  bind('btnDumpAllEvents', listKnownEvents);

  bind('btnT5', readStepCount);
  bind('btnGetSet', dumpActionSet);
  bind('btnT4', playOnTargets);

  bind('btnClear', () => {
    logEl().textContent = '';
    lastLine = null; lastLineEl = null; lastLineCount = 0;
  });
  bind('btnCopy', () => {
    try { navigator.clipboard.writeText(logEl().innerText); ok('Log copied.'); }
    catch (e) { err('Copy failed: ' + e.message); }
  });

  info(`Spike plugin ready. Set="${SET_NAME}" Action="${ACTION_NAME}"`);
  info('Recommended flow:');
  dim('  1. Cleanup → 1 → Verify parent (confirm bug fix)');
  dim('  2. Dump photoshop / action / app / core → find any record-related API');
  dim('  3. Start listener → bấm native ■ in PS Actions panel → xem PS phát gì');
  dim('  4. Start recording (2a/b/c) → edit layer in PS');
  dim('  5. Try stop A..L with listener ON → compare emitted descriptors');
  dim('  6. When stop works → select targets → play');
});
