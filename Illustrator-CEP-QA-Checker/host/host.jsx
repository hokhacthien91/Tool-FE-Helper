// ─────────────────────────────────────────────
// QA Checker — ExtendScript backend
// Runs inside Illustrator via CEP CSInterface.evalScript
// ─────────────────────────────────────────────
#target illustrator

// ─── Minimal JSON encoder (ExtendScript has no JSON.stringify by default) ───
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

function errResp(e) {
    var msg = "";
    try { msg = (e && e.message) ? e.message : String(e); } catch (x) { msg = "unknown"; }
    return jsonEncode({ ok: false, error: msg });
}

// ─── Color helpers ───
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

function fmtNum(n) {
    if (n == null || isNaN(n)) return "";
    return (Math.round(Number(n) * 10) / 10).toString();
}

function rgbToHex(r, g, b) {
    var toHex = function(n) {
        var x = clamp(Math.round(n), 0, 255).toString(16);
        return x.length === 1 ? "0" + x : x;
    };
    return ("#" + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
}

function cmykToRgb(c, m, y, k) {
    return {
        r: Math.round(255 * (1 - c / 100) * (1 - k / 100)),
        g: Math.round(255 * (1 - m / 100) * (1 - k / 100)),
        b: Math.round(255 * (1 - y / 100) * (1 - k / 100))
    };
}

function colorToInfo(color) {
    var none = { model: "None", hex: "", display: "No fill", r: null, g: null, b: null };
    if (!color) return none;
    var type = "";
    try { type = color.typename; } catch (e0) { return none; }

    try {
        if (type === "RGBColor") {
            var r = Math.round(color.red);
            var g = Math.round(color.green);
            var b = Math.round(color.blue);
            var hex = rgbToHex(r, g, b);
            return {
                model: "RGB",
                hex: hex,
                display: hex + "  rgb(" + r + ", " + g + ", " + b + ")",
                r: r, g: g, b: b
            };
        }
        if (type === "CMYKColor") {
            var c = color.cyan, mg = color.magenta, yl = color.yellow, bk = color.black;
            var rgb = cmykToRgb(c, mg, yl, bk);
            var hx = rgbToHex(rgb.r, rgb.g, rgb.b);
            return {
                model: "CMYK",
                hex: hx,
                display: "CMYK(" + fmtNum(c) + ", " + fmtNum(mg) + ", " + fmtNum(yl) + ", " + fmtNum(bk) + ")  = " + hx,
                r: rgb.r, g: rgb.g, b: rgb.b
            };
        }
        if (type === "GrayColor") {
            var gr = color.gray;
            var v = Math.round(255 - (gr / 100) * 255);
            var gx = rgbToHex(v, v, v);
            return { model: "Gray", hex: gx, display: "Gray " + fmtNum(gr) + "  = " + gx, r: v, g: v, b: v };
        }
        if (type === "SpotColor") {
            var spotName = "";
            var inner = null;
            try { spotName = color.spot.name; } catch (e1) {}
            try { inner = color.spot.color; } catch (e2) {}
            if (inner) {
                var info = colorToInfo(inner);
                return {
                    model: "Spot(" + info.model + ")",
                    hex: info.hex,
                    display: 'Spot "' + spotName + '" -> ' + info.display,
                    r: info.r, g: info.g, b: info.b
                };
            }
            return { model: "Spot", hex: "", display: 'Spot "' + spotName + '"', r: null, g: null, b: null };
        }
        if (type === "PatternColor") {
            return { model: "Pattern", hex: "", display: "Pattern fill", r: null, g: null, b: null };
        }
        if (type === "GradientColor") {
            return { model: "Gradient", hex: "", display: "Gradient fill", r: null, g: null, b: null };
        }
        if (type === "NoColor") return none;
    } catch (ex) {}
    return { model: type || "Unknown", hex: "", display: type || "Unknown", r: null, g: null, b: null };
}

// ─── Font check ───
var fontInstalledCache = {};
function isFontInstalled(psName) {
    if (!psName) return true;
    if (fontInstalledCache.hasOwnProperty(psName)) return fontInstalledCache[psName];
    var ok = false;
    try { app.textFonts.getByName(psName); ok = true; } catch (e) { ok = false; }
    fontInstalledCache[psName] = ok;
    return ok;
}

// ─── Run extraction ───
function safeContents(tf) {
    try { return tf.contents || ""; } catch (e) { return ""; }
}

function extractRuns(tf) {
    var runs = [];
    var chars;
    try { chars = tf.characters; } catch (e) { return runs; }
    var n = 0;
    try { n = chars.length; } catch (e2) { n = 0; }
    if (n === 0) return runs;
    var contents = safeContents(tf);
    var cur = null;

    for (var i = 0; i < n; i++) {
        var attr;
        try { attr = chars[i].characterAttributes; } catch (ea) { continue; }

        var family = "", style = "", psName = "";
        try {
            var font = attr.textFont;
            family = font.family || "";
            style = font.style || "";
            psName = font.name || "";
        } catch (ef) {}

        var size = 0;
        try { size = Number(attr.size) || 0; } catch (es) {}

        var leading = 0;
        var autoLeading = false;
        try { autoLeading = !!attr.autoLeading; } catch (el1) {}
        try { leading = Number(attr.leading) || 0; } catch (el2) {}

        var tracking = 0;
        try { tracking = Number(attr.tracking) || 0; } catch (et) {}

        var kerning = 0;
        try { kerning = Number(attr.kerning) || 0; } catch (ek) {}

        var hScale = 100, vScale = 100;
        try { hScale = Number(attr.horizontalScale) || 100; } catch (eh) {}
        try { vScale = Number(attr.verticalScale) || 100; } catch (ev2) {}

        var baselineShift = 0;
        try { baselineShift = Number(attr.baselineShift) || 0; } catch (eb) {}

        var colorInfo;
        try { colorInfo = colorToInfo(attr.fillColor); } catch (ec) { colorInfo = colorToInfo(null); }

        var ch = contents.charAt(i);
        var key = family + "|" + style + "|" + psName
            + "|s" + size.toFixed(2)
            + "|l" + (autoLeading ? "auto" : leading.toFixed(2))
            + "|t" + tracking.toFixed(0)
            + "|h" + hScale.toFixed(1) + "v" + vScale.toFixed(1)
            + "|b" + baselineShift.toFixed(2)
            + "|" + colorInfo.model + "|" + colorInfo.hex + "|" + colorInfo.display;

        if (cur && cur.key === key) {
            cur.text += ch;
            cur.length += 1;
        } else {
            cur = {
                key: key,
                family: family,
                style: style,
                psName: psName,
                size: size,
                leading: leading,
                autoLeading: autoLeading,
                tracking: tracking,
                kerning: kerning,
                hScale: hScale,
                vScale: vScale,
                baselineShift: baselineShift,
                color: colorInfo,
                text: ch,
                length: 1,
                missing: psName ? !isFontInstalled(psName) : false
            };
            runs.push(cur);
        }
    }
    return runs;
}

// ─── Recursive text frame collector ───
function collectTextFrames(items, out) {
    var len = 0;
    try { len = items.length; } catch (e) { return; }
    for (var i = 0; i < len; i++) {
        var item;
        try { item = items[i]; } catch (e1) { continue; }
        var type = "";
        try { type = item.typename; } catch (e2) {}
        if (type === "TextFrame") {
            out.push(item);
        } else if (type === "GroupItem") {
            try { collectTextFrames(item.pageItems, out); } catch (e3) {}
        }
    }
}

function getAllTextFrames(scope) {
    if (!app.documents.length) return [];
    var doc = app.activeDocument;
    var out = [];
    if (scope === "selection") {
        var sel;
        try { sel = doc.selection; } catch (e1) { sel = []; }
        collectTextFrames(sel || [], out);
    } else {
        var tfs;
        try { tfs = doc.textFrames; } catch (e2) { return []; }
        var n = 0;
        try { n = tfs.length; } catch (e3) { n = 0; }
        for (var i = 0; i < n; i++) {
            try { out.push(tfs[i]); } catch (e4) {}
        }
    }
    return out;
}

// ─── Global store for select-by-index (after scan) ───
var qaFrameStore = [];

// ─── Public API ───
function qaScan(scope) {
    try {
        if (!app.documents.length) return jsonEncode({ ok: false, error: "No document open" });
        fontInstalledCache = {};
        var tfs = getAllTextFrames(scope);
        qaFrameStore = tfs;

        var frames = [];
        var summaryMap = {};
        var summaryKeys = [];
        var totalRuns = 0;

        for (var i = 0; i < tfs.length; i++) {
            var tf = tfs[i];
            var contents = safeContents(tf);
            var runs = extractRuns(tf);
            totalRuns += runs.length;

            var serRuns = [];
            for (var j = 0; j < runs.length; j++) {
                var r = runs[j];
                serRuns.push({
                    family: r.family,
                    style: r.style,
                    psName: r.psName,
                    size: r.size,
                    leading: r.leading,
                    autoLeading: r.autoLeading,
                    tracking: r.tracking,
                    kerning: r.kerning,
                    hScale: r.hScale,
                    vScale: r.vScale,
                    baselineShift: r.baselineShift,
                    color: r.color,
                    text: r.text,
                    length: r.length,
                    missing: r.missing,
                    key: r.key
                });

                if (!summaryMap.hasOwnProperty(r.key)) {
                    var t = "";
                    try { t = (r.text || "").replace(/^\s+|\s+$/g, ""); } catch (eT) {}
                    var samples = [];
                    if (t) samples.push(t.substring(0, 40));
                    summaryMap[r.key] = {
                        key: r.key,
                        family: r.family,
                        style: r.style,
                        psName: r.psName,
                        size: r.size,
                        leading: r.leading,
                        autoLeading: r.autoLeading,
                        tracking: r.tracking,
                        kerning: r.kerning,
                        hScale: r.hScale,
                        vScale: r.vScale,
                        baselineShift: r.baselineShift,
                        color: r.color,
                        missing: r.missing,
                        count: 1,
                        totalChars: r.length,
                        samples: samples,
                        frameIdxs: [i]
                    };
                    summaryKeys.push(r.key);
                } else {
                    var e = summaryMap[r.key];
                    e.count += 1;
                    e.totalChars += r.length;
                    var exists = false;
                    for (var sj = 0; sj < e.frameIdxs.length; sj++) {
                        if (e.frameIdxs[sj] === i) { exists = true; break; }
                    }
                    if (!exists) e.frameIdxs.push(i);
                    if (e.samples.length < 3) {
                        var tt = "";
                        try { tt = (r.text || "").replace(/^\s+|\s+$/g, ""); } catch (eT2) {}
                        if (tt) {
                            var samp = tt.substring(0, 40);
                            var dup = false;
                            for (var sk = 0; sk < e.samples.length; sk++) {
                                if (e.samples[sk] === samp) { dup = true; break; }
                            }
                            if (!dup) e.samples.push(samp);
                        }
                    }
                }
            }

            frames.push({
                idx: i,
                contents: contents,
                runs: serRuns
            });
        }

        var summary = [];
        for (var k = 0; k < summaryKeys.length; k++) summary.push(summaryMap[summaryKeys[k]]);
        summary.sort(function(a, b) { return b.count - a.count; });

        return jsonEncode({
            ok: true,
            frames: frames,
            summary: summary,
            stats: { frameCount: frames.length, runCount: totalRuns, uniqueCount: summaryKeys.length }
        });
    } catch (err) {
        return errResp(err);
    }
}

function qaGetSelection() {
    try {
        if (!app.documents.length) return jsonEncode({ ok: true, empty: true, reason: "nodoc" });
        var doc = app.activeDocument;
        var sel;
        try { sel = doc.selection; } catch (e1) { sel = []; }
        var tfs = [];
        collectTextFrames(sel || [], tfs);
        if (tfs.length === 0) return jsonEncode({ ok: true, empty: true, reason: "empty" });
        fontInstalledCache = {};
        var out = [];
        for (var i = 0; i < tfs.length; i++) {
            var tf = tfs[i];
            out.push({
                contents: safeContents(tf),
                runs: extractRuns(tf)
            });
        }
        return jsonEncode({ ok: true, frames: out });
    } catch (err) {
        return errResp(err);
    }
}

function qaSelectFrames(idxsCsv) {
    try {
        if (!app.documents.length) return jsonEncode({ ok: false, error: "No document" });
        var parts = String(idxsCsv).split(",");
        var items = [];
        for (var i = 0; i < parts.length; i++) {
            var idx = parseInt(parts[i], 10);
            if (!isNaN(idx) && idx >= 0 && idx < qaFrameStore.length) {
                items.push(qaFrameStore[idx]);
            }
        }
        var doc = app.activeDocument;
        doc.selection = null;
        if (items.length) doc.selection = items;
        app.redraw();
        return jsonEncode({ ok: true, count: items.length });
    } catch (err) {
        return errResp(err);
    }
}

function qaSavePath(defaultName) {
    try {
        var f = File.saveDialog("Save QA Report", "CSV:*.csv");
        if (!f) return "";
        var p = f.fsName;
        if (!/\.csv$/i.test(p)) p += ".csv";
        return p;
    } catch (e) {
        return "";
    }
}

// ─────────────────────────────────────────
// COLOR SCAN
// ─────────────────────────────────────────

var qaColorStore = [];

function qaGetDocName() {
    try {
        if (!app.documents.length) return "";
        return app.activeDocument.name || "";
    } catch (e) { return ""; }
}

function collectPageItems(items, out) {
    var len = 0;
    try { len = items.length; } catch (e) { return; }
    for (var i = 0; i < len; i++) {
        var item;
        try { item = items[i]; } catch (e1) { continue; }
        var type = "";
        try { type = item.typename; } catch (e2) {}
        if (type === "GroupItem") {
            try { collectPageItems(item.pageItems, out); } catch (e3) {}
        } else {
            out.push(item);
        }
    }
}

function colorKey(color) {
    if (!color) return null;
    var type;
    try { type = color.typename; } catch (e) { return null; }
    if (type === "NoColor") return null;
    if (type === "RGBColor") {
        try { return "r" + Math.round(color.red) + "," + Math.round(color.green) + "," + Math.round(color.blue); }
        catch (e) { return null; }
    }
    if (type === "CMYKColor") {
        try { return "c" + Math.round(color.cyan * 10) + "," + Math.round(color.magenta * 10) + "," + Math.round(color.yellow * 10) + "," + Math.round(color.black * 10); }
        catch (e) { return null; }
    }
    if (type === "GrayColor") {
        try { return "g" + Math.round(color.gray * 10); } catch (e) { return null; }
    }
    if (type === "SpotColor") {
        try { return "s" + color.spot.name + "@" + Math.round(color.tint * 10); } catch (e) { return null; }
    }
    if (type === "GradientColor") return "gradient";
    if (type === "PatternColor") return null;
    return null;
}

function spotToBaseHex(spotColor) {
    var tintVal = 100;
    try { tintVal = spotColor.tint; } catch (e) {}
    var baseColor = null;
    try { baseColor = spotColor.spot.color; } catch (e) {}
    if (!baseColor) return null;
    var baseInfo = colorToInfo(baseColor);
    if (!baseInfo.hex) return null;
    var tintedHex = baseInfo.hex;
    if (tintVal < 100 && baseInfo.r != null) {
        var tR = Math.round(255 - (255 - baseInfo.r) * tintVal / 100);
        var tG = Math.round(255 - (255 - baseInfo.g) * tintVal / 100);
        var tB = Math.round(255 - (255 - baseInfo.b) * tintVal / 100);
        tintedHex = rgbToHex(tR, tG, tB);
    }
    return { baseHex: baseInfo.hex, tintedHex: tintedHex, tint: tintVal, display: baseInfo.display };
}

function addToColorMap(map, keys, hex, baseHex, model, display, tint, sourceType, itemIdx, itemName, stopIdx) {
    if (!map.hasOwnProperty(baseHex)) {
        map[baseHex] = {
            hex: hex,
            baseHex: baseHex,
            model: model,
            display: display,
            tint: tint,
            count: 0,
            itemIdxs: [],
            itemNames: [],
            sourceTypes: [],
            stopInfo: []
        };
        keys.push(baseHex);
    }
    var entry = map[baseHex];
    entry.count += 1;
    var found = false;
    for (var i = 0; i < entry.itemIdxs.length; i++) {
        if (entry.itemIdxs[i] === itemIdx) { found = true; break; }
    }
    if (!found) {
        entry.itemIdxs.push(itemIdx);
        var nm = itemName;
        if (nm.length > 30) nm = nm.substring(0, 30) + "...";
        entry.itemNames.push(nm);
    }
    var foundSrc = false;
    for (var j = 0; j < entry.sourceTypes.length; j++) {
        if (entry.sourceTypes[j] === sourceType) { foundSrc = true; break; }
    }
    if (!foundSrc) entry.sourceTypes.push(sourceType);
    if (stopIdx >= 0) {
        entry.stopInfo.push({ name: itemName, stop: stopIdx });
    }
}

function processColorForMap(color, map, keys, sourceType, itemIdx, itemName, stopIdx) {
    if (!color) return;
    var type = "";
    try { type = color.typename; } catch (e) { return; }
    if (type === "NoColor" || type === "PatternColor") return;

    if (type === "GradientColor") {
        try {
            var grad = color.gradient;
            var stops = grad.gradientStops;
            for (var s = 0; s < stops.length; s++) {
                processColorForMap(stops[s].color, map, keys, "gradient-stop", itemIdx, itemName, s);
            }
        } catch (e) {}
        return;
    }

    if (type === "SpotColor") {
        var si = spotToBaseHex(color);
        if (!si) return;
        var dsp = si.display;
        if (si.tint < 100) dsp = fmtNum(si.tint) + "% tint of " + dsp;
        addToColorMap(map, keys, si.tintedHex, si.baseHex, "Spot", dsp, si.tint, sourceType, itemIdx, itemName, stopIdx);
        return;
    }

    var info = colorToInfo(color);
    if (!info.hex) return;
    addToColorMap(map, keys, info.hex, info.hex, info.model, info.display, null, sourceType, itemIdx, itemName, stopIdx);
}

function qaScanColors(scope) {
    try {
        if (!app.documents.length) return jsonEncode({ ok: false, error: "No document open" });
        var doc = app.activeDocument;
        var items = [];
        if (scope === "selection") {
            var sel;
            try { sel = doc.selection; } catch (e) { sel = []; }
            collectPageItems(sel || [], items);
        } else {
            collectPageItems(doc.pageItems, items);
        }
        qaColorStore = items;

        var colorMap = {};
        var colorKeys = [];

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var itemName = "";
            try { itemName = item.name || ""; } catch (e) {}
            if (!itemName) itemName = "Item " + (i + 1);
            var type = "";
            try { type = item.typename; } catch (e) {}

            if (type === "TextFrame") {
                var chars;
                try { chars = item.characters; } catch (e) { continue; }
                var n = 0;
                try { n = chars.length; } catch (e2) {}
                var seenF = {};
                var seenS = {};
                for (var c = 0; c < n; c++) {
                    var attr;
                    try { attr = chars[c].characterAttributes; } catch (ea) { continue; }
                    try {
                        var fc = attr.fillColor;
                        var fk = colorKey(fc);
                        if (fk && !seenF[fk]) {
                            seenF[fk] = true;
                            processColorForMap(fc, colorMap, colorKeys, "text-fill", i, itemName, -1);
                        }
                    } catch (ef) {}
                    try {
                        var sc = attr.strokeColor;
                        var sk = colorKey(sc);
                        if (sk && !seenS[sk]) {
                            seenS[sk] = true;
                            processColorForMap(sc, colorMap, colorKeys, "text-stroke", i, itemName, -1);
                        }
                    } catch (es) {}
                }
            } else if (type === "PathItem" || type === "CompoundPathItem") {
                try { processColorForMap(item.fillColor, colorMap, colorKeys, "path-fill", i, itemName, -1); } catch (ef2) {}
                try { processColorForMap(item.strokeColor, colorMap, colorKeys, "path-stroke", i, itemName, -1); } catch (es2) {}
            }
        }

        var result = [];
        for (var k = 0; k < colorKeys.length; k++) {
            result.push(colorMap[colorKeys[k]]);
        }
        result.sort(function (a, b) { return b.count - a.count; });
        return jsonEncode({ ok: true, colors: result, totalItems: items.length });
    } catch (err) {
        return errResp(err);
    }
}

function qaSelectColorItems(idxsCsv) {
    try {
        if (!app.documents.length) return jsonEncode({ ok: false, error: "No document" });
        var parts = String(idxsCsv).split(",");
        var items = [];
        for (var i = 0; i < parts.length; i++) {
            var idx = parseInt(parts[i], 10);
            if (!isNaN(idx) && idx >= 0 && idx < qaColorStore.length) {
                items.push(qaColorStore[idx]);
            }
        }
        var doc = app.activeDocument;
        doc.selection = null;
        if (items.length) doc.selection = items;
        app.redraw();
        return jsonEncode({ ok: true, count: items.length });
    } catch (err) {
        return errResp(err);
    }
}
