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

async function getLayerBoundsNoEffects(layerId) {
  const desc = await getLayerDescriptor(layerId);
  return rectSize(desc.boundsNoEffects || desc.bounds);
}

async function getGroupBoundsNoEffects(group) {
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
      const b = await getLayerBoundsNoEffects(leaf.id);
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

async function smartLayoutContent(parent, srcW, srcH, canvasW, canvasH, originX, originY, sourceLayout, targetSizeKey) {
  originX = originX || 0;
  originY = originY || 0;

  // Build set of layer names that have rules → smart layout should skip them
  const ruleNames = new Set();
  if (targetSizeKey && layerRules[targetSizeKey]) {
    for (const rule of layerRules[targetSizeKey]) {
      if (rule.name) ruleNames.add(rule.name.toLowerCase());
    }
  }

  // Find content group
  const contentGroup = parent.layers
    ? [...parent.layers].find(l => l.name.toLowerCase() === "content")
    : null;

  // Fallback to old fitContentLayers if no content group or no source layout
  if (!contentGroup || !sourceLayout) {
    log(`[LAYOUT] No content group or source layout, fallback to fitContentLayers`);
    return await fitContentLayers(parent, canvasW, canvasH, originX, originY, false, ruleNames);
  }

  log(`[LAYOUT] Smart layout: ${contentGroup.layers.length} groups, ${srcW}x${srcH} → ${canvasW}x${canvasH}`);
  if (ruleNames.size > 0) log(`[LAYOUT] Skipping layers with rules: ${[...ruleNames].join(", ")}`);

  const padding = Math.round(Math.min(canvasW, canvasH) * 0.05);

  const canvasLeft = originX;
  const canvasTop = originY;
  log(`[LAYOUT] Target area: (${canvasLeft},${canvasTop})-(${canvasLeft+canvasW},${canvasTop+canvasH})`);

  for (const child of contentGroup.layers) {
    const childName = child.name.toLowerCase();

    // Skip if this layer has a rule configured
    if (ruleNames.has(childName)) {
      log(`[LAYOUT] "${child.name}": has rule in settings, skip`);
      continue;
    }

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
  await fitContentLayers(parent, canvasW, canvasH, canvasLeft, canvasTop, true, ruleNames);
}

// ─── Fit content layers inside canvas (fallback) ───

async function fitContentLayers(parent, canvasW, canvasH, originX, originY, skipContentBg, ruleNames) {
  originX = originX || 0;
  originY = originY || 0;
  // Collect all leaf layers that are NOT inside bg group (and optionally not in content group)
  const leaves = [];
  function walk(layer, insideRuledGroup) {
    if (isBgGroup(layer)) return;
    if (skipContentBg && layer.name) {
      const ln = layer.name.toLowerCase();
      if (ln === "content" || ln === "guideline" || ln === "guidline") return;
    }
    // Skip if this layer or an ancestor has a rule
    const isRuled = insideRuledGroup || (ruleNames && layer.name && ruleNames.has(layer.name.toLowerCase()));
    if (isRuled) return;
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) walk(child, isRuled);
    } else {
      leaves.push(layer);
    }
  }
  for (const layer of parent.layers) walk(layer, false);

  
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

// ─── Apply Layer Rules ───

// Capture original bounds of all layers (before smart layout modifies them)
async function captureOriginalBounds(parent) {
  const map = {}; // key: layer name (lowercase), value: { width, height, fontSize? }
  async function walk(layer) {
    if (layer.name) {
      try {
        const isGroup = layer.layers && layer.layers.length > 0;
        const bounds = isGroup ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
        if (bounds.width > 0 && bounds.height > 0) {
          const entry = { width: bounds.width, height: bounds.height };
          // Capture fontSize for text layers
          if (!isGroup && (layer.kind === "text" || layer.kind === "textLayer")) {
            try {
              const desc = await getLayerDescriptor(layer.id);
              const textKey = desc.textKey;
              if (textKey && textKey.textStyleRange && textKey.textStyleRange.length > 0) {
                const style = textKey.textStyleRange[0].textStyle;
                if (style && style.size) {
                  entry.fontSize = style.size._value || style.size;
                }
              }
            } catch (e) { /* skip fontSize capture */ }
          }
          // Capture fontSize from group's first text child
          if (isGroup) {
            try {
              const firstText = findFirstTextLayer(layer);
              if (firstText) {
                const desc = await getLayerDescriptor(firstText.id);
                const textKey = desc.textKey;
                if (textKey && textKey.textStyleRange && textKey.textStyleRange.length > 0) {
                  const style = textKey.textStyleRange[0].textStyle;
                  if (style && style.size) {
                    entry.fontSize = style.size._value || style.size;
                  }
                }
              }
            } catch (e) { /* skip */ }
          }
          map[layer.name.toLowerCase()] = entry;
        }
      } catch (e) { /* skip */ }
    }
    if (layer.layers) {
      for (const child of layer.layers) await walk(child);
    }
  }
  if (parent.layers) {
    for (const layer of parent.layers) await walk(layer);
  }
  return map;
}

function findFirstTextLayer(group) {
  if (!group.layers) return null;
  for (const child of group.layers) {
    if (child.kind === "text" || child.kind === "textLayer") return child;
    if (child.layers) {
      const found = findFirstTextLayer(child);
      if (found) return found;
    }
  }
  return null;
}

function findLayersByName(parent, targetName) {
  const results = [];
  function walk(layer) {
    if (layer.name && layer.name.toLowerCase() === targetName.toLowerCase()) {
      results.push(layer);
    }
    if (layer.layers) {
      for (const child of layer.layers) walk(child);
    }
  }
  if (parent.layers) {
    for (const layer of parent.layers) walk(layer);
  }
  return results;
}

async function applyLayerRules(docOrArtboard, targetSizeKey, canvasW, canvasH, originX, originY, originalBounds, srcW, srcH) {
  // Pre-compute scale from JSON using PSD source size as base
  const baseSize = (srcW && srcH) ? findBaseSizeFromJson(srcW, srcH) : null;
  if (baseSize) log(`[RULE] Base size from JSON: ${baseSize.name} (${baseSize.width}x${baseSize.height})`);
  originX = originX || 0;
  originY = originY || 0;
  const rules = layerRules[targetSizeKey];
  if (!rules || !rules.length) return;

  // Collect all rule names to skip children of matched groups
  const matchedGroupIds = new Set();

  for (const rule of rules) {
    if (!rule.name) continue;

    // Skip background layer — handled by scaleBgCover
    if (rule.name.toLowerCase() === getBgLayerName()) {
      log(`[RULE] "${rule.name}": is bg layer, skip (handled by scaleBgCover)`);
      continue;
    }

    const layers = findLayersByName(docOrArtboard, rule.name);
    if (!layers.length) {
      log(`[RULE] "${rule.name}": not found, skip`);
      continue;
    }

    for (const layer of layers) {
      // Skip if this layer is a child of an already-matched group
      let parent = layer.parent;
      let skipThis = false;
      while (parent) {
        if (matchedGroupIds.has(parent.id)) { skipThis = true; break; }
        parent = parent.parent;
      }
      if (skipThis) {
        log(`[RULE] "${layer.name}": skipped (parent group already has rule)`);
        continue;
      }

      // If this is a group, mark it so its children are skipped
      if (layer.layers && layer.layers.length > 0) {
        matchedGroupIds.add(layer.id);
      }
      try {
        log(`[RULE] "${layer.name}" (id:${layer.id}) applying rule for ${targetSizeKey}`);

        // Compute scale from JSON measurements (vs base size = PSD source) if no explicit scale
        if (!rule.scale && baseSize) {
          const computed = computeRuleScale(rule, baseSize);
          if (computed !== null) {
            rule._computedScale = computed;
            log(`[RULE]   computed scale from JSON: ${computed.toFixed(4)}`);
          }
        }

        // Scale first (before positioning)
        // scaleVal is relative to ORIGINAL size, not current size
        const rawScale = rule._computedScale || (rule.scale !== "" && rule.scale !== undefined ? parseFloat(rule.scale) : NaN);
        const scaleVal = isNaN(rawScale) ? NaN : rawScale;
        if (!isNaN(scaleVal) && scaleVal > 0) {
          const isGroupForScale = layer.layers && layer.layers.length > 0;
          const currentBounds = isGroupForScale ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
          const origBounds = originalBounds ? originalBounds[layer.name.toLowerCase()] : null;

          let actualScale = scaleVal;
          if (origBounds && currentBounds.width > 0) {
            const desiredW = origBounds.width * scaleVal;
            actualScale = desiredW / currentBounds.width;
            log(`[RULE]   orig: ${Math.round(origBounds.width)}px, current: ${Math.round(currentBounds.width)}px, desired: ${Math.round(desiredW)}px, actualScale: ${(actualScale * 100).toFixed(1)}%`);
          }

          if (Math.abs(actualScale - 1) > 0.01) {
            // Select all layers in the group, then transform as one unit
            if (isGroupForScale) {
              // Select all children of the group
              const allChildren = [];
              function collectAll(l) {
                if (l.layers && l.layers.length > 0) {
                  for (const c of l.layers) collectAll(c);
                } else {
                  allChildren.push(l);
                }
              }
              collectAll(layer);

              if (allChildren.length > 0) {
                // Select first child
                await selectLayerById(allChildren[0].id);
                // Add remaining children to selection
                for (let i = 1; i < allChildren.length; i++) {
                  await bp([{
                    _obj: "select",
                    _target: [{ _ref: "layer", _id: allChildren[i].id }],
                    selectionModifier: { _enum: "selectionModifierType", _value: "addToSelection" },
                    makeVisible: false,
                    _options: { dialogOptions: "dontDisplay" }
                  }]);
                }
                // Transform all selected layers together
                await bpSafe([{
                  _obj: "transform",
                  _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                  freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
                  width: { _unit: "percentUnit", _value: actualScale * 100 },
                  height: { _unit: "percentUnit", _value: actualScale * 100 },
                  interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
                  _options: { dialogOptions: "dontDisplay" }
                }]);
                log(`[RULE]   group-transform ${allChildren.length} layers as one unit`);
              }
            } else {
              await selectLayerById(layer.id);
              await bpSafe([{
                _obj: "transform",
                _target: [{ _ref: "layer", _id: layer.id }],
                freeTransformCenterState: { _enum: "quadCenterState", _value: "QCSAverage" },
                width: { _unit: "percentUnit", _value: actualScale * 100 },
                height: { _unit: "percentUnit", _value: actualScale * 100 },
                interfaceIconFrameDimmed: { _enum: "interpolationType", _value: "bicubicAutomatic" },
                _options: { dialogOptions: "dontDisplay" }
              }]);
            }
            log(`[RULE]   scaled to ${(scaleVal * 100).toFixed(0)}% of original`);
          }
        }

        // Position: get current bounds WITHOUT effects for accurate positioning
        const isGroup = layer.layers && layer.layers.length > 0;
        const boundsWithFx = isGroup ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
        const boundsNoFx = isGroup ? await getGroupBoundsNoEffects(layer) : await getLayerBoundsNoEffects(layer.id);
        log(`[RULE]   boundsWithFx: (${Math.round(boundsWithFx.left)},${Math.round(boundsWithFx.top)}) ${Math.round(boundsWithFx.width)}x${Math.round(boundsWithFx.height)}`);
        log(`[RULE]   boundsNoFx:   (${Math.round(boundsNoFx.left)},${Math.round(boundsNoFx.top)}) ${Math.round(boundsNoFx.width)}x${Math.round(boundsNoFx.height)}`);
        const bounds = boundsNoFx;
        if (bounds.width === 0 || bounds.height === 0) { log(`[RULE]   skip: zero bounds`); continue; }

        let dx = 0, dy = 0;
        const hasTop = rule.top !== "" && rule.top !== undefined;
        const hasLeft = rule.left !== "" && rule.left !== undefined;
        const hasRight = rule.right !== "" && rule.right !== undefined;
        const hasBottom = rule.bottom !== "" && rule.bottom !== undefined;
        log(`[RULE]   rule: top=${rule.top} left=${rule.left} right=${rule.right} bottom=${rule.bottom} | hasTop=${hasTop} hasLeft=${hasLeft} hasRight=${hasRight} hasBottom=${hasBottom}`);
        log(`[RULE]   canvas: ${canvasW}x${canvasH} origin: (${originX},${originY})`);

        // Priority: top > bottom, left > right
        if (hasTop) {
          const targetTop = originY + parseFloat(rule.top);
          dy = targetTop - bounds.top;
          log(`[RULE]   top: targetTop=${targetTop} bounds.top=${Math.round(bounds.top)} dy=${Math.round(dy)}`);
        } else if (hasBottom) {
          const targetBottom = originY + canvasH - parseFloat(rule.bottom);
          dy = targetBottom - bounds.bottom;
          log(`[RULE]   bottom: targetBottom=${targetBottom} bounds.bottom=${Math.round(bounds.bottom)} dy=${Math.round(dy)}`);
        }

        if (hasLeft) {
          const targetLeft = originX + parseFloat(rule.left);
          dx = targetLeft - bounds.left;
          log(`[RULE]   left: targetLeft=${targetLeft} bounds.left=${Math.round(bounds.left)} dx=${Math.round(dx)}`);
        } else if (hasRight) {
          const targetRight = originX + canvasW - parseFloat(rule.right);
          dx = targetRight - bounds.right;
          log(`[RULE]   right: targetRight=${targetRight} bounds.right=${Math.round(bounds.right)} dx=${Math.round(dx)}`);
        }

        log(`[RULE]   final move: dx=${Math.round(dx)} dy=${Math.round(dy)}`);
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          if (isGroup) {
            await moveGroupChildren(layer, dx, dy);
          } else {
            await selectLayerById(layer.id);
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
          }
          log(`[RULE]   moved dx=${Math.round(dx)} dy=${Math.round(dy)}`);
        }

        // --- Extended fields from JSON import ---

        // Opacity (0-1 → 0-100%)
        if (rule.opacity !== undefined && rule.opacity !== "") {
          const opacityVal = parseFloat(rule.opacity);
          if (!isNaN(opacityVal)) {
            const opacityPct = Math.round(opacityVal <= 1 ? opacityVal * 100 : opacityVal);
            try {
              await selectLayerById(layer.id);
              await bp([{
                _obj: "set",
                _target: [{ _ref: "layer", _id: layer.id }],
                to: { _obj: "layer", opacity: { _unit: "percentUnit", _value: opacityPct } },
                _options: { dialogOptions: "dontDisplay" }
              }]);
              log(`[RULE]   opacity: ${opacityPct}%`);
            } catch (e) { log(`[RULE]   opacity ERROR: ${e.message}`); }
          }
        }

        // Background position (% based) — reposition layer based on % of canvas
        if (rule.bgPositionX !== undefined || rule.bgPositionY !== undefined) {
          try {
            const bgBounds = isGroup ? await getGroupBounds(layer) : await getLayerBounds(layer.id);
            let bgDx = 0, bgDy = 0;
            if (rule.bgPositionX !== undefined && rule.bgPositionX !== "") {
              const pctX = parseFloat(rule.bgPositionX) / 100;
              // Position: (canvas - layer) * pct
              const maxOffsetX = bgBounds.width - canvasW;
              if (maxOffsetX > 0) {
                const targetLeft = originX - maxOffsetX * pctX;
                bgDx = targetLeft - bgBounds.left;
              } else {
                const targetCenterX = originX + canvasW * pctX;
                bgDx = targetCenterX - (bgBounds.left + bgBounds.width / 2);
              }
            }
            if (rule.bgPositionY !== undefined && rule.bgPositionY !== "") {
              const pctY = parseFloat(rule.bgPositionY) / 100;
              const maxOffsetY = bgBounds.height - canvasH;
              if (maxOffsetY > 0) {
                const targetTop = originY - maxOffsetY * pctY;
                bgDy = targetTop - bgBounds.top;
              } else {
                const targetCenterY = originY + canvasH * pctY;
                bgDy = targetCenterY - (bgBounds.top + bgBounds.height / 2);
              }
            }
            if (Math.abs(bgDx) > 0.5 || Math.abs(bgDy) > 0.5) {
              if (isGroup) {
                await moveGroupChildren(layer, bgDx, bgDy);
              } else {
                await selectLayerById(layer.id);
                await bpSafe([{
                  _obj: "move",
                  _target: [{ _ref: "layer", _id: layer.id }],
                  to: {
                    _obj: "offset",
                    horizontal: { _unit: "pixelsUnit", _value: Math.round(bgDx) },
                    vertical: { _unit: "pixelsUnit", _value: Math.round(bgDy) }
                  },
                  _options: { dialogOptions: "dontDisplay" }
                }]);
              }
              log(`[RULE]   bgPosition: dx=${Math.round(bgDx)} dy=${Math.round(bgDy)}`);
            }
          } catch (e) { log(`[RULE]   bgPosition ERROR: ${e.message}`); }
        }

        // Gradient angle
        if (rule.gradientAngle !== undefined && rule.gradientAngle !== "") {
          const angle = parseFloat(rule.gradientAngle);
          if (!isNaN(angle)) {
            try {
              await selectLayerById(layer.id);
              const desc = await getLayerDescriptor(layer.id);
              // Only apply to gradient fill layers
              if (desc.adjustment && desc.adjustment.length > 0) {
                const adj = desc.adjustment[0];
                if (adj.gradient) {
                  await bp([{
                    _obj: "set",
                    _target: [{ _ref: "layer", _id: layer.id }],
                    to: {
                      _obj: "gradientFill",
                      angle: { _unit: "angleUnit", _value: angle }
                    },
                    _options: { dialogOptions: "dontDisplay" }
                  }]);
                  log(`[RULE]   gradientAngle: ${angle}°`);
                }
              }
            } catch (e) { log(`[RULE]   gradientAngle ERROR: ${e.message}`); }
          }
        }

      } catch (e) {
        log(`[RULE]   ERROR "${layer.name}": ${e.message}`);
      }
    }
  }
}

// ─── Tab switching ─── (moved to bottom, near settings logic)

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

        // 5. Scale background (always use scaleBgCover — JSON rule for bg will be skipped in applyLayerRules)
        const bgGroup = findBgGroup(tempDoc);
        if (bgGroup) {
          try {
            log(`BG: "${bgGroup.name}" → cover`);
            await scaleBgCover(bgGroup, target.width, target.height);
          } catch (e) { log(`BG scale skipped: ${e.message}`); }
        }

        // 5b. Capture original layer bounds before smart layout
        const origBounds = await captureOriginalBounds(tempDoc);

        // 6. Smart layout content
        try {
          await smartLayoutContent(tempDoc, srcRect.width, srcRect.height, target.width, target.height, 0, 0, sourceLayout, target.raw);
        } catch (e) { log(`Fit content skipped: ${e.message}`); }

        // 6b. Apply layer rules from settings (using original bounds for correct scale)
        try {
          await applyLayerRules(tempDoc, target.raw, target.width, target.height, 0, 0, origBounds, srcRect.width, srcRect.height);
        } catch (e) { log(`Layer rules skipped: ${e.message}`); }

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

        // 5. Scale background group as cover (always — JSON rule for bg will be skipped in applyLayerRules)
        const bgGroup = findBgGroup(newDoc);
        if (bgGroup) {
          try {
            log(`BG: "${bgGroup.name}" → cover`);
            await scaleBgCover(bgGroup, target.width, target.height);
          } catch (e) {
            log(`BG scale skipped: ${e.message}`);
          }
        }

        // 5b. Capture original layer bounds before smart layout
        const origBounds = await captureOriginalBounds(newDoc);

        // 6. Smart layout content
        try {
          await smartLayoutContent(newDoc, srcW, srcH, target.width, target.height, 0, 0, sourceLayout, target.raw);
        } catch (e) {
          log(`Fit content skipped: ${e.message}`);
        }

        // 6b. Apply layer rules from settings (using original bounds for correct scale)
        try {
          await applyLayerRules(newDoc, target.raw, target.width, target.height, 0, 0, origBounds, srcW, srcH);
        } catch (e) { log(`Layer rules skipped: ${e.message}`); }

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

// ─── Settings: Layer Rules per target size ───

const settingsPanel = document.getElementById("settingsPanel");
const sizeGroupsContainer = document.getElementById("sizeGroupsContainer");

// Data: { "300x250": [{ name, top, left, right, bottom, scale }], ... }
let layerRules = {};

function loadLayerRules() {
  try {
    const raw = localStorage.getItem("bannerCloner_layerRules");
    if (raw) layerRules = JSON.parse(raw);
  } catch (e) { layerRules = {}; }
}

function saveLayerRules() {
  localStorage.setItem("bannerCloner_layerRules", JSON.stringify(layerRules));
}

function getRulesForSize(sizeKey) {
  if (!layerRules[sizeKey]) layerRules[sizeKey] = [];
  return layerRules[sizeKey];
}

function createRuleInput(value, placeholder, sizeKey, idx, field) {
  const inp = document.createElement("input");
  inp.type = "text";
  inp.value = value;
  inp.placeholder = placeholder;
  inp.addEventListener("change", () => {
    const rules = getRulesForSize(sizeKey);
    if (rules[idx]) {
      rules[idx][field] = inp.value.trim();
      saveLayerRules();
    }
  });
  return inp;
}

function renderSizeGroups() {
  while (sizeGroupsContainer.firstChild) sizeGroupsContainer.removeChild(sizeGroupsContainer.firstChild);
  const sizes = parseSizes(sizesInput.value).map(s => s.raw);

  if (!sizes.length) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "Add target sizes in Documents tab first.";
    sizeGroupsContainer.appendChild(hint);
    return;
  }

  sizes.forEach(sizeKey => {
    const rules = getRulesForSize(sizeKey);
    const group = document.createElement("div");
    group.className = "size-group";

    // Header — clickable toggle + delete button
    const header = document.createElement("div");
    header.className = "size-group-header";

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "toggle-icon";
    toggleIcon.textContent = "\u25BC"; // ▼
    header.appendChild(toggleIcon);

    const headerTitle = document.createElement("span");
    headerTitle.textContent = " " + sizeKey;
    header.appendChild(headerTitle);

    const deleteGroupBtn = document.createElement("button");
    deleteGroupBtn.className = "delete-group-btn";
    deleteGroupBtn.textContent = "X";
    deleteGroupBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      // Remove from layerRules
      delete layerRules[sizeKey];
      saveLayerRules();
      // Remove from Target Sizes input
      const currentSizes = parseSizes(sizesInput.value).map(s => s.raw).filter(s => s !== sizeKey);
      sizesInput.value = currentSizes.join(" ");
      renderPresets();
      renderSizeGroups();
    });
    header.appendChild(deleteGroupBtn);

    // Body
    const body = document.createElement("div");
    body.className = "size-group-body";

    // Toggle collapse
    header.addEventListener("click", () => {
      const isHidden = body.style.display === "none";
      body.style.display = isHidden ? "" : "none";
      toggleIcon.textContent = isHidden ? "\u25BC" : "\u25B6"; // ▼ or ▶
    });

    group.appendChild(header);

    // Render layer rules
    rules.forEach((rule, idx) => {
      const card = document.createElement("div");
      card.className = "rule-card";

      // Name + remove
      const ruleHeader = document.createElement("div");
      ruleHeader.className = "rule-header";
      ruleHeader.appendChild(createRuleInput(rule.name || "", "Layer name (e.g. cta)", sizeKey, idx, "name"));
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-rule-btn";
      removeBtn.textContent = "X";
      removeBtn.addEventListener("click", () => {
        rules.splice(idx, 1);
        saveLayerRules();
        renderSizeGroups();
      });
      ruleHeader.appendChild(removeBtn);
      card.appendChild(ruleHeader);

      // Fields — base fields always shown
      const fields = document.createElement("div");
      fields.className = "rule-fields";
      const baseDefs = [
        { key: "top", label: "Top", ph: "px" },
        { key: "left", label: "Left", ph: "px" },
        { key: "right", label: "Right", ph: "px" },
        { key: "bottom", label: "Bottom", ph: "px" },
        { key: "scale", label: "Scale", ph: "0.6" }
      ];
      // Extra fields — only shown if they have values (from JSON import)
      const extraDefs = [
        { key: "fontSize", label: "Font", ph: "px" },
        { key: "targetWidth", label: "Width", ph: "px" },
        { key: "opacity", label: "Opacity", ph: "0-1" },
        { key: "bgPositionX", label: "BgX%", ph: "%" },
        { key: "bgPositionY", label: "BgY%", ph: "%" },
        { key: "gradientAngle", label: "GradAng", ph: "deg" }
      ];
      const allDefs = baseDefs.concat(extraDefs.filter(f => rule[f.key] !== undefined && rule[f.key] !== ""));
      allDefs.forEach(f => {
        const wrap = document.createElement("div");
        wrap.className = "rule-field-item";
        const lbl = document.createElement("label");
        lbl.textContent = f.label;
        wrap.appendChild(lbl);
        wrap.appendChild(createRuleInput(rule[f.key] ?? "", f.ph, sizeKey, idx, f.key));
        fields.appendChild(wrap);
      });
      card.appendChild(fields);
      body.appendChild(card);
    });

    // Add layer button
    const addBtn = document.createElement("button");
    addBtn.className = "add-layer-btn";
    addBtn.textContent = "+ Add Layer";
    addBtn.addEventListener("click", () => {
      rules.push({ name: "", top: "", left: "", right: "", bottom: "", scale: "" });
      saveLayerRules();
      renderSizeGroups();
    });
    body.appendChild(addBtn);

    group.appendChild(body);
    sizeGroupsContainer.appendChild(group);
  });
}

// ─── Import JSON ───

const importJsonBtn = document.getElementById("importJsonBtn");
const importInfoCard = document.getElementById("importInfoCard");
const importModuleName = document.getElementById("importModuleName");
const importSizeCount = document.getElementById("importSizeCount");

function stripUnit(val) {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  // Remove px, %, etc.
  return s.replace(/(px|%|em|rem|pt)$/i, "").trim();
}

function isValidValue(val) {
  if (val === undefined || val === null) return false;
  const s = String(val).trim();
  if (s === "" || s === "auto" || s === "none" || s === "-1") return false;
  const num = Number(stripUnit(s));
  return !isNaN(num);
}

function parseNumericValue(val) {
  if (val === undefined || val === null) return NaN;
  return parseFloat(stripUnit(String(val)));
}

function cssDirectionToAngle(dir) {
  const map = {
    "to top": 0,
    "to right": 90,
    "to bottom": 180,
    "to left": 270,
    "to top right": 45,
    "to bottom right": 135,
    "to bottom left": 225,
    "to top left": 315
  };
  return map[(dir || "").toLowerCase()] ?? null;
}

// Store raw JSON for runtime scale computation (so we can pick base size based on PSD source)
let importedJson = null;

// Find the JSON size that matches PSD source (or closest by area)
function findBaseSizeFromJson(srcW, srcH) {
  if (!importedJson || !importedJson.sizes) return null;
  // Exact match by dimensions
  const exact = importedJson.sizes.find(s => s.width === srcW && s.height === srcH);
  if (exact) return exact;
  // Exact match by name "WxH"
  const nameMatch = importedJson.sizes.find(s => s.name === `${srcW}x${srcH}`);
  if (nameMatch) return nameMatch;
  // Fallback: largest size
  return importedJson.sizes.reduce((a, b) => (a.width * a.height >= b.width * b.height) ? a : b);
}

// Compute scale for a rule using base size from PSD source
function computeRuleScale(rule, baseSize) {
  if (!baseSize || !baseSize.elements) return null;
  const baseElem = baseSize.elements[rule.name];
  if (!baseElem) return null;

  const isTextOnly = TEXT_ONLY_ELEMENTS.has((rule.name || "").toLowerCase());

  // Priority: widthElement > heightElement (skip for text-only) > fontSize > width
  if (rule._widthElement !== undefined && isValidValue(baseElem.widthElement)) {
    const baseW = parseNumericValue(baseElem.widthElement);
    if (baseW > 0) return rule._widthElement / baseW;
  }
  if (!isTextOnly && rule._heightElement !== undefined && isValidValue(baseElem.heightElement)) {
    const baseH = parseNumericValue(baseElem.heightElement);
    if (baseH > 0) return rule._heightElement / baseH;
  }
  if (rule._fontSize !== undefined && isValidValue(baseElem.fontSize)) {
    const baseF = parseNumericValue(baseElem.fontSize);
    if (baseF > 0) return rule._fontSize / baseF;
  }
  if (rule._widthRaw !== undefined && isValidValue(baseElem.width)) {
    const baseW = parseNumericValue(baseElem.width);
    if (baseW > 0) return rule._widthRaw / baseW;
  }
  return null;
}

// Text-only layer names — heightElement is unreliable for these (often constant 24px)
const TEXT_ONLY_ELEMENTS = new Set(["headline", "tagline", "subheadline", "subline", "title", "subtitle"]);

function parseJsonToRules(json) {
  const rules = {};
  if (!json.sizes || !Array.isArray(json.sizes)) return rules;

  importedJson = json;

  for (const size of json.sizes) {
    const sizeKey = size.name || `${size.width}x${size.height}`;
    rules[sizeKey] = [];

    if (!size.elements) continue;
    for (const [elemName, elem] of Object.entries(size.elements)) {
      const rule = { name: elemName };

      // Position fields — strip "px", skip "auto"/"none"
      rule.top = isValidValue(elem.top) ? String(parseNumericValue(elem.top)) : "";
      rule.left = isValidValue(elem.left) ? String(parseNumericValue(elem.left)) : "";
      rule.right = isValidValue(elem.right) ? String(parseNumericValue(elem.right)) : "";
      rule.bottom = isValidValue(elem.bottom) ? String(parseNumericValue(elem.bottom)) : "";

      // Scale — store raw values; computed at clone time using PSD source size as base
      if (isValidValue(elem.scale)) {
        rule.scale = String(parseNumericValue(elem.scale));
      } else {
        rule.scale = "";
      }
      // Store raw measurements for runtime scale computation
      if (isValidValue(elem.widthElement)) rule._widthElement = parseNumericValue(elem.widthElement);
      if (isValidValue(elem.heightElement)) rule._heightElement = parseNumericValue(elem.heightElement);
      if (isValidValue(elem.fontSize)) rule._fontSize = parseNumericValue(elem.fontSize);
      if (isValidValue(elem.width)) rule._widthRaw = parseNumericValue(elem.width);

      // Background position (% based) — positionX/positionY
      if (isValidValue(elem.positionX)) rule.bgPositionX = String(parseNumericValue(elem.positionX));
      if (isValidValue(elem.positionY)) rule.bgPositionY = String(parseNumericValue(elem.positionY));

      // Opacity — direct field
      if (isValidValue(elem.opacity)) rule.opacity = String(elem.opacity);

      // Color — "R, G, B" string
      if (elem.color && elem.color !== "auto" && elem.color !== "none") rule.color = elem.color;

      // Gradient direction — CSS syntax → angle
      if (elem.direction) {
        const angle = cssDirectionToAngle(elem.direction);
        if (angle !== null) rule.gradientAngle = String(angle);
      }

      // maxWidth
      if (isValidValue(elem.maxWidth)) rule.maxWidth = String(parseNumericValue(elem.maxWidth));

      // paddingX/paddingY (stored for potential future use)
      if (isValidValue(elem.paddingX)) rule.paddingX = String(parseNumericValue(elem.paddingX));
      if (isValidValue(elem.paddingY)) rule.paddingY = String(parseNumericValue(elem.paddingY));

      rules[sizeKey].push(rule);
    }
  }
  return rules;
}

async function importJson() {
  try {
    const file = await fs.getFileForOpening({ types: ["json"] });
    if (!file) { log("Import cancelled."); return; }

    const contents = await file.read();
    const json = JSON.parse(contents);

    // Parse and populate layerRules
    layerRules = parseJsonToRules(json);
    saveLayerRules();

    // Auto-fill Target Sizes in Documents tab
    if (json.sizes && json.sizes.length > 0) {
      const sizeStrings = json.sizes.map(s => s.name || `${s.width}x${s.height}`);
      sizesInput.value = sizeStrings.join(" ");
      renderPresets();
    }

    // Show import info
    importInfoCard.style.display = "block";
    importModuleName.textContent = json.moduleName || "Unknown";
    importSizeCount.textContent = `${json.sizes ? json.sizes.length : 0} sizes`;

    // Re-render settings
    renderSizeGroups();

    log(`[IMPORT] Loaded "${json.moduleName || "unknown"}" — ${Object.keys(layerRules).length} sizes`);
    for (const [sizeKey, rules] of Object.entries(layerRules)) {
      log(`[IMPORT]   ${sizeKey}: ${rules.length} elements (${rules.map(r => r.name).join(", ")})`);
    }
  } catch (e) {
    log(`[IMPORT] Error: ${e.message}`);
  }
}

importJsonBtn.addEventListener("click", importJson);

// ─── Tab switching (updated) ───

const mainContent = document.querySelectorAll(".app > .section, .app > #splitSection");

function switchMode(mode) {
  cloneMode = mode === "settings" ? cloneMode : mode;
  tabBtns.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
  splitSection.style.display = (mode === "artboards") ? "block" : "none";

  if (mode === "settings") {
    mainContent.forEach(el => el.style.display = "none");
    settingsPanel.style.display = "block";
    renderSizeGroups();
  } else {
    mainContent.forEach(el => el.style.display = "");
    settingsPanel.style.display = "none";
    splitSection.style.display = mode === "artboards" ? "block" : "none";
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
  loadLayerRules();
  renderPresets();
  setTimeout(refreshSource, 150);
});
