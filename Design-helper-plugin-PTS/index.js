// Replace Matching Layers — UI controller with Replace + Record modes.

const sourceInspector = require('./src/sourceInspector');
const treeScanner = require('./src/treeScanner');
const matcher = require('./src/matcher');
const previewModel = require('./src/previewModel');
const replaceEngine = require('./src/replaceEngine');
const replayEngine = require('./src/replayEngine');
const recorder = require('./src/recorder');
const fileScopeManager = require('./src/fileScopeManager');
const logger = require('./src/logger');

const $ = (id) => document.getElementById(id);

const state = {
  mode: 'replace',          // 'replace' | 'record'
  source: null,             // { meta, layer, doc }
  previewItems: [],
  filterText: '',
  recording: null,          // { setName, actionName, actionId, count, phase }
};

document.addEventListener('DOMContentLoaded', () => {
  logger.setViewElement($('logView'));
  bindEvents();
  applyMatchPreset();
  updatePositionModeUI();
  applyMode();
  logger.info('Ready. Select a layer or group, then click "Use current selection".');
});

function bindEvents() {
  $('btnRefreshSource').addEventListener('click', refreshSource);
  $('btnFindMatches').addEventListener('click', findMatches);
  $('btnApply').addEventListener('click', () => applyAction(false));
  $('btnDryRun').addEventListener('click', () => applyAction(true));
  $('btnExportLog').addEventListener('click', exportLog);
  $('btnClearLog').addEventListener('click', () => logger.clear());
  $('btnSelectAll').addEventListener('click', () => toggleAll(true));
  $('btnSelectNone').addEventListener('click', () => toggleAll(false));

  $('previewSearch').addEventListener('input', (e) => {
    state.filterText = (e.target.value || '').toLowerCase();
    renderPreview();
  });

  $('matchPreset').addEventListener('change', applyMatchPreset);
  ['ruleExactName', 'ruleSameType', 'ruleSameParentPath', 'ruleSameArtboardName'].forEach((id) => {
    $(id).addEventListener('change', () => { $('matchPreset').value = 'custom'; });
  });

  $('positionMode').addEventListener('change', updatePositionModeUI);

  document.querySelectorAll('input[name="mode"]').forEach((el) => {
    el.addEventListener('change', () => {
      document.querySelectorAll('.mode-btn').forEach((b) => b.classList.remove('active'));
      const parent = el.closest('.mode-btn');
      if (parent) parent.classList.add('active');
      state.mode = document.querySelector('input[name="mode"]:checked').value;
      applyMode();
    });
  });

  $('btnStartRecord').addEventListener('click', startRecording);
  $('btnStopRecord').addEventListener('click', finishRecording);
  $('btnCancelRecord').addEventListener('click', cancelRecording);
  $('btnInspectRecord').addEventListener('click', inspectRecording);

  document.querySelectorAll('.collapse-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = $(btn.dataset.target);
      const isOpen = !target.hidden;
      target.hidden = isOpen;
      btn.classList.toggle('open', !isOpen);
    });
  });
}

// ------------------------------ Mode ---------------------------------------

function applyMode() {
  const record = state.mode === 'record';
  $('stepRecord').hidden = !record || !state.source;

  document.querySelectorAll('.replace-only').forEach((el) => {
    el.hidden = record;
  });

  // Reset preview when mode changes — match targets are still valid but the
  // action to apply differs.
  state.previewItems = [];
  $('stepPreview').hidden = true;
  updateActionButtons();

  if (!record && state.recording) {
    // Leaving record mode — discard any in-progress recording state.
    recorder.cleanupRecording(state.recording.setName).catch(() => {});
    state.recording = null;
    resetRecordUI();
  }
  if (record) updateRecordUI();
}

// ------------------------------ Source -------------------------------------

function refreshSource() {
  const res = sourceInspector.readSource();
  const card = $('sourceCard');
  const emptyEl = card.querySelector('.source-empty');
  const filledEl = card.querySelector('.source-filled');

  if (res.error) {
    state.source = null;
    card.classList.remove('filled');
    card.classList.add('empty');
    emptyEl.hidden = false;
    filledEl.hidden = true;
    emptyEl.textContent = res.error;

    $('stepScope').hidden = true;
    $('stepFind').hidden = true;
    $('stepPreview').hidden = true;
    $('stepRecord').hidden = true;
    logger.warn(res.error);
    return;
  }

  state.source = res;
  card.classList.add('filled');
  card.classList.remove('empty');
  emptyEl.hidden = true;
  filledEl.hidden = false;
  $('sourceName').textContent = `${res.meta.name}  ·  ${res.meta.type}`;
  const pathParts = [res.meta.documentName, res.meta.parentPath || '(root)'];
  if (res.meta.artboardName) pathParts.push('◆ ' + res.meta.artboardName);
  $('sourcePath').textContent = pathParts.join('  ›  ');

  $('stepScope').hidden = false;
  $('stepFind').hidden = false;
  if (state.mode === 'record') $('stepRecord').hidden = false;

  state.previewItems = [];
  $('stepPreview').hidden = true;
  $('btnFindMatches').textContent = 'Find matches';
  logger.info(`Source: ${res.meta.name} (${res.meta.type})`);
}

// ------------------------------ Recording ---------------------------------

async function startRecording() {
  if (state.recording && state.recording.phase === 'recording') return;

  // Auto-capture source from current PS selection if not set. In record mode
  // the source IS whatever layer the user is about to edit — no reason to
  // require a separate click.
  if (!state.source) {
    refreshSource();
    if (!state.source) {
      setRecordStatus('error', 'Select a layer or group in Photoshop first.');
      return;
    }
  }

  setRecordStatus('starting', 'Creating action slot…');
  $('btnStartRecord').disabled = true;

  try {
    const { setName, actionName } = await recorder.startRecording();
    state.recording = { setName, actionName, phase: 'recording' };
    $('btnStartRecord').hidden = true;
    $('btnStopRecord').hidden = false;
    $('btnCancelRecord').hidden = false;
    setRecordStatus('recording',
      '🔴 Recording — edit your source layer in Photoshop.\n' +
      'When done, press ■ in the Actions panel (F9), then click below.');
  } catch (e) {
    logger.error('Start recording failed: ' + (e.message || e));
    resetRecordUI();
  } finally {
    $('btnStartRecord').disabled = false;
  }
}

async function finishRecording() {
  if (!state.recording) return;
  $('btnStopRecord').disabled = true;
  setRecordStatus('checking', 'Reading recorded steps…');

  const { setName, actionName } = state.recording;
  const res = await recorder.readStepCount(setName, actionName);

  if (res.error) {
    if (res.stillRecording) {
      setRecordStatus('recording',
        '⚠ Recording is still active.\n' +
        'Press the ■ stop button in Photoshop\'s Actions panel first, then click again.');
      logger.warn('Still recording — user must press native stop.');
    } else {
      setRecordStatus('error', 'Failed to read recording: ' + res.error);
      logger.error(res.error);
    }
    $('btnStopRecord').disabled = false;
    return;
  }

  if (!res.count) {
    setRecordStatus('error', 'No steps recorded. Edit the layer, stop recording, then try again.');
    $('btnStopRecord').disabled = false;
    return;
  }

  // Collect descriptors captured by the notification listener.
  const commands = recorder.finishCapture();
  const editCount = commands.filter((c) => !c.isLayerSelect).length;
  const selectCount = commands.length - editCount;

  state.recording.count = commands.length;
  state.recording.actionId = res.id;
  state.recording.commands = commands;
  state.recording.phase = 'done';

  let statusMsg = `✓ ${commands.length} event(s) captured`;
  if (selectCount > 0) {
    statusMsg += ` (${selectCount} layer-select skipped, ${editCount} edit commands will replay)`;
  } else {
    statusMsg += ` (${editCount} edit commands will replay)`;
  }
  statusMsg += '. Now find targets below.';
  setRecordStatus('done', statusMsg);

  $('btnStopRecord').hidden = true;
  $('btnStartRecord').hidden = false;
  $('btnStartRecord').textContent = '● Record again';
  $('btnStopRecord').disabled = false;
  $('btnInspectRecord').hidden = false;
  logger.info(`Recording complete: ${commands.length} captured, ${editCount} edit, ${selectCount} layer-select filtered`);
}

function inspectRecording() {
  if (!state.recording || !state.recording.commands) return;
  const cmds = state.recording.commands;
  logger.info(`🔍 Inspecting ${cmds.length} captured event(s):`);
  for (const c of cmds) {
    const flag = c.isLayerSelect ? ' ← LAYER SELECT (will skip)' : '';
    logger.info(`  [${c.index}] ${c.name}${flag}`);
    try {
      logger.debug('       ' + JSON.stringify(c.descriptor).slice(0, 500));
    } catch (_) {}
  }
  openLog();
}

async function cancelRecording() {
  if (!state.recording) return;
  await recorder.cleanupRecording(state.recording.setName);
  state.recording = null;
  resetRecordUI();
  logger.info('Recording discarded.');
}

function resetRecordUI() {
  $('btnStartRecord').hidden = false;
  $('btnStartRecord').textContent = '● Start recording';
  $('btnStopRecord').hidden = true;
  $('btnCancelRecord').hidden = true;
  $('btnInspectRecord').hidden = true;
  setRecordStatus('idle', 'Ready to record. Click below to start.');
}

function updateRecordUI() {
  if (!state.recording) { resetRecordUI(); return; }
  if (state.recording.phase === 'recording') {
    $('btnStartRecord').hidden = true;
    $('btnStopRecord').hidden = false;
    $('btnCancelRecord').hidden = false;
  } else if (state.recording.phase === 'done') {
    $('btnStartRecord').hidden = false;
    $('btnStartRecord').textContent = '● Record again';
    $('btnStopRecord').hidden = true;
    $('btnCancelRecord').hidden = false;
  }
}

function setRecordStatus(phase, msg) {
  const el = $('recordStatus');
  el.className = 'record-status ' + phase;
  el.textContent = msg;
}

// ------------------------------ Match rules / scope -----------------------

function applyMatchPreset() {
  const preset = $('matchPreset').value;
  const set = (id, v) => { $(id).checked = v; };
  $('customRules').hidden = preset !== 'custom';
  if (preset === 'safe') {
    set('ruleExactName', true); set('ruleSameType', true);
    set('ruleSameParentPath', false); set('ruleSameArtboardName', false);
  } else if (preset === 'name') {
    set('ruleExactName', true); set('ruleSameType', false);
    set('ruleSameParentPath', false); set('ruleSameArtboardName', false);
  } else if (preset === 'strict') {
    set('ruleExactName', true); set('ruleSameType', true);
    set('ruleSameParentPath', true); set('ruleSameArtboardName', false);
  }
}

function updatePositionModeUI() {
  $('anchorRow').hidden = $('positionMode').value !== 'keepTargetAnchor';
}

function readMatchRules() {
  return {
    exactName: $('ruleExactName').checked,
    sameType: $('ruleSameType').checked,
    sameParentPath: $('ruleSameParentPath').checked,
    sameArtboardName: $('ruleSameArtboardName').checked,
  };
}

function readReplaceConfig() {
  return {
    positionMode: $('positionMode').value,
    anchor: $('anchor').value,
    preserveVisibility: $('preserveVisibility').checked,
    preserveOpacity: $('preserveOpacity').checked,
    preserveBlendMode: $('preserveBlendMode').checked,
    useSourceName: !$('preserveTargetName').checked,
    skipLockedTargets: $('skipLockedTargets').checked,
  };
}

function readScope() {
  const r = document.querySelector('input[name="scope"]:checked');
  return r ? r.value : 'currentDocument';
}

function findMatches() {
  if (!state.source) { logger.warn('No source set'); return; }
  if (state.mode === 'record' && (!state.recording || state.recording.phase !== 'done')) {
    logger.warn('Finish recording before finding targets.');
    return;
  }

  const rules = readMatchRules();
  if (!rules.exactName && !rules.sameType && !rules.sameParentPath && !rules.sameArtboardName) {
    logger.warn('Select at least one match rule.');
    return;
  }
  const scope = readScope();
  let roots;
  try {
    roots = fileScopeManager.resolveScope(scope, state.source);
  } catch (e) {
    logger.error(e.message || String(e));
    return;
  }
  const scanned = treeScanner.scan(roots);
  const opts = { excludeSourceSubtree: $('excludeSourceSubtree').checked };
  const raw = matcher.findMatches(state.source.meta, scanned, rules, opts);
  state.previewItems = previewModel.buildPreview(
    state.source.meta,
    state.source.layer,
    raw,
    { skipLockedTargets: $('skipLockedTargets').checked }
  );

  $('stepPreview').hidden = false;
  renderPreview();

  const total = state.previewItems.length;
  $('btnFindMatches').textContent = total ? `Find matches (${total})` : 'Find matches';
  logger.info(`Found ${total} match${total === 1 ? '' : 'es'} in "${scope}".`);
}

// ------------------------------ Preview -----------------------------------

function renderPreview() {
  const list = $('previewList');
  list.innerHTML = '';
  const visible = state.previewItems.filter(filterItem);
  const total = state.previewItems.length;
  const warnings = state.previewItems.filter((it) => !it.canReplace || (it.riskFlags && it.riskFlags[0] !== 'SAFE')).length;
  $('previewCount').textContent = `· ${visible.length}/${total}${warnings ? ' · ' + warnings + ' warning' + (warnings === 1 ? '' : 's') : ''}`;

  const banner = $('warningBanner');
  if (warnings > 0) {
    banner.hidden = false;
    banner.textContent = `⚠ ${warnings} item${warnings === 1 ? '' : 's'} ha${warnings === 1 ? 's' : 've'} warnings — review badges before ${state.mode === 'record' ? 'replaying' : 'replacing'}.`;
  } else {
    banner.hidden = true;
  }

  for (const it of visible) list.appendChild(renderItem(it));
  updateActionButtons();
}

function filterItem(it) {
  if (!state.filterText) return true;
  const hay = `${it.target.name} ${it.target.parentPath} ${it.target.documentName}`.toLowerCase();
  return hay.indexOf(state.filterText) >= 0;
}

function renderItem(it) {
  const row = document.createElement('div');
  row.className = 'preview-item' + (it.canReplace ? '' : ' disabled');

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = it.selected;
  cb.disabled = !it.canReplace;
  cb.addEventListener('change', () => {
    it.selected = cb.checked;
    updateActionButtons();
  });

  const middle = document.createElement('div');
  const nameEl = document.createElement('div');
  nameEl.className = 'name';
  nameEl.textContent = it.target.name;
  const typeTag = document.createElement('span');
  typeTag.className = 'type-tag';
  typeTag.textContent = it.target.type;
  nameEl.appendChild(typeTag);

  const pathEl = document.createElement('div');
  pathEl.className = 'path';
  pathEl.textContent = `${it.target.documentName}  ›  ${it.target.parentPath || '(root)'}` +
    (it.target.artboardName ? `  ◆ ${it.target.artboardName}` : '');
  middle.appendChild(nameEl);
  middle.appendChild(pathEl);

  const risksEl = document.createElement('div');
  risksEl.className = 'risks';
  for (const f of it.riskFlags) {
    const r = document.createElement('span');
    r.className = 'risk ' + f;
    r.textContent = f;
    risksEl.appendChild(r);
  }

  row.appendChild(cb);
  row.appendChild(middle);
  row.appendChild(risksEl);
  return row;
}

function toggleAll(value) {
  for (const it of state.previewItems) {
    if (!it.canReplace) continue;
    it.selected = value;
  }
  renderPreview();
}

function countSelected() {
  return state.previewItems.filter((it) => it.selected && it.canReplace).length;
}

function updateActionButtons() {
  const n = countSelected();
  $('btnApply').disabled = n === 0;
  $('btnDryRun').disabled = n === 0;
  const verb = state.mode === 'record' ? 'Replay' : 'Replace';
  $('btnApply').textContent = n > 0 ? `${verb} ${n}` : verb;
  $('btnDryRun').textContent = n > 0 ? `Dry run (${n})` : 'Dry run';
}

// ------------------------------ Apply -------------------------------------

async function applyAction(dryRun) {
  const selected = state.previewItems.filter((it) => it.selected && it.canReplace);
  if (!selected.length) return;

  if (dryRun) {
    const verb = state.mode === 'record' ? 'replay on' : 'replace';
    logger.info(`Dry run — would ${verb} ${selected.length} target(s):`);
    for (const it of selected) logger.info(`  • ${it.target.documentName} / ${it.target.parentPath} / ${it.target.name}`);
    openLog();
    return;
  }

  if (selected.length > 100 && !confirm(`Apply to ${selected.length} targets?`)) {
    logger.info('User cancelled large batch.');
    return;
  }

  $('btnApply').disabled = true;
  $('btnDryRun').disabled = true;
  $('btnFindMatches').disabled = true;

  try {
    let results;
    if (state.mode === 'record') {
      if (!state.recording || state.recording.phase !== 'done') {
        logger.error('No finished recording to replay.');
        return;
      }
      results = await replayEngine.runReplay(selected, state.recording);
    } else {
      results = await replaceEngine.runReplace(selected, readReplaceConfig());
    }
    summarise(results);
  } catch (e) {
    logger.error('Batch failed: ' + (e && e.message ? e.message : e));
  } finally {
    $('btnFindMatches').disabled = false;
    state.previewItems = [];
    renderPreview();
    $('btnFindMatches').textContent = 'Find matches';
  }
}

function summarise(results) {
  const ok = results.filter((r) => r.status === 'success').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errored = results.filter((r) => r.status === 'error').length;
  const verb = state.mode === 'record' ? 'replayed' : 'replaced';
  logger.info(`Done. ${ok} ${verb} · ${skipped} skipped · ${errored} errored`);
  openLog();
}

function openLog() {
  const body = $('logBody');
  const toggle = document.querySelector('.collapse-toggle[data-target="logBody"]');
  if (body.hidden) {
    body.hidden = false;
    if (toggle) toggle.classList.add('open');
  }
}

function exportLog() {
  const text = logger.exportText();
  try {
    navigator.clipboard.writeText(text);
    logger.info('Log copied to clipboard.');
  } catch (_) {
    logger.warn('Clipboard unavailable.');
  }
}
