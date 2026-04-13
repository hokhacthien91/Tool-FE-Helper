// ══════════════════════════════════════════
//  DOM
// ══════════════════════════════════════════
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const uploadArea    = $('#uploadArea');
const fileInput     = $('#fileInput');
const uploadContent = $('#uploadContent');
const fileInfo      = $('#fileInfo');
const fileName      = $('#fileName');
const clearFile     = $('#clearFile');
const previewSection   = $('#previewSection');
const previewContainer = $('#previewContainer');

const profileSelect    = $('#profileSelect');
const profileNewBtn    = $('#profileNewBtn');
const profileRenameBtn = $('#profileRenameBtn');
const profileDeleteBtn = $('#profileDeleteBtn');
const paletteInput     = $('#paletteInput');
const paletteCount     = $('#paletteCount');
const paletteSwatches  = $('#paletteSwatches');
const paletteImportBtn = $('#paletteImportBtn');
const jsonFileInput    = $('#jsonFileInput');
const palettePickBtn   = $('#palettePickBtn');
const paletteSaveBtn   = $('#paletteSaveBtn');

const colorCheckBtn      = $('#colorCheckBtn');
const colorSpinner       = $('#colorSpinner');
const colorResultSection = $('#colorResultSection');
const colorResultStatus  = $('#colorResultStatus');
const colorOffSection    = $('#colorOffSection');
const colorOffList       = $('#colorOffList');
const colorMatchSection  = $('#colorMatchSection');
const colorMatchToggle   = $('#colorMatchToggle');
const colorMatchList     = $('#colorMatchList');

const toleranceSlider = $('#toleranceSlider');
const toleranceValue  = $('#toleranceValue');

const badgeColor = $('#badgeColor');
const badgeFont  = $('#badgeFont');
const toast      = $('#toast');

// ── State ──
const STORAGE_KEY = 'qaChecker_browser_profiles';
let profiles = {};       // { name: "hex\nhex\n..." }
let currentProfile = '';
let fileColors = null;   // Map<hex, {hex, sources, count}>
let fileFonts = null;    // Map<name, count>
let loadedFile = null;   // File object
let loadedFileData = null; // SVG text string

// ══════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════
$$('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.tab-btn').forEach(b => b.classList.remove('active'));
    $$('.mode-panel').forEach(p => p.style.display = 'none');
    btn.classList.add('active');
    $(`#${btn.dataset.mode}Panel`).style.display = '';
  });
});

// ── Tolerance slider ──
toleranceSlider.addEventListener('input', () => {
  toleranceValue.textContent = toleranceSlider.value;
});

// ── Escape key to clear highlight ──
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') clearHighlight();
});

// ══════════════════════════════════════════
//  FILE UPLOAD — preview only, no scan
// ══════════════════════════════════════════
uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => { if (e.target.files[0]) loadFile(e.target.files[0]); });
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
  e.preventDefault(); uploadArea.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
clearFile.addEventListener('click', e => {
  e.stopPropagation(); resetFile();
});

async function loadFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext !== 'svg') {
    alert('Please upload .svg file'); return;
  }
  loadedFile = file;
  fileName.textContent = file.name;
  fileInfo.hidden = false;
  uploadContent.hidden = true;

  // Reset previous scan results
  fileColors = null; fileFonts = null;
  colorResultSection.style.display = 'none';
  badgeColor.textContent = ''; badgeColor.className = 'tab-badge';
  badgeFont.textContent = ''; badgeFont.className = 'tab-badge';
  $$('.tab-btn').forEach(b => { b.classList.remove('tab-pass', 'tab-fail'); });
  $('#fontResult').innerHTML = '';
  $('#fontEmpty').textContent = 'Click "Scan & Check Colors" to scan fonts.';
  $('#fontEmpty').style.display = '';

  // Read file data + show preview
  previewContainer.innerHTML = '';
  previewSection.style.display = '';
  $('#emptyPreview').style.display = 'none';
  try {
    loadedFileData = await file.text();
    renderSVGPreview(loadedFileData);
  } catch (err) {
    previewContainer.innerHTML = `<div style="color:#888;padding:20px;text-align:center;">Preview not available</div>`;
    console.error('Preview error:', err);
  }

  updateCheckBtn();
}

function resetFile() {
  fileInput.value = '';
  loadedFile = null; loadedFileData = null;
  fileColors = null; fileFonts = null;
  fileInfo.hidden = true;
  uploadContent.hidden = false;
  previewSection.style.display = 'none';
  previewContainer.innerHTML = '';
  $('#emptyPreview').style.display = '';
  $('#scanInfoCard').style.display = 'none';
  colorCheckBtn.disabled = true;
  colorResultSection.style.display = 'none';
  badgeColor.textContent = ''; badgeColor.className = 'tab-badge';
  badgeFont.textContent = ''; badgeFont.className = 'tab-badge';
  $$('.tab-btn').forEach(b => { b.classList.remove('tab-pass', 'tab-fail'); });
  $('#fontResult').innerHTML = '';
  $('#fontEmpty').textContent = 'Upload a file to see fonts.';
  $('#fontEmpty').style.display = '';
}

// ══════════════════════════════════════════
//  PREVIEW RENDERERS
// ══════════════════════════════════════════
function renderSVGPreview(svgText) {
  const cleaned = svgText.replace(/<script[\s\S]*?<\/script>/gi, '');
  previewContainer.innerHTML = cleaned;
  const svg = previewContainer.querySelector('svg');
  if (svg) {
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.display = 'block';
    svg.style.width = '100%';
    svg.style.height = 'auto';
    // Crop viewBox to actual content bounding box
    try {
      const bbox = svg.getBBox();
      if (bbox.width > 0 && bbox.height > 0) {
        const pad = 4;
        svg.setAttribute('viewBox',
          `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + pad * 2} ${bbox.height + pad * 2}`);
      }
    } catch (e) { /* getBBox may fail if not rendered yet */ }
  }
}


// ══════════════════════════════════════════
//  CHECK BUTTON ENABLE LOGIC
// ══════════════════════════════════════════
function updateCheckBtn() {
  const hasFile = !!loadedFile;
  const hasPalette = parsePaletteHexes().length > 0;
  colorCheckBtn.disabled = !(hasFile && hasPalette);
}

// ══════════════════════════════════════════
//  SVG PARSER
// ══════════════════════════════════════════
function cleanSvgFontName(raw) {
  if (!raw) return null;
  let name = raw.split(',')[0].replace(/['"]/g, '').trim();
  if (!name || name === 'inherit' || name === 'sans-serif' || name === 'serif' || name === 'monospace') return null;
  // Remove common PostScript suffixes
  name = name.replace(/MT$/, '').replace(/-?Roman$/, '');
  // Insert spaces before uppercase runs in camelCase: "HelveticaNeueforTFS" -> "Helvetica Neue for TFS"
  name = name
    .replace(/([a-z])([A-Z])/g, '$1 $2')       // camelCase boundary
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2'); // "TFS" stays together
  return name.trim() || null;
}

function parseSVG(svgText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const colors = new Map();
  const fontRuns = new Map(); // key -> run object

  function addColor(raw, source) {
    const hex = normalizeColor(raw);
    if (!hex) return;
    if (!colors.has(hex)) colors.set(hex, { hex, sources: new Set(), count: 0 });
    const c = colors.get(hex);
    c.sources.add(source);
    c.count++;
  }

  function addFontRun(info) {
    const family = cleanSvgFontName(info.font);
    if (!family) return;
    const key = [family, info.weight, info.style, info.size, info.color].join('|');
    if (!fontRuns.has(key)) {
      fontRuns.set(key, {
        family,
        psName: info.fontRaw,
        weight: info.weight || '',
        style: info.style || 'normal',
        size: info.size || '',
        color: info.color || '',
        letterSpacing: info.letterSpacing || '',
        lineHeight: info.lineHeight || '',
        count: 0,
        samples: [],
      });
    }
    const r = fontRuns.get(key);
    r.count++;
    if (r.samples.length < 3 && info.text) {
      const sample = info.text.trim().substring(0, 40);
      if (sample && !r.samples.includes(sample)) r.samples.push(sample);
    }
  }

  // Build CSS class -> style mapping from <style> blocks
  const classFontMap = {};  // className -> { font, size, weight, fill, letterSpacing, ... }
  const classStyleMap = {}; // className -> { fill, letterSpacing, ... } for non-font classes
  doc.querySelectorAll('style').forEach(styleEl => {
    const css = styleEl.textContent;
    // Parse CSS rules — handle comma-separated selectors: .cls-1, .cls-2 { ... }
    const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
    let rm;
    while ((rm = ruleRegex.exec(css))) {
      const selectors = rm[1];
      const body = rm[2];
      // Extract all class names from selector group
      const classNames = [];
      const clsRegex = /\.([a-zA-Z0-9_-]+)/g;
      let cm;
      while ((cm = clsRegex.exec(selectors))) classNames.push(cm[1]);
      if (!classNames.length) continue;

      // Parse properties from body
      const get = (prop) => { const m = body.match(new RegExp(prop + '\\s*:\\s*([^;}]+)')); return m ? m[1].trim() : ''; };
      const font = get('font-family');
      const size = get('font-size');
      const weight = get('font-weight');
      const fstyle = get('font-style');
      const fill = get('fill');
      const letterSpacing = get('letter-spacing');

      for (const cls of classNames) {
        // Merge into classFontMap (accumulate across rules)
        if (!classFontMap[cls]) classFontMap[cls] = {};
        if (font) classFontMap[cls].font = font;
        if (size) classFontMap[cls].size = size;
        if (weight) classFontMap[cls].weight = weight;
        if (fstyle) classFontMap[cls].fstyle = fstyle;
        if (fill) classFontMap[cls].fill = fill;
        if (letterSpacing) classFontMap[cls].letterSpacing = letterSpacing;
        // Also keep in classStyleMap
        if (!classStyleMap[cls]) classStyleMap[cls] = {};
        if (fill) classStyleMap[cls].fill = fill;
        if (letterSpacing) classStyleMap[cls].letterSpacing = letterSpacing;
      }
    }
    // Colors from style blocks
    let m;
    const colorRegex = /(fill|stroke)\s*:\s*([^;}\s]+)/g;
    while ((m = colorRegex.exec(css))) {
      if (m[2] !== 'none') addColor(m[2], m[1] === 'fill' ? 'Fill' : 'Stroke');
    }
  });

  // Walk all elements
  const allEls = doc.querySelectorAll('*');
  allEls.forEach(el => {
    // Colors
    const fill = el.getAttribute('fill');
    const stroke = el.getAttribute('stroke');
    if (fill && fill !== 'none') addColor(fill, 'Fill');
    if (stroke && stroke !== 'none') addColor(stroke, 'Stroke');

    const style = el.getAttribute('style');
    if (style) {
      const fillMatch = style.match(/fill\s*:\s*([^;]+)/);
      const strokeMatch = style.match(/stroke\s*:\s*([^;]+)/);
      if (fillMatch && fillMatch[1].trim() !== 'none') addColor(fillMatch[1].trim(), 'Fill');
      if (strokeMatch && strokeMatch[1].trim() !== 'none') addColor(strokeMatch[1].trim(), 'Stroke');
    }

    // Fonts — only count on leaf text elements (tspan with text, or text without tspan children)
    const tag = el.tagName;
    if (tag !== 'text' && tag !== 'tspan' && tag !== 'textPath') return;
    // Skip <text> that has <tspan> children (avoid double-counting)
    if (tag === 'text' && el.querySelector('tspan')) return;

    // Collect all font properties
    const props = { font: '', size: '', weight: '', style: '', color: '', letterSpacing: '', lineHeight: '' };
    const propKeys = ['font-family', 'font-size', 'font-weight', 'font-style', 'fill', 'letter-spacing', 'line-height'];
    const propMap = { 'font-family': 'font', 'font-size': 'size', 'font-weight': 'weight',
      'font-style': 'style', 'fill': 'color', 'letter-spacing': 'letterSpacing', 'line-height': 'lineHeight' };

    // Resolve properties: element itself + all ancestors (CSS class cascade)
    function resolveProps(node) {
      // Inline style
      const st = node.getAttribute('style');
      if (st) {
        for (const pk of propKeys) {
          if (!props[propMap[pk]]) {
            const rx = new RegExp(pk + '\\s*:\\s*([^;]+)');
            const m = st.match(rx);
            if (m) props[propMap[pk]] = m[1].trim();
          }
        }
      }
      // Attributes
      for (const pk of propKeys) {
        if (!props[propMap[pk]]) props[propMap[pk]] = node.getAttribute(pk) || '';
      }
      // CSS classes
      const cls = node.getAttribute('class');
      if (cls) {
        for (const c of cls.split(/\s+/)) {
          const mapped = classFontMap[c];
          if (mapped) {
            if (!props.font) props.font = mapped.font || '';
            if (!props.size) props.size = mapped.size || '';
            if (!props.weight) props.weight = mapped.weight || '';
            if (!props.color) props.color = mapped.fill || '';
            if (!props.letterSpacing) props.letterSpacing = mapped.letterSpacing || '';
          }
          // Also check classStyleMap for non-font classes (fill, letter-spacing)
          if (classStyleMap[c]) {
            const sm = classStyleMap[c];
            if (!props.color) props.color = sm.fill || '';
            if (!props.letterSpacing) props.letterSpacing = sm.letterSpacing || '';
          }
        }
      }
    }

    // Resolve from element, then walk up ancestors
    resolveProps(el);
    let parent = el.parentElement;
    while (parent && parent.tagName) {
      resolveProps(parent);
      parent = parent.parentElement;
    }

    // Normalize color to hex
    if (props.color && props.color !== 'none') {
      props.color = normalizeColor(props.color) || props.color;
    }
    // Get direct text content (not children's text)
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) text += node.textContent;
    }

    if (props.font) addFontRun({ ...props, fontRaw: props.font, text });
  });

  fileColors = colors;
  fileFonts = fontRuns;
}

// ══════════════════════════════════════════
//  COLOR UTILS
// ══════════════════════════════════════════

function normalizeColor(raw) {
  if (!raw) return null;
  raw = raw.trim().toLowerCase();

  const named = { white:'#FFFFFF', black:'#000000', red:'#FF0000', green:'#008000',
    blue:'#0000FF', yellow:'#FFFF00', cyan:'#00FFFF', magenta:'#FF00FF',
    orange:'#FFA500', gray:'#808080', grey:'#808080', transparent: null, none: null };
  if (raw in named) return named[raw];

  if (raw.startsWith('#')) {
    let hex = raw.slice(1);
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length === 8) hex = hex.slice(0, 6);
    return `#${hex.toUpperCase()}`;
  }

  const rgbMatch = raw.match(/rgba?\(\s*([\d.]+)[,%\s]+([\d.]+)[,%\s]+([\d.]+)/);
  if (rgbMatch) {
    const [_, rs, gs, bs] = rgbMatch;
    const to = v => Math.round(Math.min(255, Math.max(0, parseFloat(v))));
    return `#${to(rs).toString(16).padStart(2,'0')}${to(gs).toString(16).padStart(2,'0')}${to(bs).toString(16).padStart(2,'0')}`.toUpperCase();
  }

  return null;
}

// ══════════════════════════════════════════
//  PROFILE & PALETTE
// ══════════════════════════════════════════
function loadProfiles() {
  try { profiles = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { profiles = {}; }
  currentProfile = Object.keys(profiles)[0] || '';
  renderProfileSelect();
}

function saveProfiles() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

function renderProfileSelect() {
  profileSelect.innerHTML = '';
  const names = Object.keys(profiles);
  if (!names.length) {
    profileSelect.innerHTML = '<option value="">No profile</option>';
    paletteInput.value = '';
    renderSwatches();
    updateCheckBtn();
    return;
  }
  names.forEach(n => {
    const opt = document.createElement('option');
    opt.value = n; opt.textContent = n;
    if (n === currentProfile) opt.selected = true;
    profileSelect.appendChild(opt);
  });
  if (!currentProfile || !profiles[currentProfile]) currentProfile = names[0];
  profileSelect.value = currentProfile;
  paletteInput.value = profiles[currentProfile] || '';
  renderSwatches();
  updateCheckBtn();
}

profileSelect.addEventListener('change', () => {
  currentProfile = profileSelect.value;
  paletteInput.value = profiles[currentProfile] || '';
  renderSwatches();
  updateCheckBtn();
});

profileNewBtn.addEventListener('click', () => {
  const name = prompt('Profile name:', loadedFile ? loadedFile.name.replace(/\.\w+$/, '') : 'New profile');
  if (!name) return;
  profiles[name] = '';
  currentProfile = name;
  saveProfiles(); renderProfileSelect();
});

profileRenameBtn.addEventListener('click', () => {
  if (!currentProfile) return;
  const name = prompt('Rename profile:', currentProfile);
  if (!name || name === currentProfile) return;
  profiles[name] = profiles[currentProfile];
  delete profiles[currentProfile];
  currentProfile = name;
  saveProfiles(); renderProfileSelect();
});

profileDeleteBtn.addEventListener('click', () => {
  if (!currentProfile) return;
  if (!confirm(`Delete profile "${currentProfile}"?`)) return;
  delete profiles[currentProfile];
  currentProfile = Object.keys(profiles)[0] || '';
  saveProfiles(); renderProfileSelect();
});

paletteInput.addEventListener('input', () => {
  renderSwatches();
  updateCheckBtn();
});

paletteSaveBtn.addEventListener('click', () => {
  if (!currentProfile) return;
  profiles[currentProfile] = paletteInput.value;
  saveProfiles(); renderSwatches();
  showToast('Saved!');
});

paletteImportBtn.addEventListener('click', () => jsonFileInput.click());
jsonFileInput.addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    let lines = [];
    const formatColor = (c) => {
      if (typeof c === 'string') return c;
      if (c.hex) return c.name ? `${c.hex} // ${c.name}` : c.hex;
      return null;
    };
    const items = Array.isArray(data) ? data : (data.colors || []);
    for (const c of items) {
      const line = formatColor(c);
      if (line) lines.push(line);
    }
    paletteInput.value = lines.join('\n');
    renderSwatches();
    updateCheckBtn();
    showToast('JSON imported');
  } catch (err) {
    alert('Invalid JSON: ' + err.message);
  }
  jsonFileInput.value = '';
});

palettePickBtn.addEventListener('click', () => {
  if (!loadedFileData) { showToast('Upload a SVG file first'); return; }
  const parser = new DOMParser();
  const doc = parser.parseFromString(loadedFileData, 'image/svg+xml');
  const hexes = new Set();

  // Extract from attributes
  doc.querySelectorAll('*').forEach(el => {
    for (const attr of ['fill', 'stroke']) {
      const val = el.getAttribute(attr);
      if (val && val !== 'none' && !val.startsWith('url')) {
        const h = normalizeColor(val);
        if (h) hexes.add(h);
      }
    }
    const style = el.getAttribute('style');
    if (style) {
      const fm = style.match(/fill\s*:\s*([^;]+)/);
      const sm = style.match(/stroke\s*:\s*([^;]+)/);
      if (fm && fm[1].trim() !== 'none') { const h = normalizeColor(fm[1].trim()); if (h) hexes.add(h); }
      if (sm && sm[1].trim() !== 'none') { const h = normalizeColor(sm[1].trim()); if (h) hexes.add(h); }
    }
  });

  // Extract from <style> blocks
  doc.querySelectorAll('style').forEach(styleEl => {
    const rx = /(?:fill|stroke)\s*:\s*([^;}\s]+)/g;
    let m;
    while ((m = rx.exec(styleEl.textContent))) {
      if (m[1] !== 'none' && !m[1].startsWith('url')) {
        const h = normalizeColor(m[1]);
        if (h) hexes.add(h);
      }
    }
  });

  if (hexes.size === 0) { showToast('No colors found in file'); return; }
  paletteInput.value = [...hexes].join('\n');
  renderSwatches();
  updateCheckBtn();
  showToast(`${hexes.size} colors extracted`);
});

function parsePaletteHexes() {
  const lines = paletteInput.value.split('\n');
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    const hexMatch = trimmed.match(/#([0-9a-fA-F]{3,8})/);
    if (!hexMatch) continue;
    let hex = hexMatch[1];
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (hex.length === 8) hex = hex.slice(0, 6);
    hex = `#${hex.toUpperCase()}`;
    let name = trimmed.replace(/#[0-9a-fA-F]{3,8}/, '').trim();
    // Strip leading // comment marker
    name = name.replace(/^\/\/\s*/, '').trim();
    result.push({ name, hex });
  }
  return result;
}

function renderSwatches() {
  const entries = parsePaletteHexes();
  paletteCount.textContent = `${entries.length} colors`;
  paletteSwatches.innerHTML = '';
  entries.forEach(({ name, hex }) => {
    const div = document.createElement('div');
    div.className = 'palette-swatch';
    div.style.background = hex;
    div.title = name ? `${name}  ${hex}` : hex;
    const del = document.createElement('span');
    del.className = 'swatch-delete'; del.textContent = '\u00d7';
    del.addEventListener('click', () => {
      removePaletteHex(hex); renderSwatches(); updateCheckBtn();
    });
    div.appendChild(del);
    paletteSwatches.appendChild(div);
  });
}

function removePaletteHex(hex) {
  const lines = paletteInput.value.split('\n');
  const filtered = lines.filter(line => {
    const m = line.match(/#([0-9a-fA-F]{3,8})/);
    if (!m) return true;
    let h = m[1];
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    return `#${h.toUpperCase()}` !== hex;
  });
  paletteInput.value = filtered.join('\n');
}

// ══════════════════════════════════════════
//  SCAN & CHECK — triggered by button
// ══════════════════════════════════════════
colorCheckBtn.addEventListener('click', runScanAndCheck);

async function runScanAndCheck() {
  if (!loadedFile || !loadedFileData) return;

  colorSpinner.style.display = '';
  colorResultSection.style.display = 'none';
  colorCheckBtn.disabled = true;

  try {
    parseSVG(loadedFileData);
    renderFontTab();
    runColorCheck();

    // Summary info card
    const textCount = loadedFileData ? (loadedFileData.match(/<text[\s>]/g) || []).length : 0;
    const styleCount = fileFonts ? fileFonts.size : 0;
    const colorCount = fileColors ? fileColors.size : 0;
    $('#scanInfoCard').style.display = '';
    $('#scanTextCount').textContent = textCount;
    $('#scanStyleCount').textContent = styleCount;
    $('#scanColorCount').textContent = colorCount;
    $('#scanTimestamp').textContent = new Date().toLocaleTimeString();
  } catch (err) {
    showToast('Scan error: ' + err.message);
    console.error(err);
  }

  colorSpinner.style.display = 'none';
  updateCheckBtn();
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function colorDistance(hex1, hex2) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return Math.max(Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2));
}

function findClosestPaletteColor(hex, palette, tolerance) {
  let best = null;
  let bestDist = Infinity;
  for (const p of palette) {
    const dist = colorDistance(hex, p.hex);
    if (dist < bestDist) {
      bestDist = dist;
      best = p;
    }
  }
  if (bestDist <= tolerance) return { match: best, distance: bestDist };
  return null;
}

function runColorCheck() {
  if (!fileColors) return;

  const palette = parsePaletteHexes();
  const tolerance = parseInt(toleranceSlider.value, 10);

  const matched = [];
  const offPalette = [];

  for (const [hex, data] of fileColors) {
    const result = findClosestPaletteColor(hex, palette, tolerance);
    if (result) {
      matched.push({
        ...data,
        paletteName: result.match.name || result.match.hex,
        paletteHex: result.match.hex,
        distance: result.distance,
      });
    } else {
      // Find nearest for info even if off-palette
      let nearest = null;
      let nearestDist = Infinity;
      for (const p of palette) {
        const d = colorDistance(hex, p.hex);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
      }
      offPalette.push({ ...data, nearestHex: nearest?.hex, nearestDist });
    }
  }

  const colorTab = document.querySelector('[data-mode="color"]');
  if (offPalette.length === 0) {
    badgeColor.textContent = '\u2713';
    badgeColor.className = 'tab-badge badge-pass';
    colorTab.classList.remove('tab-fail'); colorTab.classList.add('tab-pass');
    colorResultStatus.className = 'color-result-status match';
    colorResultStatus.textContent = `Color match - all ${matched.length} colors in palette`;
  } else {
    badgeColor.textContent = offPalette.length;
    badgeColor.className = 'tab-badge badge-fail';
    colorTab.classList.remove('tab-pass'); colorTab.classList.add('tab-fail');
    colorResultStatus.className = 'color-result-status nomatch';
    colorResultStatus.textContent = `Color no match - ${offPalette.length} off-palette`;
  }

  // Off-palette
  colorOffList.innerHTML = '';
  const offCountEl = document.getElementById('offCount');
  if (offPalette.length) {
    colorOffSection.style.display = '';
    offCountEl.textContent = offPalette.length;
    offPalette.sort((a, b) => b.count - a.count).forEach(c => {
      colorOffList.appendChild(makeColorItem(c, true));
    });
  } else {
    colorOffSection.style.display = 'none';
  }

  // Matched
  colorMatchList.innerHTML = '';
  const matchCountEl = document.getElementById('matchCount');
  if (matched.length) {
    colorMatchSection.style.display = '';
    matchCountEl.textContent = matched.length;
    colorMatchList.style.display = 'none';
    colorMatchToggle.classList.remove('open');
    matched.sort((a, b) => b.count - a.count).forEach(c => {
      colorMatchList.appendChild(makeColorItem(c, false));
    });
  } else {
    colorMatchSection.style.display = 'none';
  }

  colorResultSection.style.display = '';
}

function makeColorItem(colorData, isOff) {
  const div = document.createElement('div');
  div.className = 'color-item' + (isOff ? ' off' : '');

  let distHtml = '';
  if (isOff && colorData.nearestHex) {
    distHtml = `<div class="ci-nearest">nearest: ${colorData.nearestHex} (diff ${colorData.nearestDist})</div>`;
  } else if (!isOff && colorData.distance > 0) {
    distHtml = `<div class="ci-nearest">~ ${colorData.paletteHex} (diff ${colorData.distance})</div>`;
  }

  div.innerHTML = `
    <div class="ci-swatch" style="background:${colorData.hex}"></div>
    <div class="ci-info">
      <div class="ci-hex">${colorData.hex}</div>
      ${colorData.paletteName ? `<div class="ci-name">${esc(colorData.paletteName)}</div>` : ''}
      <div class="ci-detail">${[...colorData.sources].join(', ')}</div>
      ${distHtml}
    </div>
    <div class="ci-actions">
      <div class="ci-count">${colorData.count}x</div>
      <button class="select-btn" title="Highlight in preview">&#9678;</button>
    </div>
  `;
  div.querySelector('.ci-hex').addEventListener('click', (e) => {
    e.stopPropagation();
    copyToClipboard(colorData.hex);
  });
  const selBtn = div.querySelector('.select-btn');
  selBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    highlightByColor(colorData.hex, selBtn);
  });
  return div;
}

colorMatchToggle.addEventListener('click', () => {
  const open = colorMatchToggle.classList.toggle('open');
  colorMatchList.style.display = open ? '' : 'none';
});

// ══════════════════════════════════════════
//  FONT TAB
// ══════════════════════════════════════════
function weightLabel(w) {
  const map = { '100':'Thin', '200':'ExtraLight', '300':'Light', '400':'Regular',
    '500':'Medium', '600':'SemiBold', '700':'Bold', '800':'ExtraBold', '900':'Black' };
  if (!w) return '';
  return map[w] ? `${w} (${map[w]})` : w;
}

function renderFontTab() {
  const list = $('#fontResult');
  const empty = $('#fontEmpty');
  list.innerHTML = '';

  if (!fileFonts || fileFonts.size === 0) {
    empty.textContent = 'No fonts found.';
    empty.style.display = '';
    badgeFont.textContent = '';
    return;
  }

  empty.style.display = 'none';

  // Convert to array — handle both PDF (Map<string, number>) and SVG (Map<key, run>)
  const runs = [...fileFonts.values()].map(val => {
    if (typeof val === 'number') return null; // PDF simple — skip, handled below
    return val;
  }).filter(Boolean);

  // PDF fallback: simple font name -> count
  if (runs.length === 0) {
    const entries = [...fileFonts.entries()];
    entries.sort((a, b) => b[1] - a[1]);
    badgeFont.textContent = entries.length;
    badgeFont.className = 'tab-badge badge-pass';
    entries.forEach(([name, count]) => {
      const card = document.createElement('div');
      card.className = 'run-card';
      card.innerHTML = `
        <div class="run-info"><div class="run-family">${esc(name)}</div></div>
        <span class="run-count-badge">${count}</span>
      `;
      list.appendChild(card);
    });
    return;
  }

  // SVG: full run data — render expandable cards like plugin
  runs.sort((a, b) => b.count - a.count);
  badgeFont.textContent = runs.length;
  badgeFont.className = 'tab-badge badge-pass';

  for (const r of runs) {
    const card = document.createElement('div');
    card.className = 'run-card run-card-expand';

    // Missing font detection
    const psName = r.psName || r.family;
    const isMissing = !document.fonts.check(`12px "${psName.split(',')[0].replace(/['"]/g, '').trim()}"`);
    if (isMissing) card.classList.add('missing');

    const metaParts = [];
    if (r.weight) metaParts.push(weightLabel(r.weight) || r.weight);
    else metaParts.push('Regular');
    if (r.size) metaParts.push(r.size);
    if (r.color) metaParts.push(r.color);
    const metaStr = metaParts.join(' \u00b7 ');

    // Summary row
    const summary = document.createElement('div');
    summary.className = 'run-summary';
    summary.innerHTML = `
      <div class="run-summary-left">
        <div class="run-family">${esc(r.family)}${isMissing ? ' <span class="missing-badge">MISSING</span>' : ''}</div>
        <div class="run-meta">${esc(metaStr)}</div>
      </div>
      <div class="run-summary-right">
        ${r.color ? `<span class="color-swatch-sm" style="background:${r.color}"></span>` : ''}
        <span class="run-count-badge">x${r.count}</span>
        <button class="select-btn" title="Highlight in preview">&#9678;</button>
        <span class="expand-icon">\u25B6</span>
      </div>
    `;
    card.appendChild(summary);

    // Select button
    const fontFamily = r.family;
    const fontSelBtn = summary.querySelector('.select-btn');
    fontSelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      highlightByFont(fontFamily, fontSelBtn);
    });

    // Detail section (hidden by default)
    const detail = document.createElement('div');
    detail.className = 'run-detail';
    detail.style.display = 'none';

    const metrics = [
      ['font-weight', weightLabel(r.weight) || '400 (Regular)'],
      ['font-style', r.style || 'normal'],
      ['font-size', r.size || '—'],
      ['line-height', r.lineHeight || 'auto'],
      ['letter-spacing', r.letterSpacing || '0'],
      ['color', r.color || '—'],
    ];

    let metricsHtml = '<div class="run-metrics">';
    for (const [label, value] of metrics) {
      const isColor = label === 'color' && value.startsWith('#');
      const valHtml = isColor
        ? `<span class="metric-value copyable"><span class="color-swatch-sm" style="background:${value}"></span> ${value}</span>`
        : `<span class="metric-value">${esc(value)}</span>`;
      metricsHtml += `<div class="metric-row"><span class="metric-label">${label}</span>${valHtml}</div>`;
    }
    metricsHtml += '</div>';

    if (r.psName) {
      metricsHtml += `<div class="run-ps">PostScript: ${esc(r.psName)}</div>`;
    }
    if (r.samples.length) {
      metricsHtml += r.samples.map(s => `<div class="run-sample">${esc(s)}</div>`).join('');
    }

    detail.innerHTML = metricsHtml;
    card.appendChild(detail);

    // Toggle expand
    summary.addEventListener('click', () => {
      const open = detail.style.display === 'none';
      detail.style.display = open ? '' : 'none';
      card.classList.toggle('expanded', open);
      summary.querySelector('.expand-icon').textContent = open ? '\u25BC' : '\u25B6';
    });

    // Click color to copy
    detail.querySelectorAll('.copyable').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const hex = el.textContent.trim();
        copyToClipboard(hex);
      });
    });

    list.appendChild(card);
  }
}

// ══════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showToast(`Copied ${text}`);
}

// ══════════════════════════════════════════
//  SVG HIGHLIGHT
// ══════════════════════════════════════════
let activeHighlight = null; // key string to track toggle
let activeSelectBtn = null; // DOM element of active select button

function clearHighlight() {
  const svg = previewContainer.querySelector('svg');
  if (!svg) return;
  svg.querySelectorAll('[data-qa-highlight]').forEach(el => {
    el.removeAttribute('data-qa-highlight');
    el.style.outline = '';
    el.style.outlineOffset = '';
    el.style.filter = '';
  });
  svg.querySelectorAll('.qa-highlight-overlay').forEach(el => el.remove());
  if (activeSelectBtn) { activeSelectBtn.classList.remove('active'); activeSelectBtn = null; }
  activeHighlight = null;
}

function setActiveBtn(btn) {
  if (activeSelectBtn) activeSelectBtn.classList.remove('active');
  activeSelectBtn = btn;
  if (btn) btn.classList.add('active');
}

function highlightByColor(hex, btn) {
  const key = 'color:' + hex;
  if (activeHighlight === key) { clearHighlight(); return; }
  clearHighlight();
  activeHighlight = key;
  setActiveBtn(btn);

  const svg = previewContainer.querySelector('svg');
  if (!svg) return;

  const hexLower = hex.toLowerCase();
  let count = 0;

  svg.querySelectorAll('*').forEach(el => {
    if (el.tagName === 'defs' || el.tagName === 'style' || el.tagName === 'clipPath') return;
    const fill = getResolvedColor(el, 'fill');
    const stroke = getResolvedColor(el, 'stroke');
    if (fill === hexLower || stroke === hexLower) {
      el.setAttribute('data-qa-highlight', '1');
      addHighlightOverlay(svg, el);
      count++;
    }
  });

  previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast(`${count} element(s) highlighted`);
}

function highlightByFont(fontFamily, btn) {
  const key = 'font:' + fontFamily;
  if (activeHighlight === key) { clearHighlight(); return; }
  clearHighlight();
  activeHighlight = key;
  setActiveBtn(btn);

  const svg = previewContainer.querySelector('svg');
  if (!svg) return;

  const target = fontFamily.toLowerCase();
  let count = 0;

  svg.querySelectorAll('text').forEach(el => {
    const resolved = getResolvedFont(el);
    if (resolved && cleanSvgFontName(resolved)?.toLowerCase() === target) {
      el.setAttribute('data-qa-highlight', '1');
      addHighlightOverlay(svg, el);
      count++;
    }
  });

  previewSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  showToast(`${count} element(s) highlighted`);
}

function getResolvedColor(el, prop) {
  // Check inline style
  const style = el.getAttribute('style');
  if (style) {
    const m = style.match(new RegExp(prop + '\\s*:\\s*([^;]+)'));
    if (m && m[1].trim() !== 'none') { const c = normalizeColor(m[1].trim()); if (c) return c.toLowerCase(); }
  }
  // Check attribute
  const attr = el.getAttribute(prop);
  if (attr && attr !== 'none') { const c = normalizeColor(attr); if (c) return c.toLowerCase(); }
  // Check CSS class — parse from SVG <style> block
  const cls = el.getAttribute('class');
  if (cls) {
    const svg = previewContainer.querySelector('svg');
    const styleEl = svg?.querySelector('style');
    if (styleEl) {
      for (const c of cls.split(/\s+/)) {
        const rx = new RegExp('\\.' + c + '[^{]*\\{[^}]*' + prop + '\\s*:\\s*([^;}]+)');
        const m = styleEl.textContent.match(rx);
        if (m && m[1].trim() !== 'none') {
          const nc = normalizeColor(m[1].trim());
          if (nc) return nc.toLowerCase();
        }
      }
    }
  }
  return null;
}

function getResolvedFont(el) {
  const svg = previewContainer.querySelector('svg');
  const styleEl = svg?.querySelector('style');
  const cssText = styleEl?.textContent || '';

  function checkNode(node) {
    if (!node || !node.getAttribute) return null;
    // Inline style
    const st = node.getAttribute('style');
    if (st) { const m = st.match(/font-family\s*:\s*([^;]+)/); if (m) return m[1].trim(); }
    // Attribute
    if (node.getAttribute('font-family')) return node.getAttribute('font-family');
    // CSS class
    const cls = node.getAttribute('class');
    if (cls && cssText) {
      for (const c of cls.split(/\s+/)) {
        const rx = new RegExp('\\.' + c + '[^{]*\\{[^}]*font-family\\s*:\\s*([^;}]+)');
        const m = cssText.match(rx);
        if (m) return m[1].trim();
      }
    }
    return null;
  }

  // Check element itself, then walk up parents
  let node = el;
  while (node) {
    const result = checkNode(node);
    if (result) return result;
    node = node.parentElement;
  }
  return null;
}

function addHighlightOverlay(svg, el) {
  try {
    const bbox = el.getBBox();
    if (bbox.width === 0 && bbox.height === 0) return;

    // Transform local bbox to SVG root coordinate space
    const ctm = el.getCTM();
    const svgCtm = svg.getCTM();
    if (!ctm || !svgCtm) return;
    // Get transform relative to SVG root
    const matrix = svgCtm.inverse().multiply(ctm);

    const corners = [
      svg.createSVGPoint(), svg.createSVGPoint(),
      svg.createSVGPoint(), svg.createSVGPoint(),
    ];
    corners[0].x = bbox.x; corners[0].y = bbox.y;
    corners[1].x = bbox.x + bbox.width; corners[1].y = bbox.y;
    corners[2].x = bbox.x + bbox.width; corners[2].y = bbox.y + bbox.height;
    corners[3].x = bbox.x; corners[3].y = bbox.y + bbox.height;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of corners) {
      const t = pt.matrixTransform(matrix);
      if (t.x < minX) minX = t.x;
      if (t.y < minY) minY = t.y;
      if (t.x > maxX) maxX = t.x;
      if (t.y > maxY) maxY = t.y;
    }

    // Scale stroke relative to viewBox so it looks consistent at any zoom
    const vb = svg.viewBox.baseVal;
    const vbSize = vb.width > 0 ? vb.width : svg.getBoundingClientRect().width;
    const sw = Math.max(0.3, vbSize / 500);
    const pad = sw * 2;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', minX - pad);
    rect.setAttribute('y', minY - pad);
    rect.setAttribute('width', maxX - minX + pad * 2);
    rect.setAttribute('height', maxY - minY + pad * 2);
    rect.setAttribute('fill', 'none');
    rect.setAttribute('stroke', '#ff4081');
    rect.setAttribute('stroke-width', sw);
    rect.setAttribute('stroke-dasharray', `${sw * 3},${sw * 1.5}`);
    rect.classList.add('qa-highlight-overlay');
    rect.style.animation = 'qa-blink 0.8s ease-in-out infinite';
    svg.appendChild(rect);
  } catch (e) { /* getBBox/getCTM may fail */ }
}

// ══════════════════════════════════════════
//  EXPORT REPORT (.xls)
// ══════════════════════════════════════════
$('#exportReportBtn').addEventListener('click', exportReport);

function exportReport() {
  if (!fileColors && !fileFonts) { showToast('No scan data'); return; }

  const rows = [];
  // Sheet 1: Font Check
  rows.push('<Worksheet ss:Name="Font Check">');
  rows.push('<Table>');
  rows.push(xlsRow(['#', 'Font Family', 'Weight', 'Style', 'Size', 'Color', 'Count', 'Sample'], true));

  let fontIdx = 1;
  if (fileFonts) {
    for (const val of fileFonts.values()) {
      if (typeof val === 'number') continue;
      rows.push(xlsRow([
        fontIdx++, val.family, val.weight || 'Regular', val.style || 'normal',
        val.size || '', val.color || '', val.count, val.samples?.[0] || ''
      ]));
    }
  }
  rows.push('</Table></Worksheet>');

  // Sheet 2: Color Check
  rows.push('<Worksheet ss:Name="Color Check">');
  rows.push('<Table>');
  rows.push(xlsRow(['#', 'Status', 'Hex', 'Sources', 'Count', 'Nearest Palette', 'Diff'], true));

  let colorIdx = 1;
  if (fileColors) {
    const palette = parsePaletteHexes();
    const tolerance = Number.parseInt(toleranceSlider.value, 10);
    for (const [hex, data] of fileColors) {
      const result = findClosestPaletteColor(hex, palette, tolerance);
      const status = result ? 'MATCHED' : 'OFF-PALETTE';
      const nearest = result ? result.match.hex : '';
      const diff = result ? result.distance : '';
      rows.push(xlsRow([
        colorIdx++, status, hex, [...data.sources].join(', '), data.count, nearest, diff
      ], false, status === 'OFF-PALETTE'));
    }
  }
  rows.push('</Table></Worksheet>');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
  <Style ss:ID="hdr"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#333333" ss:Pattern="Solid"/></Style>
  <Style ss:ID="off"><Font ss:Color="#C62828"/><Interior ss:Color="#FFEBEE" ss:Pattern="Solid"/></Style>
</Styles>
${rows.join('\n')}
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (loadedFile?.name?.replace(/\.svg$/i, '') || 'report') + '_QA-Report.xls';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Report exported');
}

function xlsRow(cells, isHeader, isOff) {
  const styleAttr = isHeader ? ' ss:StyleID="hdr"' : (isOff ? ' ss:StyleID="off"' : '');
  return '<Row>' + cells.map(c => {
    const v = String(c ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const type = typeof c === 'number' ? 'Number' : 'String';
    return `<Cell${styleAttr}><Data ss:Type="${type}">${v}</Data></Cell>`;
  }).join('') + '</Row>';
}

// ── Init ──
loadProfiles();
