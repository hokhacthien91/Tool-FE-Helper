// ─────────────────────────────────────────────
// Banner Cloner — ExtendScript backend (Illustrator CEP)
// All functions called via CSInterface.evalScript from panel.
// Coordinates: Illustrator's geometricBounds is [L, Tup, R, Bup] (Y-up).
// We normalize to Y-DOWN boxes ({left, top, right, bottom}) internally so
// the smart-layout math mirrors the Photoshop port.
// ─────────────────────────────────────────────
#target illustrator

// ─── JSON encode (ExtendScript has no JSON.stringify by default) ───
function jsonEncode(v) {
    var t = typeof v;
    if (v === null || t === "undefined") return "null";
    if (t === "boolean") return v ? "true" : "false";
    if (t === "number") return isFinite(v) ? String(v) : "null";
    if (t === "string") {
        return '"' + v
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t")
            .replace(/[\x00-\x1f]/g, " ") + '"';
    }
    if (v instanceof Array) {
        var a = [];
        for (var i = 0; i < v.length; i++) a.push(jsonEncode(v[i]));
        return "[" + a.join(",") + "]";
    }
    if (t === "object") {
        var b = [];
        for (var k in v) {
            if (v.hasOwnProperty(k)) b.push(jsonEncode(k) + ":" + jsonEncode(v[k]));
        }
        return "{" + b.join(",") + "}";
    }
    return "null";
}

function ok(data) {
    var o = { ok: true };
    if (data) for (var k in data) if (data.hasOwnProperty(k)) o[k] = data[k];
    return jsonEncode(o);
}
function err(e) {
    var msg;
    try { msg = (e && e.message) ? e.message : String(e); } catch (x) { msg = "unknown"; }
    return jsonEncode({ ok: false, error: msg });
}

// ─── Logging buffer (host writes lines, panel pulls them after each call) ───
var bcLog = [];
function logMsg(m) { try { bcLog.push(String(m)); } catch (e) {} }
function flushLog() { var out = bcLog; bcLog = []; return out; }
function bcGetLog() { return jsonEncode({ ok: true, log: flushLog() }); }

// ─── String utils ───
function trim(s) { return String(s == null ? "" : s).replace(/^\s+|\s+$/g, ""); }
function lower(s) { return String(s == null ? "" : s).toLowerCase(); }

function stripSizeSuffix(name) {
    var m = String(name || "").match(/^(.*?)([-_ ])(\d+x\d+)$/i);
    if (!m) return { base: name, sep: "_" };
    return { base: m[1], sep: m[2] };
}

// ─── Box helpers ───
// Convert Illustrator geometricBounds [L, Tup, R, Bup] → Y-down box.
function boxFromAIBounds(gb) {
    var L = Number(gb[0]), Tup = Number(gb[1]), R = Number(gb[2]), Bup = Number(gb[3]);
    return {
        left: L, top: -Tup, right: R, bottom: -Bup,
        width: R - L, height: Tup - Bup
    };
}
function boxFromArtboardRect(ar) { return boxFromAIBounds(ar); }

// Item geometric bounds → Y-down box. Use .geometricBounds (no stroke/effects).
function itemBox(item) {
    try { return boxFromAIBounds(item.geometricBounds); }
    catch (e) { return null; }
}
function itemVisibleBox(item) {
    try { return boxFromAIBounds(item.visibleBounds); }
    catch (e) { return null; }
}

// Move item by (dx, dy) in Y-down convention. translate() is Y-up so flip dy.
function moveItem(item, dx, dy) {
    try {
        if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return;
        item.translate(dx, -dy);
    } catch (e) { logMsg("[MOVE] " + (item.name || "?") + " ERROR: " + e.message); }
}

// Resize an item to absolute width/height (non-uniform if both given, uniform by W if only W).
function resizeItemTo(item, targetW, targetH) {
    var b = itemBox(item);
    if (!b || b.width <= 0 || b.height <= 0) return;
    var sx = targetW ? (targetW / b.width) : null;
    var sy = targetH ? (targetH / b.height) : null;
    var scaleX, scaleY;
    if (sx != null && sy != null) { scaleX = sx; scaleY = sy; }
    else if (sx != null) { scaleX = sx; scaleY = sx; }
    else if (sy != null) { scaleX = sy; scaleY = sy; }
    else return;
    if (Math.abs(scaleX - 1) < 0.001 && Math.abs(scaleY - 1) < 0.001) return;
    try {
        // resize(scaleX%, scaleY%, changePositions, changeFillPatterns, changeFillGradients,
        //        changeStrokePattern, changeLineWidths, scaleAbout)
        item.resize(scaleX * 100, scaleY * 100, true, true, true, true, scaleX * 100,
                    Transformation.CENTER);
    } catch (e) { logMsg("[RESIZE] " + (item.name || "?") + " ERROR: " + e.message); }
}

function scaleItemUniform(item, scale) {
    if (Math.abs(scale - 1) < 0.001) return;
    try {
        item.resize(scale * 100, scale * 100, true, true, true, true, scale * 100,
                    Transformation.CENTER);
    } catch (e) { logMsg("[SCALE] " + (item.name || "?") + " ERROR: " + e.message); }
}

// Center of a Y-down box.
function centerOf(b) { return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; }

// ─── Item traversal ───
// Walk an item tree; returns flat list of leaves (non-group items) by kind.
function isText(item) { return item && item.typename === "TextFrame"; }
function isGroupLike(item) {
    if (!item) return false;
    var t = item.typename;
    return t === "GroupItem" || t === "Layer";
}

function collectLeaves(item, out) {
    if (!item) return;
    if (isGroupLike(item)) {
        var kids;
        try { kids = item.pageItems; } catch (e) { return; }
        var n = 0; try { n = kids.length; } catch (e2) { n = 0; }
        for (var i = 0; i < n; i++) collectLeaves(kids[i], out);
    } else {
        out.push(item);
    }
}

function leavesByKind(item) {
    var leaves = []; collectLeaves(item, leaves);
    var texts = [], shapes = [], images = [], others = [];
    for (var i = 0; i < leaves.length; i++) {
        var l = leaves[i], t = l.typename;
        if (t === "TextFrame") texts.push(l);
        else if (t === "PlacedItem" || t === "RasterItem") images.push(l);
        else if (t === "PathItem" || t === "CompoundPathItem") shapes.push(l);
        else others.push(l);
    }
    return { texts: texts, shapes: shapes, images: images, others: others };
}

// Compute the union bounds of an item INCLUDING its children (for groups,
// item.geometricBounds already gives the union, but be defensive about empty
// groups and clipping masks).
function unionBoxOfItem(item) {
    if (!item) return null;
    if (!isGroupLike(item)) return itemBox(item);
    // For groups, collect leaf bounds and union them. This avoids clipping mask issues.
    var leaves = []; collectLeaves(item, leaves);
    if (!leaves.length) return itemBox(item);
    var minL = Infinity, minT = Infinity, maxR = -Infinity, maxB = -Infinity;
    for (var i = 0; i < leaves.length; i++) {
        var b = itemBox(leaves[i]);
        if (!b || b.width <= 0 || b.height <= 0) continue;
        if (b.left < minL) minL = b.left;
        if (b.top < minT) minT = b.top;
        if (b.right > maxR) maxR = b.right;
        if (b.bottom > maxB) maxB = b.bottom;
    }
    if (minL === Infinity) return itemBox(item);
    return { left: minL, top: minT, right: maxR, bottom: maxB,
             width: maxR - minL, height: maxB - minT };
}

// Find descendant items (any depth) where predicate(item) is true.
function findInItems(items, predicate, out) {
    out = out || [];
    var n = 0; try { n = items.length; } catch (e) { n = 0; }
    for (var i = 0; i < n; i++) {
        var item = items[i];
        if (!item) continue;
        if (predicate(item)) out.push(item);
        if (isGroupLike(item)) {
            try { findInItems(item.pageItems, predicate, out); } catch (e2) {}
        }
    }
    return out;
}

function findByName(roots, name) {
    var target = lower(name);
    return findInItems(roots, function (it) {
        try { return lower(it.name) === target; } catch (e) { return false; }
    });
}

// ─── Source artboard detection ───
function getSourceArtboard() {
    if (!app.documents.length) throw new Error("No document open.");
    var doc = app.activeDocument;
    var idx = doc.artboards.getActiveArtboardIndex();
    if (idx < 0) idx = 0;
    var ab = doc.artboards[idx];
    var box = boxFromArtboardRect(ab.artboardRect);
    return { doc: doc, idx: idx, ab: ab, name: ab.name, box: box };
}

function bcDetectSource() {
    try {
        var src = getSourceArtboard();
        var stripped = stripSizeSuffix(src.name);
        return ok({
            name: src.name,
            baseName: stripped.base,
            sep: stripped.sep,
            width: Math.round(src.box.width),
            height: Math.round(src.box.height),
            artboardIndex: src.idx,
            docName: src.doc.name,
            artboardCount: src.doc.artboards.length
        });
    } catch (e) { return err(e); }
}

// ─── Find items belonging to source artboard ───
// Items "belong" if their geometric center is inside the artboard rect.
function isCenterInBox(itemBoxObj, abBox, tolerance) {
    var t = tolerance || 0;
    var c = centerOf(itemBoxObj);
    return c.x >= abBox.left - t && c.x <= abBox.right + t
        && c.y >= abBox.top - t && c.y <= abBox.bottom + t;
}

// Walk top-level items in each layer, collect those whose center is inside abBox.
// We collect AT THE TOP LEVEL OF EACH LAYER (don't dive into groups) so groups
// stay intact when duplicated.
function topLevelItemsInArtboard(doc, abBox) {
    var out = [];
    for (var li = 0; li < doc.layers.length; li++) {
        var layer = doc.layers[li];
        if (layer.locked || !layer.visible) continue;
        var items;
        try { items = layer.pageItems; } catch (e) { continue; }
        var n = 0; try { n = items.length; } catch (e2) { n = 0; }
        for (var i = 0; i < n; i++) {
            var it = items[i];
            var b = unionBoxOfItem(it);
            if (!b || b.width <= 0 || b.height <= 0) continue;
            if (isCenterInBox(b, abBox, 1)) out.push(it);
        }
    }
    return out;
}

// ─── Smart layout ───
// Capture relative positions of named groups inside source artboard.
// Returns { byName: { lowername: {relCx, relCy, relW, relH} } }
function captureSourceLayout(items, abBox, ggPrefix) {
    var byName = {};
    var prefix = ggPrefix ? lower(ggPrefix) : "";
    // Find a top-level "content" group; if missing, use all items.
    var content = null;
    for (var i = 0; i < items.length; i++) {
        if (lower(items[i].name) === "content") { content = items[i]; break; }
    }
    var scope = content ? collectChildren(content) : items;
    for (var j = 0; j < scope.length; j++) {
        var it = scope[j];
        var nm = lower(it.name);
        if (!nm) continue;
        if (prefix && nm.indexOf(prefix) !== 0) continue;
        var b = unionBoxOfItem(it);
        if (!b || b.width <= 0 || b.height <= 0) continue;
        byName[nm] = {
            relCx: (b.left + b.width / 2 - abBox.left) / abBox.width,
            relCy: (b.top + b.height / 2 - abBox.top) / abBox.height,
            relW: b.width / abBox.width,
            relH: b.height / abBox.height
        };
    }
    return byName;
}

function collectChildren(group) {
    var out = [];
    if (!isGroupLike(group)) return out;
    var kids;
    try { kids = group.pageItems; } catch (e) { return out; }
    var n = 0; try { n = kids.length; } catch (e2) { n = 0; }
    for (var i = 0; i < n; i++) out.push(kids[i]);
    return out;
}

// Apply smart layout to cloned items: scale + reposition named groups so their
// relative center matches the source layout. Skips names listed in ruledNames.
// Skips the bg group (scaleBgCover handles it separately).
function smartLayout(clonedItems, sourceLayout, dstBox, opts) {
    var ruledNames = opts.ruledNames || {};
    var bgName = opts.bgName ? lower(opts.bgName) : "";
    var ggPrefix = opts.ggPrefix ? lower(opts.ggPrefix) : "";
    var pad = Math.round(Math.min(dstBox.width, dstBox.height) * 0.05);

    // Find content group within clones (recursive).
    var content = null;
    for (var i = 0; i < clonedItems.length; i++) {
        if (lower(clonedItems[i].name) === "content") { content = clonedItems[i]; break; }
    }
    var scope = content ? collectChildren(content) : clonedItems;

    for (var j = 0; j < scope.length; j++) {
        var it = scope[j];
        var nm = lower(it.name);
        if (!nm) continue;
        if (nm === bgName) continue;
        if (ruledNames.hasOwnProperty(nm)) continue;
        if (ggPrefix && nm.indexOf(ggPrefix) !== 0) continue;
        var src = sourceLayout[nm];
        if (!src) continue;
        try {
            var b = unionBoxOfItem(it);
            if (!b || b.width <= 0 || b.height <= 0) continue;

            // Scale-to-fit: don't let a single group exceed 80% of canvas.
            var maxW = dstBox.width * 0.8, maxH = dstBox.height * 0.8;
            var fitX = b.width > maxW ? maxW / b.width : 1;
            var fitY = b.height > maxH ? maxH / b.height : 1;
            var fit = Math.min(fitX, fitY, 1);
            if (Math.abs(fit - 1) > 0.01) {
                scaleItemUniform(it, fit);
                b = unionBoxOfItem(it);
            }

            var targetCx = dstBox.left + src.relCx * dstBox.width;
            var targetCy = dstBox.top + src.relCy * dstBox.height;
            var c = centerOf(b);
            var dx = targetCx - c.x, dy = targetCy - c.y;

            // Clamp to canvas (with padding).
            var newL = b.left + dx, newR = newL + b.width;
            var newT = b.top + dy, newBb = newT + b.height;
            if (newR > dstBox.right - pad) { dx -= (newR - (dstBox.right - pad)); newL = b.left + dx; }
            if (newL < dstBox.left + pad) { dx += ((dstBox.left + pad) - newL); }
            newT = b.top + dy; newBb = newT + b.height;
            if (newBb > dstBox.bottom - pad) { dy -= (newBb - (dstBox.bottom - pad)); newT = b.top + dy; }
            if (newT < dstBox.top + pad) { dy += ((dstBox.top + pad) - newT); }

            if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) moveItem(it, dx, dy);
        } catch (e) {
            logMsg("[LAYOUT] '" + (it.name || "?") + "' ERROR: " + e.message);
        }
    }
}

// Background cover: scale bg group to fill canvas, center on canvas.
function scaleBgCover(bgItem, dstBox) {
    if (!bgItem) return;
    var b = unionBoxOfItem(bgItem);
    if (!b || b.width <= 0 || b.height <= 0) return;
    var sx = dstBox.width / b.width, sy = dstBox.height / b.height;
    var scale = Math.max(sx, sy);
    if (Math.abs(scale - 1) > 0.01) {
        scaleItemUniform(bgItem, scale);
        b = unionBoxOfItem(bgItem);
    }
    var c = centerOf(b);
    var tx = dstBox.left + dstBox.width / 2;
    var ty = dstBox.top + dstBox.height / 2;
    moveItem(bgItem, tx - c.x, ty - c.y);
}

// ─── Layer rules (from JSON) ───
// Rules per size: { "300x250": { "gg-headline": { fontSize: "20px", top: "30px", ... }, ... } }
function parsePxNumber(v) {
    if (v == null || v === "" || v === "auto") return null;
    var s = String(v).replace(/px$/i, "");
    var n = parseFloat(s);
    return isNaN(n) ? null : n;
}

function setTextFontSize(textFrame, sizePt) {
    try {
        var range = textFrame.textRange;
        range.characterAttributes.size = sizePt;
        return true;
    } catch (e) {
        logMsg("[TEXT] " + (textFrame.name || "?") + " setSize ERROR: " + e.message);
        return false;
    }
}

function applyRuleToItem(item, rule, dstBox) {
    var name = item.name || "";
    var leaves = leavesByKind(item);

    // Resolve target W/H. Don't mix sources: prefer raw width/height as a unit;
    // otherwise fall back to widthElement/heightElement as a unit.
    var widthRaw = parsePxNumber(rule.width);
    var heightRaw = parsePxNumber(rule.height);
    var widthEl = parsePxNumber(rule.widthElement);
    var heightEl = parsePxNumber(rule.heightElement);
    var targetW, targetH, hasBothWH;
    if (widthRaw != null || heightRaw != null) {
        targetW = widthRaw; targetH = heightRaw;
        hasBothWH = widthRaw != null && heightRaw != null;
    } else {
        targetW = widthEl; targetH = heightEl;
        hasBothWH = widthEl != null && heightEl != null;
    }

    var directApplied = false;

    // 1. Text → fontSize (in pt; AI uses pt natively)
    var fontSize = parsePxNumber(rule.fontSize);
    if (fontSize != null && leaves.texts.length) {
        for (var t = 0; t < leaves.texts.length; t++) setTextFontSize(leaves.texts[t], fontSize);
        directApplied = true;
        logMsg("[RULE] '" + name + "' fontSize → " + fontSize + "pt");
    }

    // 2. Non-text → resize to targetW/H
    var nonText = leaves.shapes.concat(leaves.images).concat(leaves.others);
    if (nonText.length && (targetW != null || targetH != null)) {
        for (var k = 0; k < nonText.length; k++) {
            var lf = nonText[k];
            var lb = itemBox(lf);
            if (!lb || lb.width <= 0 || lb.height <= 0) continue;
            if (hasBothWH) {
                resizeItemTo(lf, targetW, targetH);
                logMsg("[RULE] '" + name + "' resize " + Math.round(targetW) + "x" + Math.round(targetH));
            } else if (targetW != null) {
                scaleItemUniform(lf, targetW / lb.width);
                logMsg("[RULE] '" + name + "' uniform-scale to W=" + Math.round(targetW));
            } else {
                scaleItemUniform(lf, targetH / lb.height);
                logMsg("[RULE] '" + name + "' uniform-scale to H=" + Math.round(targetH));
            }
        }
        directApplied = true;
    }

    // 3. Explicit scale (group-level uniform scale)
    if (!directApplied && rule.scale != null && rule.scale !== "") {
        var sv = parseFloat(rule.scale);
        if (!isNaN(sv) && sv > 0 && Math.abs(sv - 1) > 0.01) {
            scaleItemUniform(item, sv);
            logMsg("[RULE] '" + name + "' scale=" + sv);
        }
    }

    // 4. Position (top > bottom priority, left > right priority)
    var b = unionBoxOfItem(item);
    if (!b || b.width <= 0 || b.height <= 0) return;
    var topV = parsePxNumber(rule.top);
    var leftV = parsePxNumber(rule.left);
    var rightV = parsePxNumber(rule.right);
    var bottomV = parsePxNumber(rule.bottom);

    var dx = 0, dy = 0;
    if (topV != null) dy = (dstBox.top + topV) - b.top;
    else if (bottomV != null) dy = (dstBox.bottom - bottomV) - b.bottom;
    if (leftV != null) dx = (dstBox.left + leftV) - b.left;
    else if (rightV != null) dx = (dstBox.right - rightV) - b.right;

    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        moveItem(item, dx, dy);
        logMsg("[RULE] '" + name + "' move dx=" + Math.round(dx) + " dy=" + Math.round(dy));
    }

    // 5. Opacity (0-1 or 0-100)
    if (rule.opacity != null && rule.opacity !== "") {
        var ov = parseFloat(rule.opacity);
        if (!isNaN(ov)) {
            var pct = ov <= 1 ? Math.round(ov * 100) : Math.round(ov);
            try { item.opacity = pct; logMsg("[RULE] '" + name + "' opacity=" + pct + "%"); }
            catch (e) {}
        }
    }
}

function applyRules(clonedItems, rules, dstBox) {
    if (!rules) return;
    var ruledNames = {};
    for (var nm in rules) if (rules.hasOwnProperty(nm)) ruledNames[lower(nm)] = true;

    for (var ruleName in rules) {
        if (!rules.hasOwnProperty(ruleName)) continue;
        var rule = rules[ruleName];
        var matches = findByName(clonedItems, ruleName);
        if (!matches.length) {
            logMsg("[RULE] '" + ruleName + "' not found in clones, skip");
            continue;
        }
        // Apply only to first match.
        applyRuleToItem(matches[0], rule, dstBox);
    }
    return ruledNames;
}

// ─── Clone-as-artboards core ───
// For each target size:
//   1. Compute new artboard rect (placed to the right of all existing artboards).
//   2. Duplicate top-level items from source artboard, translate to new artboard.
//   3. Apply rules + smart layout + bg cover.
//   4. Resize artboard to target W/H if smart math left it as source size.
//      Actually we create the artboard at exact target W/H from the start.

// Y-down dst box for new artboard placed at (dstLeft, dstTop) with size (w, h)
function rectAtFromYDown(left, top, w, h) {
    // Convert Y-down (top, bottom) to AI Y-up artboardRect [L, Tup, R, Bup].
    return [left, -top, left + w, -(top + h)];
}

function findRightmostArtboardEdge(doc) {
    var maxR = -Infinity;
    for (var i = 0; i < doc.artboards.length; i++) {
        var b = boxFromArtboardRect(doc.artboards[i].artboardRect);
        if (b.right > maxR) maxR = b.right;
    }
    return maxR === -Infinity ? 0 : maxR;
}

// Build map of rules keyed by size string (e.g. "300x250").
function rulesForSize(allRules, sizeKey) {
    if (!allRules) return null;
    if (allRules[sizeKey]) return allRules[sizeKey];
    return null;
}

// Convert banner-html-v1-sizes-gg.json format → flat per-size element rules.
// Input: { moduleName, sizes: [ { name:"970x250", width, height, elements: { "gg-x": {...} } } ] }
// Output: { "970x250": { "gg-x": {...} } }
function flattenJsonRules(json) {
    var out = {};
    if (!json) return out;
    var sizes = json.sizes;
    if (!(sizes instanceof Array)) return out;
    for (var i = 0; i < sizes.length; i++) {
        var s = sizes[i];
        if (!s || !s.name) continue;
        out[s.name] = s.elements || {};
    }
    return out;
}

// Find first top-level item in clonedItems that matches the bg name
function findBgInClones(clonedItems, bgName) {
    if (!bgName) return null;
    var lc = lower(bgName);
    for (var i = 0; i < clonedItems.length; i++) {
        if (lower(clonedItems[i].name) === lc) return clonedItems[i];
    }
    // Fallback: any top-level item with "background" in name
    for (var j = 0; j < clonedItems.length; j++) {
        var nm = lower(clonedItems[j].name);
        if (nm.indexOf("background") !== -1 || nm.indexOf("-bg") !== -1) return clonedItems[j];
    }
    return null;
}

function bcCloneSizes(opts) {
    try {
        bcLog = [];
        opts = opts || {};
        var sizes = opts.sizes || [];
        if (!sizes.length) throw new Error("No target sizes provided.");
        var allRules = flattenJsonRules(opts.rulesJson);
        var bgName = opts.bgName || "";
        var ggPrefix = opts.ggPrefix || "";
        var suffix = opts.suffix !== false;
        var smartMatch = opts.smartMatch !== false;

        var src = getSourceArtboard();
        var doc = src.doc;
        var srcBox = src.box;
        var stripped = stripSizeSuffix(src.name);
        var baseName = stripped.base;
        var sep = stripped.sep || "_";

        logMsg("Source artboard: " + src.name + " (" + Math.round(srcBox.width) + "x" + Math.round(srcBox.height) + ")");

        var srcItems = topLevelItemsInArtboard(doc, srcBox);
        logMsg("Found " + srcItems.length + " top-level items inside source artboard.");
        var sourceLayout = captureSourceLayout(srcItems, srcBox, ggPrefix);
        var layoutNames = []; for (var ln in sourceLayout) if (sourceLayout.hasOwnProperty(ln)) layoutNames.push(ln);
        if (layoutNames.length) logMsg("Captured layout for: " + layoutNames.join(", "));

        var nextLeft = findRightmostArtboardEdge(doc) + 80;
        var created = [];

        for (var s = 0; s < sizes.length; s++) {
            var size = sizes[s];
            var w = Number(size.w), h = Number(size.h);
            if (!w || !h) continue;
            var sizeKey = w + "x" + h;
            var artName = suffix ? (baseName + sep + sizeKey) : (sizeKey);
            logMsg("─── " + sizeKey + " → '" + artName + "' ───");

            // 1. Create new artboard at (nextLeft, srcBox.top) with size w x h
            var dstLeft = nextLeft;
            var dstTop = srcBox.top;
            var rect = rectAtFromYDown(dstLeft, dstTop, w, h);
            var ab = doc.artboards.add(rect);
            ab.name = artName;
            var dstBox = boxFromArtboardRect(ab.artboardRect);
            nextLeft = dstBox.right + 80;

            // 2. Duplicate items from source, offset to new artboard
            var dx = dstBox.left - srcBox.left;
            var dy = dstBox.top - srcBox.top;
            var dups = [];
            for (var i = 0; i < srcItems.length; i++) {
                try {
                    var dup = srcItems[i].duplicate();
                    moveItem(dup, dx, dy);
                    dups.push(dup);
                } catch (e) {
                    logMsg("[DUP] '" + (srcItems[i].name || "?") + "' ERROR: " + e.message);
                }
            }
            logMsg("Duplicated " + dups.length + " items.");

            // 3. Apply rules (per-element)
            var sizeRules = rulesForSize(allRules, sizeKey);
            var ruledNames = {};
            if (sizeRules) {
                logMsg("Applying " + countKeys(sizeRules) + " rules from JSON.");
                ruledNames = applyRules(dups, sizeRules, dstBox) || {};
            }

            // 4. Bg cover (only if bg layer is NOT in rules and smartMatch is on)
            if (smartMatch && bgName && !ruledNames[lower(bgName)]) {
                var bg = findBgInClones(dups, bgName);
                if (bg) { logMsg("Bg cover on '" + bg.name + "'"); scaleBgCover(bg, dstBox); }
            }

            // 5. Smart layout for un-ruled named groups
            if (smartMatch) {
                smartLayout(dups, sourceLayout, dstBox, {
                    ruledNames: ruledNames,
                    bgName: bgName,
                    ggPrefix: ggPrefix
                });
            }

            created.push({ name: artName, w: w, h: h, sizeKey: sizeKey });
        }

        try { app.redraw(); } catch (e) {}
        return ok({ created: created, log: flushLog() });
    } catch (e) {
        return jsonEncode({ ok: false, error: e.message, log: flushLog() });
    }
}

function countKeys(o) { var n = 0; for (var k in o) if (o.hasOwnProperty(k)) n++; return n; }

// ─── Export (JPG + AI save) ───
function bcExportArtboards(opts) {
    try {
        bcLog = [];
        opts = opts || {};
        var folder = opts.folder;
        if (!folder) throw new Error("No output folder.");
        var jpgQuality = opts.jpgQuality != null ? opts.jpgQuality : 80;
        var artNames = opts.artboardNames || null; // null = all
        var saveAi = opts.saveAi !== false;

        if (!app.documents.length) throw new Error("No document open.");
        var doc = app.activeDocument;

        // Build folder structure: <folder>/output/  +  <folder>/working-file/
        var outputDir = new Folder(folder + "/output");
        var workDir = new Folder(folder + "/working-file");
        if (!outputDir.exists) outputDir.create();
        if (!workDir.exists) workDir.create();

        var jpgOpts = new ExportOptionsJPEG();
        jpgOpts.qualitySetting = jpgQuality;
        jpgOpts.antiAliasing = true;
        jpgOpts.artBoardClipping = true;
        jpgOpts.optimization = true;

        var jpgPaths = [];
        var origIdx = doc.artboards.getActiveArtboardIndex();

        for (var i = 0; i < doc.artboards.length; i++) {
            var ab = doc.artboards[i];
            if (artNames) {
                var match = false;
                for (var j = 0; j < artNames.length; j++) if (artNames[j] === ab.name) { match = true; break; }
                if (!match) continue;
            }
            doc.artboards.setActiveArtboardIndex(i);
            var safe = sanitizeFilename(ab.name) + ".jpg";
            var jpgFile = new File(outputDir.fsName + "/" + safe);
            doc.exportFile(jpgFile, ExportType.JPEG, jpgOpts);
            jpgPaths.push(jpgFile.fsName);
            logMsg("JPG → " + safe);
        }

        try { doc.artboards.setActiveArtboardIndex(origIdx); } catch (e) {}

        var aiPath = "";
        if (saveAi) {
            var safeDoc = sanitizeFilename(stripExt(doc.name) || "banner");
            var aiFile = new File(workDir.fsName + "/" + safeDoc + ".ai");
            var aiOpts = new IllustratorSaveOptions();
            try { aiOpts.compatibility = Compatibility.ILLUSTRATOR24; } catch (e) {}
            aiOpts.pdfCompatible = true;
            doc.saveAs(aiFile, aiOpts);
            aiPath = aiFile.fsName;
            logMsg("AI saved → " + aiFile.fsName);
        }

        return ok({ jpgPaths: jpgPaths, aiPath: aiPath, log: flushLog() });
    } catch (e) {
        return jsonEncode({ ok: false, error: e.message, log: flushLog() });
    }
}

function sanitizeFilename(s) {
    return String(s || "untitled").replace(/[\\/:*?"<>|]/g, "_");
}
function stripExt(n) {
    return String(n || "").replace(/\.[a-z0-9]+$/i, "");
}

// ─── Folder/file dialog helpers ───
function bcPickFolder(promptText) {
    try {
        var f = Folder.selectDialog(promptText || "Choose output folder");
        if (!f) return jsonEncode({ ok: true, path: "" });
        return jsonEncode({ ok: true, path: f.fsName });
    } catch (e) { return err(e); }
}

function bcPickFile(promptText, filter) {
    try {
        var f = File.openDialog(promptText || "Choose file", filter || "*.json");
        if (!f) return jsonEncode({ ok: true, path: "" });
        return jsonEncode({ ok: true, path: f.fsName });
    } catch (e) { return err(e); }
}

function bcReadFile(path) {
    try {
        var f = new File(path);
        if (!f.exists) throw new Error("File not found: " + path);
        f.encoding = "UTF-8";
        if (!f.open("r")) throw new Error("Cannot open: " + path);
        var content = f.read();
        f.close();
        return jsonEncode({ ok: true, content: content });
    } catch (e) { return err(e); }
}

function bcWriteFile(path, content) {
    try {
        var f = new File(path);
        f.encoding = "UTF-8";
        if (!f.open("w")) throw new Error("Cannot write: " + path);
        f.write(content);
        f.close();
        return jsonEncode({ ok: true, path: path });
    } catch (e) { return err(e); }
}

// ─── Diagnostic ping ───
function bcPing() {
    try {
        return ok({
            host: app.name,
            version: app.version,
            docCount: app.documents.length,
            docName: app.documents.length ? app.activeDocument.name : ""
        });
    } catch (e) { return err(e); }
}
