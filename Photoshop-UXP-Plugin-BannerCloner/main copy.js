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

const sizesInput = document.getElementById("sizesInput");
const presetWrap = document.getElementById("presetWrap");
const cloneBtn = document.getElementById("cloneBtn");
const refreshBtn = document.getElementById("refreshBtn");
const exportPsdBtn = document.getElementById("exportPsdBtn");
const exportJpgBtn = document.getElementById("exportJpgBtn");
const sourceNameEl = document.getElementById("sourceName");
const sourceSizeEl = document.getElementById("sourceSize");
const suffixNameEl = document.getElementById("suffixName");
const skipLayerInput = document.getElementById("skipLayerInput");
const logBox = document.getElementById("logBox");

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

function findBgGroup(doc) {
  for (const layer of doc.layers) {
    if (isBgGroup(layer)) return layer;
  }
  return null;
}

async function scaleBgCover(bgGroup, canvasW, canvasH) {
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

      // Center on canvas
      const newBounds = await getLayerBounds(child.id);
      const dx = (canvasW / 2) - (newBounds.left + newBounds.width / 2);
      const dy = (canvasH / 2) - (newBounds.top + newBounds.height / 2);
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

// ─── Fit content layers inside canvas ───

async function fitContentLayers(doc, canvasW, canvasH) {
  // Collect all leaf layers that are NOT inside bg group
  const leaves = [];
  function walk(layer) {
    if (isBgGroup(layer)) return;
    if (layer.layers && layer.layers.length > 0) {
      for (const child of layer.layers) walk(child);
    } else {
      leaves.push(layer);
    }
  }
  for (const layer of doc.layers) walk(layer);

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

      // Horizontal: push into canvas
      if (b.right <= 0) dx = -b.left + 10;
      else if (b.left >= canvasW) dx = (canvasW - 10) - b.right;
      else if (b.left < 0) dx = -b.left;

      // Vertical: push into canvas
      if (b.bottom <= 0) dy = -b.top + 10;
      else if (b.top >= canvasH) dy = (canvasH - 10) - b.bottom;
      else if (b.top < 0) dy = -b.top;

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

      const srcW = sourceDoc.width;
      const srcH = sourceDoc.height;
      const baseName = stripSizeSuffix(sourceDoc.title.replace(/\.[^.]+$/, ""));
      log(`Source: ${sourceDoc.title} (${srcW}x${srcH})`);

      for (const target of targets) {
        log(`--- Clone ${target.raw} ---`);
        const newName = suffixNameEl.checked ? `${baseName}_${target.raw}` : target.raw;

        // 1. Switch to source doc
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: sourceDoc.id }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        // 2. Duplicate entire document
        await bp([{
          _obj: "duplicate",
          _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
          name: newName,
          _options: { dialogOptions: "dontDisplay" }
        }]);

        const newDoc = app.activeDocument;

        // 3. Convert artboard → group → ungroup to get flat layers
        for (const layer of [...newDoc.layers]) {
          try {
            const desc = await getLayerDescriptor(layer.id);
            if (desc.artboardEnabled || desc.artboard) {
              await selectLayerById(layer.id);
              // Convert artboard to regular group
              await bp([{
                _obj: "set",
                _target: [{ _ref: "layer", _id: layer.id }],
                to: { _obj: "layer", artboardEnabled: false },
                _options: { dialogOptions: "dontDisplay" }
              }]);
              // Ungroup the group to release children
              await bp([{
                _obj: "ungroupLayersEvent",
                _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }],
                _options: { dialogOptions: "dontDisplay" }
              }]);
              log("Artboard → flat layers");
            }
          } catch (e) { /* skip non-artboard layers */ }
        }

        // 4. Resize canvas to target size (anchor center)
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

        // 6. Fit content layers: resize if too wide, move into canvas
        try {
          await fitContentLayers(newDoc, target.width, target.height);
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

          // Create artboard section from selected layers
          await bp([{
            _obj: "make",
            _target: [{ _ref: "artboardSection" }],
            from: { _ref: "layer", _enum: "ordinal", _value: "targetEnum" },
            artboardRect: {
              _obj: "classFloatRect",
              top: 0,
              left: 0,
              bottom: target.height,
              right: target.width
            },
            _options: { dialogOptions: "dontDisplay" }
          }]);

          // Rename artboard
          const abLayer = newDoc.layers[0];
          if (abLayer) {
            abLayer.name = newName;
          }
          log(`Artboard: ${newName} (${target.width}x${target.height})`);
        } catch (e) {
          log("Artboard wrap skipped: " + e.message);
        }

        log(`Created: ${newName}`);
      }

      log("=== Clone complete ===");
      log(`${targets.length} document(s) created. Adjust content, then Export.`);
    } catch (e) {
      log("Clone error: " + e.message);
      throw e;
    }
  }, { commandName: "Banner Cloner Pro - Clone" });
}

// ─── Export current document as PSD/JPG ───

async function exportDoc(format) {
  const folder = await fs.getFolder();
  if (!folder) {
    log("Export cancelled.");
    return;
  }

  await core.executeAsModal(async () => {
    try {
      const docs = app.documents;
      if (!docs.length) {
        log("No documents open.");
        return;
      }

      log(`Exporting ${docs.length} document(s) as ${format.toUpperCase()}...`);

      for (const doc of docs) {
        // Make it the active document
        await bp([{
          _obj: "select",
          _target: [{ _ref: "document", _id: doc.id }],
          _options: { dialogOptions: "dontDisplay" }
        }]);

        const docName = doc.title.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*]/g, "_");
        log(`Exporting: ${docName}`);

        if (format === "psd") {
          const file = await folder.createFile(docName + ".psd", { overwrite: true });
          const token = await fs.createSessionToken(file);
          await bp([{
            _obj: "save",
            as: { _obj: "photoshop35Format", maximizeCompatibility: true },
            in: { _path: token, _kind: "local" },
            lowerCase: true,
            _options: { dialogOptions: "dontDisplay" }
          }]);
        } else if (format === "jpg") {
          // Duplicate doc, flatten, save, close
          await bp([{
            _obj: "duplicate",
            _target: [{ _ref: "document", _enum: "ordinal", _value: "first" }],
            name: docName + "_flat",
            _options: { dialogOptions: "dontDisplay" }
          }]);
          await bp([{ _obj: "flattenImage", _options: { dialogOptions: "dontDisplay" } }]);

          const file = await folder.createFile(docName + ".jpg", { overwrite: true });
          const token = await fs.createSessionToken(file);
          await bp([{
            _obj: "save",
            as: {
              _obj: "JPEG",
              extendedQuality: 10,
              matteColor: { _enum: "matteColor", _value: "white" }
            },
            in: { _path: token, _kind: "local" },
            lowerCase: true,
            _options: { dialogOptions: "dontDisplay" }
          }]);

          // Close flattened copy
          await bp([{
            _obj: "close",
            saving: { _enum: "yesNo", _value: "no" },
            _options: { dialogOptions: "dontDisplay" }
          }]);
        }

        log(`Saved: ${docName}.${format}`);
      }

      log(`=== Export ${format.toUpperCase()} complete ===`);
    } catch (e) {
      log("Export error: " + e.message);
      throw e;
    }
  }, { commandName: `Banner Cloner Pro - Export ${format.toUpperCase()}` });
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
cloneBtn.addEventListener("click", cloneAll);
exportPsdBtn.addEventListener("click", () => exportDoc("psd"));
exportJpgBtn.addEventListener("click", () => exportDoc("jpg"));

document.addEventListener("DOMContentLoaded", () => {
  renderPresets();
  setTimeout(refreshSource, 150);
});
