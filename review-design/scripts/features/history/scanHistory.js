import { escapeHtml } from "../../utils/html.js";

export function createScanHistoryManager({
  maxHistory = 10,
  postPluginMessage,
  getCurrentReportData,
  setIsViewingTokens,
  renderResults,
  renderTokens
} = {}) {
  let scanHistoryMemory = [];
  let hasLoadedHistoryOnce = false;

  const safePost = (pluginMessage) => {
    try {
      if (typeof postPluginMessage === "function") {
        postPluginMessage(pluginMessage);
      }
    } catch (e) {
      console.error("scanHistory postPluginMessage error:", e);
    }
  };

  function setHistory(history) {
    const list = Array.isArray(history) ? history : [];
    scanHistoryMemory = list.slice(0, maxHistory);
  }

  function clearLocalHistory() {
    scanHistoryMemory = [];
    hasLoadedHistoryOnce = false;
  }

  function getScanHistory() {
    return scanHistoryMemory || [];
  }

  function saveScanHistory(mode, type, data, context) {
    try {
      if (type === "issues" && (!data.issues || data.issues.length === 0)) {
        console.log("Skipping save - no issues data");
        return;
      }
      if (type === "tokens" && (!data.tokens || Object.keys(data.tokens).length === 0)) {
        console.log("Skipping save - no tokens data");
        return;
      }

      const entry = {
        id: Date.now().toString(),
        mode,
        type,
        timestamp: new Date().toISOString(),
        context: context || null,
        data: {
          issues: data.issues || null,
          tokens: data.tokens || null,
          issuesCount: data.issues ? data.issues.length : 0,
          tokensCount: data.tokens
            ? Object.keys(data.tokens).reduce((sum, k) => sum + (data.tokens[k]?.length || 0), 0)
            : 0
        }
      };

      // Optimistically update local memory
      scanHistoryMemory.unshift(entry);
      scanHistoryMemory = scanHistoryMemory.slice(0, maxHistory);

      const historyPanel = document.getElementById("history-panel");
      if (historyPanel && historyPanel.style.display !== "none") {
        renderScanHistory();
      }

      safePost({ type: "save-history-entry", entry });
    } catch (e) {
      console.error("Error saving scan history:", e);
    }
  }

  function requestScanHistory() {
    safePost({ type: "get-history" });
  }

  function loadLastScanMode() {
    try {
      const history = getScanHistory();
      if (history.length > 0) {
        const lastScan = history[0];
        const radio = document.querySelector(`input[name="scope"][value="${lastScan.mode}"]`);
        if (radio) {
          radio.checked = true;
          console.log("Loaded last scan mode:", lastScan.mode);
        }
      }
    } catch (e) {
      console.error("Error loading last scan mode:", e);
    }
  }

  function loadLastScanModeOnce() {
    if (hasLoadedHistoryOnce) return;
    loadLastScanMode();
    hasLoadedHistoryOnce = true;
  }

  function formatHistoryTime(timestamp) {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} minutes ago`;
      if (diffHours < 24) return `${diffHours} hours ago`;
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return timestamp;
    }
  }

  function renderScanHistory() {
    const historyList = document.getElementById("history-list");
    if (!historyList) {
      console.error("history-list element not found");
      return;
    }

    const history = getScanHistory();
    console.log("Rendering scan history:", history.length, "entries");

    if (history.length === 0) {
      historyList.innerHTML = `
              <div class="history-empty">
                <div class="icon">📋</div>
                <p>No scan history</p>
                <p style="font-size: 11px; margin-top: 8px;">Scans will be saved automatically</p>
              </div>
            `;
      return;
    }

    historyList.innerHTML = history
      .map((entry) => {
        const timeStr = formatHistoryTime(entry.timestamp);
        const modeLabel = entry.mode === "page" ? "Page" : "Selection";
        const typeLabel = entry.type === "issues" ? "Issues" : "Tokens";
        const typeClass = entry.type === "issues" ? "issues" : "tokens";
        const contextLabel =
          entry.context && entry.context.label ? entry.context.label : `${modeLabel} scan`;

        let statsHtml = "";
        if (entry.type === "issues") {
          const errorCount = entry.data.issues?.filter((i) => i.severity === "error").length || 0;
          const warnCount = entry.data.issues?.filter((i) => i.severity === "warn").length || 0;
          statsHtml = `
                <span>❌ ${errorCount} errors</span>
                <span>⚠️ ${warnCount} warnings</span>
                <span>📊 ${entry.data.issuesCount} total</span>
              `;
        } else {
          statsHtml = `
                <span>🎨 ${entry.data.tokensCount} tokens</span>
              `;
        }

        return `
              <div class="history-item" data-id="${entry.id}">
                <div class="history-item-header">
                  <span class="history-item-type ${typeClass}">${typeLabel}</span>
                  <span class="history-item-time">${timeStr}</span>
                </div>
                <div class="history-item-info">${escapeHtml(contextLabel)}</div>
                <div class="history-item-stats">${statsHtml}</div>
              </div>
            `;
      })
      .join("");

    // Add click handlers
    historyList.querySelectorAll(".history-item").forEach((item) => {
      item.onclick = () => {
        const entryId = item.getAttribute("data-id");
        restoreReportFromHistory(entryId);
      };
    });
  }

  function restoreReportFromHistory(entryId) {
    try {
      const history = getScanHistory();
      const entry = history.find((e) => e.id === entryId);

      if (!entry) {
        alert("Scan history entry not found!");
        return;
      }

      // Set scan mode
      const radio = document.querySelector(`input[name="scope"][value="${entry.mode}"]`);
      if (radio) {
        radio.checked = true;
      }

      const currentReportData = typeof getCurrentReportData === "function" ? getCurrentReportData() : null;
      if (!currentReportData) {
        console.warn("restoreReportFromHistory: currentReportData is not available");
        return;
      }

      currentReportData.scanMode = entry.mode;
      currentReportData.context = entry.context || null;

      // Restore report data
      if (entry.type === "issues" && entry.data.issues) {
        currentReportData.issues = entry.data.issues;
        currentReportData.tokens = null;
        if (typeof setIsViewingTokens === "function") setIsViewingTokens(false);
        if (typeof renderResults === "function") {
          renderResults(entry.data.issues, true, { restoreTimestamp: entry.timestamp });
        }
      } else if (entry.type === "tokens" && entry.data.tokens) {
        currentReportData.issues = null;
        currentReportData.tokens = entry.data.tokens;
        if (typeof setIsViewingTokens === "function") setIsViewingTokens(true);
        if (typeof renderTokens === "function") {
          renderTokens(entry.data.tokens, true, { restoreTimestamp: entry.timestamp });
        }
      }

      // Close history panel
      const historyPanel = document.getElementById("history-panel");
      if (historyPanel) {
        historyPanel.style.display = "none";
      }

      console.log("Report restored from history:", entryId);
    } catch (e) {
      console.error("Error restoring report from history:", e);
      alert("Error restoring report: " + e.message);
    }
  }

  return {
    // state ops
    setHistory,
    clearLocalHistory,
    getScanHistory,
    // actions
    saveScanHistory,
    requestScanHistory,
    loadLastScanMode,
    loadLastScanModeOnce,
    renderScanHistory,
    restoreReportFromHistory
  };
}


