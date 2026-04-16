const entries = [];
let viewEl = null;

function setViewElement(el) {
  viewEl = el;
  render();
}

function log(level, msg, meta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg,
    meta: meta || null,
  };
  entries.push(entry);
  appendToView(entry);
}

function info(msg, meta) { log('INFO', msg, meta); }
function warn(msg, meta) { log('WARN', msg, meta); }
function error(msg, meta) { log('ERROR', msg, meta); }
function debug(msg, meta) { log('DEBUG', msg, meta); }

function clear() {
  entries.length = 0;
  if (viewEl) viewEl.textContent = '';
}

function all() { return entries.slice(); }

function formatLine(e) {
  const t = e.ts.slice(11, 19);
  const metaStr = e.meta ? ' ' + safeJson(e.meta) : '';
  return `[${t}] ${e.level}  ${e.msg}${metaStr}`;
}

function safeJson(obj) {
  try { return JSON.stringify(obj); } catch (_) { return '[unserializable]'; }
}

function render() {
  if (!viewEl) return;
  viewEl.textContent = entries.map(formatLine).join('\n');
  viewEl.scrollTop = viewEl.scrollHeight;
}

function appendToView(e) {
  if (!viewEl) return;
  const span = document.createElement('span');
  span.className = 'log-' + e.level;
  span.textContent = formatLine(e) + '\n';
  viewEl.appendChild(span);
  viewEl.scrollTop = viewEl.scrollHeight;
}

function exportText() {
  return entries.map(formatLine).join('\n');
}

function exportJson() {
  return JSON.stringify(entries, null, 2);
}

module.exports = { setViewElement, info, warn, error, debug, clear, all, exportText, exportJson };
