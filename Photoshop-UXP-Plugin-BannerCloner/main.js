const uxp = require("uxp");
const fs = uxp.storage.localFileSystem;
const { app, core, action } = require("photoshop");

uxp.entrypoints.setup({
  panels: {
    "banner-cloner-pro-panel": {
      show() {},
      hide() {}
    }
  }
});

const PRESETS = ["300x250","160x600","728x90","970x250","300x600","320x50","320x100","336x280","250x250","200x200"];

let cloneMode = "documents"; // "documents" | "artboards"

const sizesInput = document.getElementById("sizesInput");
const presetWrap = document.getElementById("presetWrap");
const cloneBtn = document.getElementById("cloneBtn");
const refreshBtn = document.getElementById("refreshBtn");
const sourceNameEl = document.getElementById("sourceName");
const sourceSizeEl = document.getElementById("sourceSize");
const suffixNameEl = document.getElementById("suffixName");
const skipLayerInput = document.getElementById("skipLayerInput");
const logBox = document.getElementById("logBox");
const exportBtn = document.getElementById("exportBtn");
const tabBtns = document.querySelectorAll(".tab-btn");
const splitSection = document.getElementById("splitSection");
const splitBtn = document.getElementById("splitBtn");

function log(message) {
  console.log(message);
  logBox.textContent += "\n" + message;
  logBox.scrollTop = logBox.scrollHeight;
}

function parseSizes(input) {
  return input.split(/[\s,]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(token => {
      const m = token.match(/^(\d+)x(\d+)$/i);
      if (!m) return null;
      return { raw: token, width: Number(m[1]), height: Number(m[2]) };
    })
    .filter(Boolean);
}

function renderPresets() {
  presetWrap.innerHTML = "";
  const current = new Set(parseSizes(sizesInput.value).map(s => s.raw));
  PRESETS.forEach(size => {
    const chip = document.createElement("button");
    chip.className = "preset-chip" + (current.has(size) ? " active" : "");
    chip.textContent = size;
    chip.addEventListener("click", () => {
      const list = parseSizes(sizesInput.value).map(s => s.raw);
      const next = list.includes(size) ? list.filter(x => x !== size) : [...list, size];
      sizesInput.value = next.join(" ");
      renderPresets();
    });
    presetWrap.appendChild(chip);
  });
}

function stripSizeSuffix(name) {
  return name.replace(/_\d+x\d+$/i, "");
}

// ─── Photoshop helpers ───

async function bp(commands) {
  return await action.batchPlay(commands, { synchronousExecution: true, modalBehavior: "execute" });
}

async function bpSafe(commands) {
  return await action.batchPlay(commands, { synchronousExecution: false, modalBehavior: "execute" });
}

function rectSize(rect) {
  const left = Number(rect.left?._value ?? rect.left ?? 0);
  const top = Number(rect.top?._value ?? rect.top ?? 0);
  const right = Number(rect.right?._value ?? rect.right ?? 0);
  const bottom = Number(rect.bottom?._value ?? rect.bottom ?? 0);
  return { left, top, right, bottom, width: Math.round(right - left), height: Math.round(bottom - top) };
}

async function getLayerDescriptor(layerId) {
  const result = await bp([{
    _obj: "get",
    _target: [{ _ref: "layer", _id: layerId }],
    _options: { dialogOptions: "dontDisplay" }
  }]);
  return result[0];
}

async function resolveSelectedArtboard() {
  const doc = app.activeDocument;
  const activeLayer = doc?.activeLayers?.[0];
  if (!activeLayer) throw new Error("Please select a source artboard.");
  let current = activeLayer;
  while (current && current.parent && current.parent !== doc) {
    current = current.parent;
  }
  const layerDesc = await getLayerDescriptor(current.id);
  const rect = layerDesc.artboard?.artboardRect || layerDesc.bounds;
  if (!rect) throw new Error("Cannot read artboard rect.");
  return {
    id: current.id,
    name: current.name,
    layer: current,
    rect: rect,
    size: rectSize(rect)
  };
}

async function selectLayerById(layerId) {
  await bp([{
    _obj: "select",
    _target: [{ _ref: "layer", _id: layerId }],
    makeVisible: false,
    _options: { dialogOptions: "dontDisplay" }
  }]);
}

// ─── Background helpers ───

async function getLayerBounds(layerId) {
  const desc = await getLayerDescriptor(layerId);
  return rectSize(desc.bounds);
}

function getBgLayerName() {
  return (skipLayerInput.value || "background").trim().toLowerCase();
}

function isBgGroup(layer) {
  return layer.name.toLowerCase() === getBgLayerName();
}

function findBgGroup(parent) {
  for (const layer of parent.layers) {
    if (isBgGroup(layer)) return layer;
  }
  return null;
}

async function scaleBgCover(bgGroup, canvasW, canvasH, originX, originY) {
  originX = originX || 0;
  originY = originY || 0;
  // Process each child layer inside bg group individually
  // (transform on group opens interactive mode, so we do each child)
  const children = [];
  function collect(layer) {
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) collect(child);
    } else {
      children.push(layer);
    }
  }
  collect(bgGroup);

  for (const child of children) {
    try {
      log(`[BG] layer: "${child.name}" kind: ${child.kind} id: ${child.id}`);
      const bounds = await getLayerBounds(child.id);
      log(`[BG]   bounds: ${bounds.width}x${bounds.height} (${bounds.left},${bounds.top})`);
      if (bounds.width === 0 || bounds.height === 0) { log(`[BG]   skip: zero bounds`); continue; }

      const scaleX = canvasW / bounds.width;
      const scaleY = canvasH / bounds.height;
      const scale = Math.max(scaleX, scaleY);

      await selectLayerById(child.id);

      if (Math.abs(scale - 1) > 0.01) {
        log(`[BG]   transform: scale ${(scale * 100).toFixed(1)}%`);
        await bpSafe([{
          _obj: "transform",
          _target: [{ _ref: "layer", _id: child.id }],
          freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
          width: { _unit: "percentUnit", _value: scale * 100 },
          height: { _unit: "percentUnit", _value: scale * 100 },
          interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`[BG]   transform OK`);
      }

      // Center on canvas (account for artboard origin offset)
      const centerX = originX + canvasW / 2;
      const centerY = originY + canvasH / 2;
      const newBounds = await getLayerBounds(child.id);
      const dx = centerX - (newBounds.left + newBounds.width / 2);
      const dy = centerY - (newBounds.top + newBounds.height / 2);
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        log(`[BG]   move: dx=${Math.round(dx)} dy=${Math.round(dy)}`);
        await bpSafe([{
          _obj: "move",
          _target: [{ _ref: "layer", _id: child.id }],
          to: {
            _obj: "offset",
            horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
            vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
          },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`[BG]   move OK`);
      }
    } catch (e) { log(`[BG]   ERROR: ${e.message}`); }
  }
}

// ─── Smart Layout helpers ───

async function captureContentLayout(artboardLayer, srcW, srcH) {
  const artDesc = await getLayerDescriptor(artboardLayer.id);
  const artRect = rectSize(artDesc.artboard?.artboardRect || artDesc.bounds);

  const contentGroup = artboardLayer.layers
    ? [...artboardLayer.layers].find(l => l.name.toLowerCase() === "content")
    : null;
  if (!contentGroup || !contentGroup.layers) return null;

  const layout = [];
  for (const child of contentGroup.layers) {
    try {
      // Use getGroupBounds for groups (getLayerBounds on groups returns artboard bounds)
      const bounds = (child.layers && child.layers.length > 0)
        ? await getGroupBounds(child)
        : await getLayerBounds(child.id);
      if (bounds.width === 0 || bounds.height === 0) continue;
      layout.push({
        name: child.name.toLowerCase(),
        relCenterX: (bounds.left + bounds.width / 2 - artRect.left) / srcW,
        relCenterY: (bounds.top + bounds.height / 2 - artRect.top) / srcH,
        relWidth: bounds.width / srcW,
        relHeight: bounds.height / srcH
      });
    } catch (e) { /* skip */ }
  }
  return layout.length > 0 ? layout : null;
}

async function scaleGroupChildren(group, scale) {
  const leaves = [];
  function collect(layer) {
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) collect(child);
    } else {
      leaves.push(layer);
    }
  }
  collect(group);

  for (const leaf of leaves) {
    try {
      const bounds = await getLayerBounds(leaf.id);
      if (bounds.width === 0 || bounds.height === 0) continue;
      const skipKinds = ["solidColor", "gradientFill", "pattern"];
      if (skipKinds.includes(leaf.kind)) continue;

      await selectLayerById(leaf.id);
      await bpSafe([{
        _obj: "transform",
        _target: [{ _ref: "layer", _id: leaf.id }],
        freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
        width: { _unit: "percentUnit", _value: scale * 100 },
        height: { _unit: "percentUnit", _value: scale * 100 },
        interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
        _options: { dialogOptions: "dontDisplay" }
      }]);
    } catch (e) { log(`[SCALE] ERROR ${leaf.name}: ${e.message}`); }
  }
}

async function moveGroupChildren(group, dx, dy) {
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
  log(`[MOVE] "${group.name}": dx=${Math.round(dx)} dy=${Math.round(dy)}`);
  try {
    await selectLayerById(group.id);
    await bp([{
      _obj: "move",
      _target: [{ _ref: "layer", _id: group.id }],
      to: {
        _obj: "offset",
        horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
        vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
      },
      _options: { dialogOptions: "dontDisplay" }
    }]);
    log(`[MOVE]   OK`);
  } catch (e) {
    log(`[MOVE]   group move failed, trying leaves: ${e.message}`);
    // Fallback: move individual leaves
    const leaves = [];
    function collect(layer) {
      if (layer.layers && layer.layers.length > 0) {
        for (const child of layer.layers) collect(child);
      } else {
        leaves.push(layer);
      }
    }
    collect(group);
    for (const leaf of leaves) {
      try {
        await selectLayerById(leaf.id);
        await bp([{
          _obj: "move",
          _target: [{ _ref: "layer", _id: leaf.id }],
          to: {
            _obj: "offset",
            horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
            vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
          },
          _options: { dialogOptions: "dontDisplay" }
        }]);
      } catch (e2) { log(`[MOVE]   "${leaf.name}" ERROR: ${e2.message}`); }
    }
  }
}

async function getGroupBounds(group) {
  let minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
  const leaves = [];
  function collect(layer) {
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) collect(child);
    } else {
      leaves.push(layer);
    }
  }
  collect(group);

  for (const leaf of leaves) {
    try {
      const b = await getLayerBounds(leaf.id);
      if (b.width === 0 || b.height === 0) continue;
      if (b.left < minL) minL = b.left;
      if (b.top < minT) minT = b.top;
      if (b.right > maxR) maxR = b.right;
      if (b.bottom > maxB) maxB = b.bottom;
    } catch (e) { /* skip */ }
  }
  if (minL === Infinity) return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  return { left: minL, top: minT, right: maxR, bottom: maxB, width: maxR - minL, height: maxB - minT };
}

// ─── Smart Layout: scale + reposition content groups ───

async function smartLayoutContent(parent, srcW, srcH, canvasW, canvasH, originX, originY, sourceLayout) {
  originX = originX || 0;
  originY = originY || 0;

  // Find content group
  const contentGroup = parent.layers
    ? [...parent.layers].find(l => l.name.toLowerCase() === "content")
    : null;

  // Fallback to old fitContentLayers if no content group or no source layout
  if (!contentGroup || !sourceLayout) {
    log(`[LAYOUT] No content group or source layout, fallback to fitContentLayers`);
    return await fitContentLayers(parent, canvasW, canvasH, originX, originY);
  }

  log(`[LAYOUT] Smart layout: ${contentGroup.layers.length} groups, ${srcW}x${srcH} → ${canvasW}x${canvasH}`);

  const padding = Math.round(Math.min(canvasW, canvasH) * 0.05);

  // Target: artboard (0,0) to (canvasW, canvasH)
  // originX/originY passed from caller (0 for Documents mode, artboard pos for Artboards mode)
  const canvasLeft = originX;
  const canvasTop = originY;
  log(`[LAYOUT] Target area: (${canvasLeft},${canvasTop})-(${canvasLeft+canvasW},${canvasTop+canvasH})`);

  for (const child of contentGroup.layers) {
    const childName = child.name.toLowerCase();
    const srcInfo = sourceLayout.find(s => s.name === childName);
    if (!srcInfo) {
      log(`[LAYOUT] "${child.name}": no source info, skip`);
      continue;
    }

    try {
      // Read actual bounds first, then scale to fit canvas
      let bounds = await getGroupBounds(child);
      if (bounds.width === 0 || bounds.height === 0) continue;

      // Max 80% of canvas for any single group
      const maxW = canvasW * 0.8;
      const maxH = canvasH * 0.8;
      const scaleToFitW = bounds.width > maxW ? maxW / bounds.width : 1;
      const scaleToFitH = bounds.height > maxH ? maxH / bounds.height : 1;
      const scale = Math.min(scaleToFitW, scaleToFitH, 1);

      if (Math.abs(scale - 1) > 0.01) {
        log(`[LAYOUT] "${child.name}": scale ${(scale * 100).toFixed(1)}% (actual ${Math.round(bounds.width)}x${Math.round(bounds.height)})`);
        await scaleGroupChildren(child, scale);
        bounds = await getGroupBounds(child);
      } else {
        log(`[LAYOUT] "${child.name}": no scale needed (${Math.round(bounds.width)}x${Math.round(bounds.height)})`);
      }
      if (bounds.width === 0 || bounds.height === 0) continue;
      log(`[LAYOUT] "${child.name}": actual bounds ${Math.round(bounds.width)}x${Math.round(bounds.height)} at (${Math.round(bounds.left)},${Math.round(bounds.top)})`);
      log(`[LAYOUT] "${child.name}": src rel cx=${srcInfo.relCenterX.toFixed(3)} cy=${srcInfo.relCenterY.toFixed(3)}`);

      // Target position in artboard coords (0-based)
      const targetCenterX = canvasLeft + srcInfo.relCenterX * canvasW;
      const targetCenterY = canvasTop + srcInfo.relCenterY * canvasH;

      // Current center (doc coords — move command uses doc coords)
      const curCenterX = bounds.left + bounds.width / 2;
      const curCenterY = bounds.top + bounds.height / 2;

      let dx = targetCenterX - curCenterX;
      let dy = targetCenterY - curCenterY;
      log(`[LAYOUT] "${child.name}": target=(${Math.round(targetCenterX)},${Math.round(targetCenterY)}) cur=(${Math.round(curCenterX)},${Math.round(curCenterY)}) raw dx=${Math.round(dx)} dy=${Math.round(dy)}`);

      // Clamp: ensure final position within canvas
      const pad = padding;
      let newL = bounds.left + dx;
      let newR = newL + bounds.width;
      let newT = bounds.top + dy;
      let newB = newT + bounds.height;

      if (newR > canvasLeft + canvasW - pad) { dx -= newR - (canvasLeft + canvasW - pad); newL = bounds.left + dx; }
      if (newL < canvasLeft + pad) { dx += (canvasLeft + pad) - newL; }
      newT = bounds.top + dy; newB = newT + bounds.height;
      if (newB > canvasTop + canvasH - pad) { dy -= newB - (canvasTop + canvasH - pad); newT = bounds.top + dy; }
      if (newT < canvasTop + pad) { dy += (canvasTop + pad) - newT; }

      log(`[LAYOUT] "${child.name}": move dx=${Math.round(dx)} dy=${Math.round(dy)}`);
      await moveGroupChildren(child, dx, dy);
    } catch (e) {
      log(`[LAYOUT] "${child.name}" ERROR: ${e.message}`);
    }
  }

  // Handle remaining layers outside content/background groups with fitContentLayers
  log(`[LAYOUT] Fitting remaining layers outside content/background...`);
  await fitContentLayers(parent, canvasW, canvasH, canvasLeft, canvasTop, true);
}

// ─── Fit content layers inside canvas (fallback) ───

async function fitContentLayers(parent, canvasW, canvasH, originX, originY, skipContentBg) {
  originX = originX || 0;
  originY = originY || 0;
  // Collect all leaf layers that are NOT inside bg group (and optionally not in content group)
  const leaves = [];
  function walk(layer) {
    if (isBgGroup(layer)) return;
    if (skipContentBg && layer.name) {
      const ln = layer.name.toLowerCase();
      if (ln === "content" || ln === "guideline" || ln === "guidline") return;
    }
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) walk(child);
    } else {
      leaves.push(layer);
    }
  }
  for (const layer of parent.layers) walk(layer);

  const canvasLeft = originX;
  const canvasRight = originX + canvasW;
  const canvasTop = originY;
  const canvasBottom = originY + canvasH;

  for (const layer of leaves) {
    try {
      log(`[FIT] layer: "${layer.name}" kind: ${layer.kind} id: ${layer.id}`);
      const skipKinds = ["solidColor", "gradientFill", "pattern"];
      if (skipKinds.includes(layer.kind)) { log(`[FIT]   skip: fill layer`); continue; }
      const bounds = await getLayerBounds(layer.id);
      log(`[FIT]   bounds: ${bounds.width}x${bounds.height} (${bounds.left},${bounds.top})`);
      if (bounds.width === 0 || bounds.height === 0) { log(`[FIT]   skip: zero bounds`); continue; }

      await selectLayerById(layer.id);

      // Scale down if wider than canvas
      if (bounds.width > canvasW) {
        const scale = canvasW / bounds.width;
        log(`[FIT]   transform: scale ${(scale * 100).toFixed(1)}%`);
        try {
          await bpSafe([{
            _obj: "transform",
            _target: [{ _ref: "layer", _id: layer.id }],
            freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
            width: { _unit: "percentUnit", _value: scale * 100 },
            height: { _unit: "percentUnit", _value: scale * 100 },
            interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
            _options: { dialogOptions: "dontDisplay" }
          }]);
          log(`[FIT]   transform OK`);
        } catch (e) { log(`[FIT]   transform ERROR: ${e.message}`); continue; }
      }

      // Re-read bounds and move into canvas if outside
      const b = await getLayerBounds(layer.id);
      let dx = 0, dy = 0;

      // Horizontal: push into canvas (using absolute artboard bounds)
      if (b.right <= canvasLeft) dx = canvasLeft - b.left + 10;
      else if (b.left >= canvasRight) dx = (canvasRight - 10) - b.right;
      else if (b.left < canvasLeft) dx = canvasLeft - b.left;

      // Vertical: push into canvas
      if (b.bottom <= canvasTop) dy = canvasTop - b.top + 10;
      else if (b.top >= canvasBottom) dy = (canvasBottom - 10) - b.bottom;
      else if (b.top < canvasTop) dy = canvasTop - b.top;

      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        log(`[FIT]   move: dx=${Math.round(dx)} dy=${Math.round(dy)}`);
        try {
          await bpSafe([{
            _obj: "move",
            _target: [{ _ref: "layer", _id: layer.id }],
            to: {
              _obj: "offset",
              horizontal: { _unit: "pixelsUnit", _value: Math.round(dx) },
              vertical: { _unit: "pixelsUnit", _value: Math.round(dy) }
            },
            _options: { dialogOptions: "dontDisplay" }
          }]);
          log(`[FIT]   move OK`);
        } catch (e) { log(`[FIT]   move ERROR: ${e.message}`); }
      }
    } catch (e) { log(`[FIT]   ERROR: ${e.message}`); }
  }
}

// ─── Tab switching ───

function switchMode(mode) {
  cloneMode = mode;
  tabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
  splitSection.style.display = mode === "artboards" ? "block" : "none";
}

// ─── Clone: each size → artboard in same document ───

async function cloneAsArtboards() {
  const targets = parseSizes(sizesInput.value);
  if (!targets.length) { log("No valid sizes found."); return; }

  await core.executeAsModal(async () => {
    try {
      const source = await resolveSelectedArtboard();
      const baseName = stripSizeSuffix(source.name);
      const srcRect = source.size;
      const sourceDoc = app.activeDocument;
      log(`Source artboard: ${source.name} (${srcRect.width}x${srcRect.height})`);

      // Capture content layout from source artboard
      const sourceLayout = await captureContentLayout(source.layer, srcRect.width, srcRect.height);
      if (sourceLayout) log(`[LAYOUT] Captured ${sourceLayout.length} content groups from source`);

      // Find the rightmost edge of all existing artboards
      let maxRight = srcRect.right;
      for (const layer of sourceDoc.layers) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          if (desc.artboardEnabled || desc.artboard) {
            const r = rectSize(desc.artboard?.artboardRect || desc.bounds);
            if (r.right > maxRight) maxRight = r.right;
          }
        } catch (e) { /* skip */ }
      }
      let nextX = maxRight + 80;

      // Create a clean template doc from original source (before any clones are added)
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: sourceDoc.id }],
        _options: { dialogOptions: "dontDisplay" }
      }]);
      await bp([{
        _obj: "duplicate",
        _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
        name: "_template_",
        _options: { dialogOptions: "dontDisplay" }
      }]);
      const templateDoc = app.activeDocument;
      const templateDocId = templateDoc.id;

      // Flatten template: keep only selected artboard, delete others with children
      const abToDelete = [];
      let abToFlatten = null;
      for (const layer of [...templateDoc.layers]) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          if (desc.artboardEnabled || desc.artboard) {
            if (layer.name === source.name) {
              abToFlatten = layer;
            } else {
              abToDelete.push(layer);
            }
          }
        } catch (e) { /* skip */ }
      }

      // Delete non-selected artboards AND their children
      for (const ab of abToDelete) {
        try {
          if (ab.layers && ab.layers.length > 0) {
            for (const child of [...ab.layers]) {
              try {
                await selectLayerById(child.id);
                await bp([{
                  _obj: "delete",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              } catch (e) { /* skip */ }
            }
          }
          await selectLayerById(ab.id);
          await bp([{
            _obj: "delete",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            _options: { dialogOptions: "dontDisplay" }
          }]);
        } catch (e) { /* skip */ }
      }

      // Flatten the selected artboard
      if (abToFlatten) {
        await selectLayerById(abToFlatten.id);
        await bp([{
          _obj: "set",
          _target: [{ _ref: "layer", _id: abToFlatten.id }],
          to: { _obj: "layer", artboardEnabled: false },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "ungroupLayersEvent",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
      }
      log(`Template doc created`);

      for (const target of targets) {
        log(`--- Clone ${target.raw} ---`);
        const newName = suffixNameEl.checked ? `${baseName}_${target.raw}` : target.raw;

        // 1. Switch to template doc and duplicate it → temp doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: templateDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: newName + "_temp",
          _options: { dialogOptions: "dontDisplay" }
        }]);
        const tempDoc = app.activeDocument;

        // 4. Resize canvas to target size
        await bp([{
          _obj: "canvasSize",
          width: { _unit: "pixelsUnit", _value: target.width },
          height: { _unit: "pixelsUnit", _value: target.height },
          horizontal: { _enum: "horizontalLocation", _value: "center" },
          vertical: { _enum: "verticalLocation", _value: "center" },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`Canvas: ${target.width}x${target.height}`);

        // DEBUG: check actual layer positions after canvasSize
        try {
          for (const l of tempDoc.layers) {
            const b = await getLayerBounds(l.id);
            if (b.width > 0) { log(`[DEBUG] After crop - "${l.name}": (${b.left},${b.top}) ${b.width}x${b.height}`); break; }
          }
        } catch(e) {}

        // 5. Scale background
        const bgGroup = findBgGroup(tempDoc);
        if (bgGroup) {
          try {
            log(`BG: "${bgGroup.name}" → cover`);
            await scaleBgCover(bgGroup, target.width, target.height);
          } catch (e) { log(`BG scale skipped: ${e.message}`); }
        }

        // 6. Smart layout content
        try {
          await smartLayoutContent(tempDoc, srcRect.width, srcRect.height, target.width, target.height, 0, 0, sourceLayout);
        } catch (e) { log(`Fit content skipped: ${e.message}`); }

        // 7. Wrap all layers into an artboard
        await bp([{
          _obj: "select",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "front" }],
          makeVisible: false,
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "select",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "back" }],
          selectionModifier: { _enum: "selectionModifierType", _value: "addToSelectionContinuous" },
          makeVisible: false,
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "make",
          _target: [{ _ref: "artboardSection" }],
          from: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
          artboardRect: {
            _obj: "classFloatRect",
            top: 0, left: 0,
            bottom: target.height, right: target.width
          },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        const abLayer = tempDoc.layers[0];
        if (abLayer) abLayer.name = newName;
        log(`Artboard created in temp doc: ${newName}`);

        // 8. Duplicate artboard back to source doc
        await selectLayerById(abLayer.id);
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          to: { _ref: "document", _id: sourceDoc.id },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log(`Duplicated artboard to source doc`);

        // 9. Close temp doc without saving
        await bp([{
          _obj: "close",
          saving: { _enum: "yesNo", _value: "no" },
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // 10. Switch to source doc and move the new artboard to position
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: sourceDoc.id }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // The duplicated artboard should be the active/top layer
        const newAb = app.activeDocument.activeLayers[0] || app.activeDocument.layers[0];
        if (newAb) {
          const abDesc = await getLayerDescriptor(newAb.id);
          const abRect = rectSize(abDesc.artboard?.artboardRect || abDesc.bounds);
          const moveX = nextX - abRect.left;
          const moveY = srcRect.top - abRect.top;
          if (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5) {
            await bpSafe([{
              _obj: "move",
              _target: [{ _ref: "layer", _id: newAb.id }],
              to: {
                _obj: "offset",
                horizontal: { _unit: "pixelsUnit", _value: Math.round(moveX) },
                vertical: { _unit: "pixelsUnit", _value: Math.round(moveY) }
              },
              _options: { dialogOptions: "dontDisplay" }
            }]);
          }
          log(`Positioned at x=${nextX}`);
        }

        nextX += target.width + 80;
        log(`Created: ${newName}`);
      }

      // Close template doc
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: templateDocId }],
        _options: { dialogOptions: "dontDisplay" }
      }]);
      await bp([{
        _obj: "close",
        saving: { _enum: "yesNo", _value: "no" },
        _options: { dialogOptions: "dontDisplay" }
      }]);

      // Switch back to source doc
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: sourceDoc.id }],
        _options: { dialogOptions: "dontDisplay" }
      }]);

      log("=== Clone complete ===");
      log(`${targets.length} artboard(s) created in same document.`);
    } catch (e) {
      log("Clone error: " + e.message);
      throw e;
    }
  }, { commandName: "Banner Cloner - Clone Artboards" });
}

// ─── Clone: each size → new document ───

async function cloneAll() {
  const targets = parseSizes(sizesInput.value);
  if (!targets.length) {
    log("No valid sizes found.");
    return;
  }

  await core.executeAsModal(async () => {
    try {
      const sourceDoc = app.activeDocument;
      if (!sourceDoc) throw new Error("No document is currently open.");

      // Resolve selected artboard to use its name and size
      let selectedAb = null;
      try { selectedAb = await resolveSelectedArtboard(); } catch (e) { /* no artboard selected */ }

      const srcW = selectedAb ? selectedAb.size.width : sourceDoc.width;
      const srcH = selectedAb ? selectedAb.size.height : sourceDoc.height;
      const baseName = selectedAb
        ? stripSizeSuffix(selectedAb.name)
        : stripSizeSuffix(sourceDoc.title.replace(/\.(psd|jpg|jpeg|png|tif|tiff|gif|bmp)$/i, ""));
      log(`Source: ${selectedAb ? selectedAb.name : sourceDoc.title} (${srcW}x${srcH})`);

      // Capture content layout from source
      const sourceLayout = selectedAb
        ? await captureContentLayout(selectedAb.layer, srcW, srcH)
        : null;
      if (sourceLayout) log(`[LAYOUT] Captured ${sourceLayout.length} content groups from source`);

      // Create a clean template doc with only the selected artboard's content
      await bp([{
        _obj: "duplicate",
        _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
        name: "_template_docs_",
        _options: { dialogOptions: "dontDisplay" }
      }]);
      const templateDoc = app.activeDocument;
      const templateDocId = templateDoc.id;

      // In template: flatten selected artboard, delete all others
      // First collect which layers to keep vs delete
      const toDelete = [];
      let toFlatten = null;
      for (const layer of [...templateDoc.layers]) {
        try {
          const desc = await getLayerDescriptor(layer.id);
          if (desc.artboardEnabled || desc.artboard) {
            if (selectedAb && layer.name !== selectedAb.name) {
              toDelete.push(layer);
            } else {
              toFlatten = layer;
            }
          }
        } catch (e) { /* skip */ }
      }

      // Delete non-selected artboards and ALL their children
      for (const ab of toDelete) {
        try {
          // Select all children inside this artboard and delete them first
          if (ab.layers && ab.layers.length > 0) {
            for (const child of [...ab.layers]) {
              try {
                await selectLayerById(child.id);
                await bp([{
                  _obj: "delete",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              } catch (e) { /* skip */ }
            }
          }
          // Now delete the empty artboard container
          await selectLayerById(ab.id);
          await bp([{
            _obj: "delete",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
            _options: { dialogOptions: "dontDisplay" }
          }]);
        } catch (e) { /* skip */ }
      }

      // Flatten the selected artboard
      if (toFlatten) {
        await selectLayerById(toFlatten.id);
        await bp([{
          _obj: "set",
          _target: [{ _ref: "layer", _id: toFlatten.id }],
          to: { _obj: "layer", artboardEnabled: false },
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "ungroupLayersEvent",
          _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        log("Artboard → flat layers");
      }
      log(`Template doc created`);

      for (const target of targets) {
        log(`--- Clone ${target.raw} ---`);
        const newName = suffixNameEl.checked ? `${baseName}_${target.raw}` : target.raw;

        // 1. Switch to template doc and duplicate it
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: templateDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: newName,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        const newDoc = app.activeDocument;

        // 2. Resize canvas to target size (anchor center)
        await bp([{
          _obj: "canvasSize",
          width: { _unit: "pixelsUnit", _value: target.width },
          height: { _unit: "pixelsUnit", _value: target.height },
          horizontal: { _enum: "horizontalLocation", _value: "center" },
          vertical: { _enum: "verticalLocation", _value: "center" },
          _options: { dialogOptions: "dontDisplay" }
        }]);

        log(`Canvas: ${target.width}x${target.height}`);

        // 5. Scale background group as cover (fill + center)
        const bgGroup = findBgGroup(newDoc);
        if (bgGroup) {
          try {
            log(`BG: "${bgGroup.name}" → cover`);
            await scaleBgCover(bgGroup, target.width, target.height);
          } catch (e) {
            log(`BG scale skipped: ${e.message}`);
          }
        }

        // 6. Smart layout content
        try {
          await smartLayoutContent(newDoc, srcW, srcH, target.width, target.height, 0, 0, sourceLayout);
        } catch (e) {
          log(`Fit content skipped: ${e.message}`);
        }

        // 7. Wrap all layers into an Artboard
        try {
          // Select all layers (front to back)
          await bp([{
            _obj: "select",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "front" }],
            makeVisible: false,
            _options: { dialogOptions: "dontDisplay" }
          }]);
          await bp([{
            _obj: "select",
            _target: [{ _ref: "layer", _enum: "ordinal", _value: "back" }],
            selectionModifier: { _enum: "selectionModifierType", _value: "addToSelectionContinuous" },
            makeVisible: false,
            _options: { dialogOptions: "dontDisplay" }
          }]);

          // Create artboard from selected layers
          await bp([{
            _obj: "make",
            _target: [{ _ref: "artboardSection" }],
            from: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
            artboardRect: {
              _obj: "classFloatRect",
              top: 0, left: 0,
              bottom: target.height, right: target.width
            },
            _options: { dialogOptions: "dontDisplay" }
          }]);

          // Rename artboard
          const abLayer = newDoc.layers[0];
          if (abLayer) abLayer.name = newName;
          log(`Artboard: ${newName} (${target.width}x${target.height})`);
        } catch (e) {
          log("Artboard wrap skipped: " + e.message);
        }

        log(`Created: ${newName}`);
      }

      // Close template doc
      try {
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: templateDocId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{
          _obj: "close",
          saving: { _enum: "yesNo", _value: "no" },
          _options: { dialogOptions: "dontDisplay" }
        }]);
      } catch (e) { /* template may already be closed */ }

      log("=== Clone complete ===");
      log(`${targets.length} document(s) created. Adjust content, then Export.`);
    } catch (e) {
      log("Clone error: " + e.message);
      throw e;
    }
  }, { commandName: "Banner Cloner - Clone" });
}

// ─── Export all documents as JPG + PSD into structured folder ───

async function getDocName(activeDoc) {
  for (const layer of activeDoc.layers) {
    try {
      const desc = await getLayerDescriptor(layer.id);
      if (desc.artboardEnabled || desc.artboard) return layer.name;
    } catch (e) { /* skip */ }
  }
  return activeDoc.title || activeDoc.name;
}

async function exportAll() {
  const folder = await fs.getFolder();
  if (!folder) { log("Export cancelled."); return; }

  await core.executeAsModal(async () => {
    try {
      const docs = app.documents;
      if (!docs.length) { log("No documents open."); return; }

      // Derive base name from first document's artboard (strip size suffix)
      await bp([{
        _obj: "select",
        _target: [{ _ref: "document", _id: docs[0].id }],
        _options: { dialogOptions: "dontDisplay" }
      }]);
      const firstName = await getDocName(app.activeDocument);
      const baseName = stripSizeSuffix(firstName.replace(/\.(psd|jpg|jpeg|png|tif|tiff|gif|bmp)$/i, "")).replace(/[<>:"/\\|?*]/g, "_");

      // Create folder structure with timestamp
      const now = new Date();
      const ts = `${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}${String(now.getMonth()+1).padStart(2,"0")}${now.getFullYear()}`;
      const rootFolder = await folder.createFolder(`${baseName}-output-working-file-${ts}`);
      const outputFolder = await rootFolder.createFolder("output");
      const workingFolder = await rootFolder.createFolder("working-file");

      log(`Exporting ${docs.length} document(s) to ${baseName}-output-working-file/`);

      for (const doc of docs) {
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: doc.id }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        const activeDoc = app.activeDocument;
        const rawName = await getDocName(activeDoc);
        const docName = rawName.replace(/\.(psd|jpg|jpeg|png|tif|tiff|gif|bmp)$/i, "").replace(/[<>:"/\\|?*]/g, "_");
        log(`Exporting: ${docName}`);

        // Save PSD to working-file/
        const psdFile = await workingFolder.createFile(docName + ".psd", { overwrite: true });
        const psdToken = await fs.createSessionToken(psdFile);
        await bp([{
          _obj: "save",
          as: { _obj: "photoshop35Format", maximizeCompatibility: true },
          in: { _path: psdToken, _kind: "local" },
          copy: true,
          lowerCase: true,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // Save JPG to output/ (duplicate, flatten, save, close)
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: docName + "_flat",
          _options: { dialogOptions: "dontDisplay" }
        }]);
        await bp([{ _obj: "flattenImage", _options: { dialogOptions: "dontDisplay" } }]);

        const jpgFile = await outputFolder.createFile(docName + ".jpg", { overwrite: true });
        const jpgToken = await fs.createSessionToken(jpgFile);
        await bp([{
          _obj: "save",
          as: {
            _obj: "JPEG",
            extendedQuality: 10,
            matteColor: { _enum: "matteColor", _value: "white" }
          },
          in: { _path: jpgToken, _kind: "local" },
          lowerCase: true,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        await bp([{
          _obj: "close",
          saving: { _enum: "yesNo", _value: "no" },
          _options: { dialogOptions: "dontDisplay" }
        }]);

        log(`Saved: ${docName}.psd + ${docName}.jpg`);
      }

      log(`=== Export complete ===`);
    } catch (e) {
      log("Export error: " + e.message);
      throw e;
    }
  }, { commandName: "Banner Cloner - Export" });
}

// ─── Split artboards to separate documents + save PSD ───

async function splitToDocuments() {
  const folder = await fs.getFolder();
  if (!folder) { log("Split cancelled."); return; }

  await core.executeAsModal(async () => {
    try {
      const doc = app.activeDocument;
      if (!doc) { log("No document open."); return; }
      const docId = doc.id;

      // Find all artboards
      const artboards = [];
      for (const layer of doc.layers) {
        const desc = await getLayerDescriptor(layer.id);
        if (desc.artboardEnabled || desc.artboard) {
          artboards.push(layer);
        }
      }

      if (!artboards.length) { log("No artboards found."); return; }
      log(`Splitting ${artboards.length} artboard(s) to documents...`);

      for (const ab of artboards) {
        const abName = ab.name.replace(/[<>:"/\\|?*]/g, "_");
        log(`Splitting: ${abName}`);

        // Switch to source doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: docId }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // Duplicate entire document
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: abName,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        const newDoc = app.activeDocument;

        // Delete all artboards except current one (with children)
        for (const layer of [...newDoc.layers]) {
          try {
            const desc = await getLayerDescriptor(layer.id);
            if ((desc.artboardEnabled || desc.artboard) && layer.name !== ab.name) {
              if (layer.layers && layer.layers.length > 0) {
                for (const child of [...layer.layers]) {
                  try {
                    await selectLayerById(child.id);
                    await bp([{
                      _obj: "delete",
                      _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                      _options: { dialogOptions: "dontDisplay" }
                    }]);
                  } catch (e) { /* skip */ }
                }
              }
              await selectLayerById(layer.id);
              await bp([{
                _obj: "delete",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                _options: { dialogOptions: "dontDisplay" }
              }]);
            }
          } catch (e) { /* skip */ }
        }

        // Save as PSD
        const file = await folder.createFile(abName + ".psd", { overwrite: true });
        const token = await fs.createSessionToken(file);
        await bp([{
          _obj: "save",
          as: { _obj: "photoshop35Format", maximizeCompatibility: true },
          in: { _path: token, _kind: "local" },
          copy: true,
          lowerCase: true,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        log(`Saved & opened: ${abName}.psd`);
      }

      log(`=== Split complete: ${artboards.length} document(s) ===`);
    } catch (e) {
      log("Split error: " + e.message);
      throw e;
    }
  }, { commandName: "Banner Cloner - Split to Documents" });
}

// ─── Refresh source info ───

async function refreshSource() {
  try {
    const source = await resolveSelectedArtboard();
    sourceNameEl.textContent = source.name;
    sourceSizeEl.textContent = `${source.size.width}x${source.size.height}`;
    log(`Source: ${source.name} (${source.size.width}x${source.size.height})`);
  } catch (e) {
    sourceNameEl.textContent = "-";
    sourceSizeEl.textContent = "-";
    log("Refresh: " + e.message);
  }
}

// ─── Event listeners ───

sizesInput.addEventListener("input", renderPresets);
refreshBtn.addEventListener("click", refreshSource);
cloneBtn.addEventListener("click", () => {
  if (cloneMode === "artboards") cloneAsArtboards();
  else cloneAll();
});
exportBtn.addEventListener("click", exportAll);
tabBtns.forEach(btn => btn.addEventListener("click", () => switchMode(btn.dataset.mode)));
splitBtn.addEventListener("click", splitToDocuments);

document.addEventListener("DOMContentLoaded", () => {
  renderPresets();
  setTimeout(refreshSource, 150);
});
