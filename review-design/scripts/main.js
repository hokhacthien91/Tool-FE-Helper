import { setupAutoSelectNodeFromIssueClick } from "./features/autoSelectNode.js";
import { showFixMessage } from "./features/fixMessage.js";
import { showErrorModal } from "./features/errorModal.js";
import { getSuggestedColor, getSuggestedSpacing } from "./features/suggestions.js";
import { showTypographyFixModal } from "./features/modals/typography.js";
import { showSpacingFixConfirmModal, showSpacingPickerModal } from "./features/modals/spacing.js";
import { createColorPickerItem, showColorFixConfirmModal, showColorPickerModal } from "./features/modals/colors.js";
import { exportReport } from "./features/reports/exportReport.js";
import { createScanHistoryManager } from "./features/history/scanHistory.js";
import { getContrastTextColor } from "./utils/color.js";
import { calculateContrastRatio, getColorBrightness, getColorDistance } from "./utils/colorMath.js";
import { escapeHtml } from "./utils/html.js";

console.log('Header.js222');
console.log("ui.js loaded");

(function() {
  console.log("Initializing ui.js...");
  const btnScan = document.getElementById("btn-scan");
        const btnCancelScan = document.getElementById("btn-cancel-scan");
        const scanProgress = document.getElementById("scan-progress");
        const scanProgressBar = document.getElementById("scan-progress-bar");
        const scanProgressText = document.getElementById("scan-progress-text");
        const btnExtractTokens = document.getElementById("btn-extract-tokens");
        const btnFillSpacingScale = document.getElementById("btn-fill-spacing-scale");
        const btnFillColorScale = document.getElementById("btn-fill-color-scale");
        const btnExtractColorStyles = document.getElementById("btn-extract-color-styles");
        const btnFillFontSizeScale = document.getElementById("btn-fill-font-size-scale");
        const btnFillLineHeightScale = document.getElementById("btn-fill-line-height-scale");
        const btnFillFontSizeFromTypo = document.getElementById("btn-fill-font-size-from-typo");
        const btnFillLineHeightFromTypo = document.getElementById("btn-fill-line-height-from-typo");
        const btnExport = document.getElementById("btn-export");
        const btnHistory = document.getElementById("btn-history");
        const btnCloseHistory = document.getElementById("btn-close-history");
        const btnResetAll = document.getElementById("btn-reset-all");
  const resultsIssues = document.getElementById("results-issues");
  const resultsTokens = document.getElementById("results-tokens");
  const btnClose = document.getElementById("btn-close");
  
  // Report tabs
  const reportTabs = document.querySelectorAll(".report-tab");
  const reportContents = document.querySelectorAll(".report-content");
  let activeTab = "issues";

        if (!btnScan || !btnExtractTokens || !resultsIssues || !resultsTokens || !btnClose || !btnExport || !btnHistory || !btnFillSpacingScale || !btnFillColorScale || !btnFillFontSizeScale || !btnFillLineHeightScale) {
          console.error("Required elements not found", { btnScan, btnExtractTokens, btnFillSpacingScale, btnFillColorScale, btnFillFontSizeScale, btnFillLineHeightScale, resultsIssues, resultsTokens, btnClose, btnExport, btnHistory });
    return;
  }

        // Auto jump to the node when user clicks an action button inside an issue item.
        // (implemented in ./features/autoSelectNode.js)
        setupAutoSelectNodeFromIssueClick();

        // Store current report data
        // Color name mapping (hex -> name) for tooltips
        let colorNameMap = {};
        let ignoredIssues = {}; // Map of issueId -> true for ignored issues

        let currentReportData = {
          issues: null,
          tokens: null,
          scanMode: null,
          timestamp: null,
          tokensTimestamp: null,
          context: null
        };

        // Typography Styles Storage
        let typographyStyles = [
          // Default styles
          { id: 1, name: "H1", fontFamily: "Inter", fontSize: 48, fontWeight: "Bold", lineHeight: "120%", letterSpacing: "0", wordSpacing: "0" },
          { id: 2, name: "H2", fontFamily: "Inter", fontSize: 36, fontWeight: "Bold", lineHeight: "130%", letterSpacing: "0", wordSpacing: "0" },
          { id: 3, name: "H3", fontFamily: "Inter", fontSize: 28, fontWeight: "SemiBold", lineHeight: "130%", letterSpacing: "0", wordSpacing: "0" },
          { id: 4, name: "H4", fontFamily: "Inter", fontSize: 24, fontWeight: "SemiBold", lineHeight: "140%", letterSpacing: "0", wordSpacing: "0" },
          { id: 5, name: "H5", fontFamily: "Inter", fontSize: 20, fontWeight: "Medium", lineHeight: "140%", letterSpacing: "0", wordSpacing: "0" },
          { id: 6, name: "H6", fontFamily: "Inter", fontSize: 18, fontWeight: "Medium", lineHeight: "140%", letterSpacing: "0", wordSpacing: "0" },
          { id: 7, name: "Body", fontFamily: "Inter", fontSize: 16, fontWeight: "Regular", lineHeight: "150%", letterSpacing: "0", wordSpacing: "0" }
        ];
        let nextTypoStyleId = 8;

        function saveLastReport(report) {
          if (!report) return;
          parent.postMessage({ pluginMessage: { type: "save-last-report", report } }, "*");
        }

        function restoreLastReport() {
          parent.postMessage({ pluginMessage: { type: "get-last-report" } }, "*");
        }

        function saveInputValues() {
          const values = {
            spacingScale: document.getElementById("spacing-scale")?.value || "",
            spacingThreshold: document.getElementById("spacing-threshold")?.value || "100",
            colorScale: document.getElementById("color-scale")?.value || "",
            colorNameMap: colorNameMap, // Save color name mapping
            ignoredIssues: ignoredIssues, // Save ignored issues
            fontSizeScale: document.getElementById("font-size-scale")?.value || "",
            fontSizeThreshold: document.getElementById("font-size-threshold")?.value || "100",
            lineHeightScale: document.getElementById("line-height-scale")?.value || "",
            lineHeightThreshold: document.getElementById("line-height-threshold")?.value || "300",
            lineHeightBaselineThreshold: document.getElementById("line-height-baseline-threshold")?.value || "120",
            typographyStyles: typographyStyles,
            typographyRules: {
              checkStyle: document.getElementById("rule-typo-style")?.checked || true,
              checkFontFamily: document.getElementById("rule-font-family")?.checked || true,
              checkFontSize: document.getElementById("rule-font-size")?.checked || true,
              checkFontWeight: document.getElementById("rule-font-weight")?.checked || true,
              checkLineHeight: document.getElementById("rule-line-height")?.checked || true,
              checkLetterSpacing: document.getElementById("rule-letter-spacing")?.checked || false,
              checkWordSpacing: document.getElementById("rule-word-spacing")?.checked || false
            }
          };
          parent.postMessage({ pluginMessage: { type: "save-input-values", values } }, "*");
        }

        function restoreInputValues() {
          parent.postMessage({ pluginMessage: { type: "get-input-values" } }, "*");
        }

        function applyInputValues(values) {
          if (!values) return;
          
          const spacingScaleInput = document.getElementById("spacing-scale");
          const spacingThresholdInput = document.getElementById("spacing-threshold");
          const colorScaleInput = document.getElementById("color-scale");
          const fontSizeScaleInput = document.getElementById("font-size-scale");
          const fontSizeThresholdInput = document.getElementById("font-size-threshold");
          const lineHeightScaleInput = document.getElementById("line-height-scale");
          const lineHeightThresholdInput = document.getElementById("line-height-threshold");
          const lineHeightBaselineThresholdInput = document.getElementById("line-height-baseline-threshold");

          if (spacingScaleInput && values.spacingScale !== undefined) spacingScaleInput.value = values.spacingScale;
          if (spacingThresholdInput && values.spacingThreshold !== undefined) spacingThresholdInput.value = values.spacingThreshold;
          
          // Restore color name map before rendering color preview
          if (values.colorNameMap && typeof values.colorNameMap === "object") {
            colorNameMap = values.colorNameMap;
          } else {
            colorNameMap = {};
          }
          // Restore ignored issues
          if (values.ignoredIssues && typeof values.ignoredIssues === "object") {
            ignoredIssues = values.ignoredIssues;
          } else {
            ignoredIssues = {};
          }
          
          if (colorScaleInput && values.colorScale !== undefined) {
            colorScaleInput.value = values.colorScale;
            // Render color preview after loading saved colors and name map
            if (typeof renderColorPreview === "function") renderColorPreview();
          }
          if (fontSizeScaleInput && values.fontSizeScale !== undefined) fontSizeScaleInput.value = values.fontSizeScale;
          if (fontSizeThresholdInput && values.fontSizeThreshold !== undefined) fontSizeThresholdInput.value = values.fontSizeThreshold;
          if (lineHeightScaleInput && values.lineHeightScale !== undefined) lineHeightScaleInput.value = values.lineHeightScale;
          if (lineHeightThresholdInput && values.lineHeightThreshold !== undefined) lineHeightThresholdInput.value = values.lineHeightThreshold;
          if (lineHeightBaselineThresholdInput && values.lineHeightBaselineThreshold !== undefined) lineHeightBaselineThresholdInput.value = values.lineHeightBaselineThreshold;
          
          // Restore Typography Styles
          if (values.typographyStyles && Array.isArray(values.typographyStyles)) {
            typographyStyles = values.typographyStyles;
            nextTypoStyleId = Math.max(...typographyStyles.map(s => s.id || 0), 0) + 1;
            renderTypographyTable();
          }
          
          // Restore Typography Rules
          if (values.typographyRules) {
            const rules = values.typographyRules;
            if (document.getElementById("rule-typo-style")) document.getElementById("rule-typo-style").checked = rules.checkStyle !== false;
            if (document.getElementById("rule-font-family")) document.getElementById("rule-font-family").checked = rules.checkFontFamily !== false;
            if (document.getElementById("rule-font-size")) document.getElementById("rule-font-size").checked = rules.checkFontSize !== false;
            if (document.getElementById("rule-font-weight")) document.getElementById("rule-font-weight").checked = rules.checkFontWeight !== false;
            if (document.getElementById("rule-line-height")) document.getElementById("rule-line-height").checked = rules.checkLineHeight !== false;
            if (document.getElementById("rule-letter-spacing")) document.getElementById("rule-letter-spacing").checked = rules.checkLetterSpacing === true;
            if (document.getElementById("rule-word-spacing")) document.getElementById("rule-word-spacing").checked = rules.checkWordSpacing === true;
            
            // Re-render table after restoring checkbox states
            renderTypographyTable();
          }
        }

        function applySavedReport(saved) {
          if (!saved) {
            console.log("No last report to apply");
            return;
          }

          if (saved.scanMode) {
            const scopeRadio = document.querySelector(`input[name="scope"][value="${saved.scanMode}"]`);
            if (scopeRadio) {
              scopeRadio.checked = true;
            }
          }

          currentReportData.scanMode = saved.scanMode || currentReportData.scanMode;
          currentReportData.context = saved.context || currentReportData.context;

          // Restore issues if available
          if (saved.issues && Array.isArray(saved.issues)) {
            console.log("Applying saved issues report");
            renderResults(saved.issues, true, { skipSave: true, restoreTimestamp: saved.issuesTimestamp });
          }
          
          // Restore tokens if available
          if (saved.tokens) {
            console.log("Applying saved tokens report");
            renderTokens(saved.tokens, true, { skipSave: true, restoreTimestamp: saved.tokensTimestamp });
          }
          
          // Switch to the last active tab
          if (saved.lastActiveTab) {
            switchToTab(saved.lastActiveTab);
          } else if (saved.issues) {
            switchToTab("issues");
          } else if (saved.tokens) {
            switchToTab("tokens");
          }
        }

        // Filter state
        let currentFilter = "all";
        let currentSearch = "";
        let currentColorTypeFilter = "all";
        let isViewingTokens = false;

  console.log("All elements found, setting up event listeners");

  // Tab switching
  reportTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabName = tab.dataset.tab;
      
      // Update tabs
      reportTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      // Update content
      reportContents.forEach(c => c.classList.remove("active"));
      document.getElementById(`results-${tabName}`).classList.add("active");
      
      activeTab = tabName;
      
      // Save last active tab when user manually switches
      if (currentReportData.issues || currentReportData.tokens) {
        saveLastReport({
          issues: currentReportData.issues,
          issuesTimestamp: currentReportData.timestamp,
          tokens: currentReportData.tokens,
          tokensTimestamp: currentReportData.tokensTimestamp,
          lastActiveTab: tabName,
          scanMode: currentReportData.scanMode || null,
          context: currentReportData.context || null
        });
      }
    });
  });

  function clearResults(tabName = null) {
    const target = tabName ? document.getElementById(`results-${tabName}`) : resultsIssues;
    if (target) {
      target.innerHTML = "";
    }
  }
  
  function switchToTab(tabName) {
    reportTabs.forEach(tab => {
      if (tab.dataset.tab === tabName) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });
    
    reportContents.forEach(content => {
      if (content.id === `results-${tabName}`) {
        content.classList.add("active");
      } else {
        content.classList.remove("active");
      }
    });
    
    activeTab = tabName;
  }

        function getSeverityIcon(severity) {
          if (severity === "error") return "❌";
          if (severity === "warn") return "⚠️";
          return "ℹ️";
        }

        function getTypeIcon(type) {
          const icons = {
            naming: "🏷️",
            autolayout: "📐",
            spacing: "📏",
            color: "🎨",
            typography: "✍️",
            "typography-style": "🎨",
            "typography-check": "📝",
            "typography-pass": "✅",
            "typography-info": "✅",
            "line-height": "📝",
            position: "📍",
            duplicate: "🔄",
            group: "📦",
            component: "🧩",
            "empty-frame": "📭",
            "nested-group": "📚",
            contrast: "🌈",
            "text-size-mobile": "📱"
          };
          return icons[type] || "🔍";
        }

        function getTypeDisplayName(type) {
          const displayNames = {
            naming: "Naming Layer",
            autolayout: "Auto Layout",
            spacing: "Spacing",
            color: "Color",
            typography: "Font Size",
            "typography-style": "Text Style (variable)",
            "typography-check": "Typography Style Match",
            "typography-pass": "Typography ✓ Matched",
            "line-height": "Line Height",
            position: "Position Layer",
            duplicate: "Duplicate Layer",
            group: "Group Layer",
            component: "Component Reusable",
            "empty-frame": "Empty Frame Layer",
            "nested-group": "Nested Group Layer",
            contrast: "Contrast (ADA AA)",
            "text-size-mobile": "Text Size (ADA)"
          };
          return displayNames[type] || type.replace(/-/g, " ");
        }

        function addIssueEl(issue) {
    const el = document.createElement("div");
          el.className = `issue ${issue.severity}`;
    
    // Build detailed info for typography issues
    let detailsHtml = "";
    if (issue.type === "typography-check" && issue.nodeProps) {
      detailsHtml = '<div class="typography-details" style="margin-top: 8px; padding: 8px; background: rgba(0,0,0,0.05); border-radius: 4px; font-size: 11px;">';
      
      // Current properties
      detailsHtml += '<div class="current-properties"><div style="margin-bottom: 6px;"><strong>Current Properties:</strong></div>';
      detailsHtml += '<div style="padding-left: 0; line-height: 1.6;">';
      if (issue.nodeProps.fontFamily) detailsHtml += `• Font Family: <code>${escapeHtml(issue.nodeProps.fontFamily)}</code><br>`;
      if (issue.nodeProps.fontSize !== null && issue.nodeProps.fontSize !== undefined) detailsHtml += `• Font Size: <code>${issue.nodeProps.fontSize}px</code><br>`;
      if (issue.nodeProps.fontWeight) detailsHtml += `• Font Weight: <code>${escapeHtml(issue.nodeProps.fontWeight)}</code><br>`;
      if (issue.nodeProps.lineHeight) detailsHtml += `• Line Height: <code>${escapeHtml(issue.nodeProps.lineHeight)}</code><br>`;
      if (issue.nodeProps.letterSpacing !== null && issue.nodeProps.letterSpacing !== undefined) detailsHtml += `• Letter Spacing: <code>${escapeHtml(issue.nodeProps.letterSpacing)}</code><br>`;
      detailsHtml += '</div></div>';
      
      // Best match suggestion (for errors) or show matched style (for pass with severity info)
      if (issue.bestMatch && issue.severity === "error") {
        detailsHtml += `<div class="closest-match"><div style="margin-bottom: 6px;"><strong>Closest Match: "${escapeHtml(issue.bestMatch.name)}" (${issue.bestMatch.percentage}%)</strong></div>`;
        detailsHtml += '<div style="padding-left: 0; line-height: 1.6;">';
        issue.bestMatch.differences.forEach(diff => {
          const icon = diff.matches ? '✓' : '✗';
          const color = diff.matches ? 'green' : 'red';
          detailsHtml += `<span style="color: ${color}">${icon} ${diff.property}: <code>${escapeHtml(diff.current)}</code> → <code>${escapeHtml(diff.expected)}</code></span><br>`;
        });
        detailsHtml += '</div></div>';
      } else if (issue.severity === "info" && issue.styleName) {
        // Show matched style for info/pass cases
        detailsHtml += `<div style="margin-top: 8px; color: green;"><strong>✓ All properties match style "${escapeHtml(issue.styleName)}"</strong></div>`;
      }
      
      detailsHtml += '</div>';
    }
    
    el.setAttribute("data-issue-id", issue.id);
    el.innerHTML = `
      <div class="issue-header">
              <div>
                <span class="issue-type">${getTypeIcon(issue.type)} ${getTypeDisplayName(issue.type)}</span>
      <div class="issue-body">${escapeHtml(issue.message)}</div>
                ${issue.nodeName ? `<div class="issue-node">Node: ${escapeHtml(issue.nodeName)}</div>` : ""}
                ${detailsHtml}
              </div>
              <div class="issue-actions">
                <button class="btn-select" data-id="${issue.id}">Select</button>
                ${(issue.bestMatch && issue.type === "typography-check") ? `
                  <button class="btn-suggest-fix" data-id="${issue.id}" data-style-name="${escapeHtml(issue.bestMatch.name)}">Suggest Fix now</button>
                  <button class="btn-style-dropdown" data-id="${issue.id}" data-issue-id="${issue.id}">Select Style</button>
                ` : ""}
              </div>
      </div>
    `;
    const btn = el.querySelector("button.btn-select");
    if (btn) {
      btn.onclick = () => {
        parent.postMessage({ pluginMessage: { type: "select-node", id: issue.id } }, "*");
      };
    }
    
    // Handle Suggest Fix button for typography-check
    const btnSuggestFix = el.querySelector("button.btn-suggest-fix");
    if (btnSuggestFix && issue.type === "typography-check" && issue.bestMatch) {
      (function(issueData) {
        btnSuggestFix.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Apply bestMatch style directly
          handleApplyTypographyStyle(issueData, issueData.bestMatch.name);
        };
      })(issue);
    }
    
    // Handle Style Dropdown for typography-check - show popup modal instead
    const btnStyleDropdown = el.querySelector("button.btn-style-dropdown");
    if (btnStyleDropdown && issue.type === "typography-check") {
      (function(issueData) {
        btnStyleDropdown.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Request text styles from Figma and show popup
          parent.postMessage({
            pluginMessage: {
              type: "get-figma-text-styles",
              issueId: issueData.id
            }
          }, "*");
          // Store issue for later use
          window.pendingTypographyCheckIssue = issueData;
        };
      })(issue);
    }
    
    return el;
  }

  // escapeHtml/showFixMessage/showErrorModal are imported

  // showTypographyFixModal is imported from ./features/modals/typography.js

  // getSuggestedColor/getSuggestedSpacing are imported from ./features/suggestions.js

  // createColorPickerItem is imported from ./features/modals/colors.js

  // Handle suggest fix for color
  function handleSuggestFixColor(issue) {
    const suggestedColor = getSuggestedColor(issue);
    if (!suggestedColor) {
      alert("No suitable color match found");
      return;
    }
    
    // Extract current color from message (for better confirm UI)
    const message = issue.message || "";
    const colorMatch = message.match(/Color (#[0-9A-Fa-f]{6})/);
    const currentColor = colorMatch ? colorMatch[1].toUpperCase() : null;

    // Show confirm modal directly
    showColorFixConfirmModal(issue, currentColor, suggestedColor, colorNameMap);
  }

  // Handle suggest fix for spacing
  function handleSuggestFixSpacing(issue) {
    const suggestedValue = getSuggestedSpacing(issue);
    if (!suggestedValue) {
      alert("No suitable spacing match found");
      return;
    }
    
    // Extract property name and current value from message
    const message = issue.message || "";
    // Match: "Padding paddingLeft (64px)" or "Padding paddingLeft (64px) does not follow scale..." etc.
    // The regex will match even if there's text after (64px)
    const match = message.match(/Padding\s+(\w+)\s+\((\d+)px\)/);
    if (!match) {
      console.error("Cannot parse spacing issue message:", message);
      alert("Cannot determine spacing property from issue message. Message: " + message);
      return;
    }
    
    const propertyName = match[1];
    const currentValue = parseInt(match[2]);
    
    // Show confirm modal directly
    showSpacingFixConfirmModal(issue, propertyName, currentValue, suggestedValue);
  }

  // Get suggested fix for autolayout
  function getSuggestedAutolayout(issue) {
    if (!issue || issue.type !== "autolayout") return null;
    // Auto layout can always be enabled
    return { action: "enable-autolayout" };
  }

  function getSuggestedPositionFix(issue) {
    if (!issue || issue.type !== "position") return null;
    // Position can always be fixed (set to 0,0)
    return { action: "fix-position" };
  }

  // Handle suggest fix for autolayout
  function handleSuggestFixAutolayout(issue) {
    const suggested = getSuggestedAutolayout(issue);
    if (!suggested) {
      alert("Cannot suggest fix for this autolayout issue");
      return;
    }
    
    // Show confirm modal
    showAutolayoutFixConfirmModal(issue);
  }

  // Show autolayout fix confirm modal
  function showAutolayoutFixConfirmModal(issue) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "autolayout-fix-confirm-modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "450px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Action:</div>
          <div style="padding: 12px; background: #e3f2fd; border-left: 3px solid #0071e3; border-radius: 6px;">
            <div style="font-size: 14px; color: #333; margin-bottom: 8px;">
              <strong>Enable Auto Layout</strong>
            </div>
            <div style="font-size: 12px; color: #666;">
              Auto Layout will be enabled on this frame. The layout direction (horizontal/vertical) will be automatically determined based on the children arrangement.
            </div>
          </div>
        </div>
        <div style="padding: 12px; background: #e8f5e9; border-radius: 6px; border-left: 3px solid #28a745;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📝 Note:</div>
          <div style="font-size: 12px; color: #333;">
            • Layout direction will be auto-detected (horizontal or vertical)<br>
            • Spacing and padding will be preserved if possible<br>
            • Frame structure will be maintained
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="autolayout-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="autolayout-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#autolayout-fix-confirm-cancel-btn");
    const applyBtn = dialog.querySelector("#autolayout-fix-confirm-apply-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    applyBtn.onclick = () => {
      closeModal();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Enabling auto layout...", true);
      
      // Send fix request
      parent.postMessage({
        pluginMessage: {
          type: "fix-autolayout-issue",
          issue: issue
        }
      }, "*");
    };
  }
  
  // Wrapper for showAutolayoutFixConfirmModal with ignore support
  function showAutolayoutFixConfirmModalWithIgnore(issue, callbacks = {}) {
    const { onApply, onIgnore, onCancel, progress } = callbacks;
    const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';
    
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "autolayout-fix-confirm-modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "450px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Confirm Auto Layout Enable</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Action:</div>
          <div style="padding: 12px; background: #e3f2fd; border-left: 3px solid #0071e3; border-radius: 6px;">
            <div style="font-size: 14px; color: #333; margin-bottom: 8px;">
              <strong>Enable Auto Layout</strong>
            </div>
            <div style="font-size: 12px; color: #666;">
              Auto Layout will be enabled on this frame. The layout direction (horizontal/vertical) will be automatically determined based on the children arrangement.
            </div>
          </div>
        </div>
        <div style="padding: 12px; background: #e8f5e9; border-radius: 6px; border-left: 3px solid #28a745;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📝 Note:</div>
          <div style="font-size: 12px; color: #333;">
            • Layout direction will be auto-detected (horizontal or vertical)<br>
            • Spacing and padding will be preserved if possible<br>
            • Frame structure will be maintained
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="autolayout-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="autolayout-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="autolayout-fix-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#autolayout-fix-cancel-btn");
    const applyBtn = dialog.querySelector("#autolayout-fix-apply-btn");
    const ignoreBtn = dialog.querySelector("#autolayout-fix-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    closeBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (onCancel) onCancel();
      }
    };
    
    ignoreBtn.onclick = () => {
      closeModal();
      if (onIgnore) onIgnore();
    };
    
    applyBtn.onclick = () => {
      closeModal();
      showFixMessage(issue.id, "⏳ Enabling auto layout...", true);
      parent.postMessage({
        pluginMessage: {
          type: "fix-autolayout-issue",
          issue: issue
        }
      }, "*");
      if (onApply) onApply();
    };
  }

  function getSuggestedGroupFix(issue) {
    // Always return fix action for group issues
    return { action: "convert-group" };
  }

  function handleSuggestFixGroup(issue) {
    const suggested = getSuggestedGroupFix(issue);
    if (!suggested) {
      alert("Cannot suggest fix for this group issue");
      return;
    }
    showGroupFixConfirmModal(issue);
  }

  function showGroupFixConfirmModal(issue) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "group-fix-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "450px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          This will convert the Group to a Frame and enable Auto-layout automatically.
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Group</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame with Auto-layout</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="group-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="group-fix-apply-btn">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#group-fix-cancel-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const applyBtn = dialog.querySelector("#group-fix-apply-btn");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    applyBtn.onclick = () => {
      applyBtn.disabled = true;
      applyBtn.textContent = "Applying...";
      
      parent.postMessage({
        pluginMessage: {
          type: "fix-group-issue",
          issue: issue
        }
      }, "*");
      
      closeModal();
    };
  }
  
  // Wrapper for showGroupFixConfirmModal with ignore support
  function showGroupFixConfirmModalWithIgnore(issue, callbacks = {}) {
    const { onApply, onIgnore, onCancel, progress } = callbacks;
    const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';
    
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "group-fix-modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "450px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Convert Group to Frame</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          This will convert the Group to a Frame and enable Auto-layout automatically.
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Group</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame with Auto-layout</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="group-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="group-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="group-fix-apply-btn">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#group-fix-cancel-btn");
    const applyBtn = dialog.querySelector("#group-fix-apply-btn");
    const ignoreBtn = dialog.querySelector("#group-fix-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    closeBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (onCancel) onCancel();
      }
    };
    
    ignoreBtn.onclick = () => {
      closeModal();
      if (onIgnore) onIgnore();
    };
    
    applyBtn.onclick = () => {
      applyBtn.disabled = true;
      applyBtn.textContent = "Applying...";
      parent.postMessage({
        pluginMessage: {
          type: "fix-group-issue",
          issue: issue
        }
      }, "*");
      closeModal();
      if (onApply) onApply();
    };
  }

  function getSuggestedPositionFix(issue) {
    if (!issue || issue.type !== "position") return null;
    // Position can always be fixed (set to 0,0)
    return { action: "fix-position" };
  }

  function getSuggestedComponent(issue) {
    if (!issue || (issue.type !== "duplicate" && issue.type !== "component")) return null;
    // Will check for similar components when button is clicked
    return { action: "suggest-component" };
  }

  function getSuggestedEmptyFrameFix(issue) {
    if (!issue || issue.type !== "empty-frame") return null;
    // Empty/redundant frame can always be fixed (remove frame and keep child)
    return { action: "fix-empty-frame" };
  }

  // Handle suggest fix for position
  function handleSuggestFixPosition(issue) {
    const suggested = getSuggestedPositionFix(issue);
    if (!suggested) {
      alert("Cannot suggest fix for this position issue");
      return;
    }
    
    // Show confirm modal
    showPositionFixConfirmModal(issue);
  }

  // Handle suggest fix for empty frame
  function handleSuggestFixEmptyFrame(issue) {
    const suggested = getSuggestedEmptyFrameFix(issue);
    if (!suggested) {
      alert("Cannot suggest fix for this empty frame issue");
      return;
    }
    
    // Show confirm modal
    showEmptyFrameFixConfirmModal(issue);
  }

  // Show position fix confirm modal
  function showPositionFixConfirmModal(issue) {
    // Parse position from message
    const message = issue.message || "";
    const xMatch = message.match(/x:(-?\d+)/);
    const yMatch = message.match(/y:(-?\d+)/);
    const currentX = xMatch ? parseInt(xMatch[1], 10) : 0;
    const currentY = yMatch ? parseInt(yMatch[1], 10) : 0;
    
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "position-fix-confirm-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This layer has a negative position which may cause layout issues.
          </p>
          <div style="padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Position:</strong></div>
            <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
              • X: <code>${currentX}px</code><br>
              • Y: <code>${currentY}px</code>
            </div>
          </div>
          <div style="padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;"><strong>After Fix:</strong></div>
            <div style="font-size: 11px; color: #1976d2; padding-left: 8px; line-height: 1.6;">
              • X: <code>0px</code><br>
              • Y: <code>0px</code>
            </div>
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          This will set the position to (0, 0) to fix the negative offset.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="position-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="position-fix-confirm-apply-btn">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#position-fix-confirm-cancel-btn");
    const applyBtn = dialog.querySelector("#position-fix-confirm-apply-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    applyBtn.onclick = () => {
      closeModal();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Fixing position...", true);
      
      // Send fix request
      parent.postMessage({
        pluginMessage: {
          type: "fix-position-issue",
          issue: issue
        }
      }, "*");
    };
  }
  
  // Wrapper for showPositionFixConfirmModal with ignore support
  function showPositionFixConfirmModalWithIgnore(issue, callbacks = {}) {
    const { onApply, onIgnore, onCancel, progress } = callbacks;
    const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';
    
    // Parse position from message
    const message = issue.message || "";
    const xMatch = message.match(/x:(-?\d+)/);
    const yMatch = message.match(/y:(-?\d+)/);
    const currentX = xMatch ? parseInt(xMatch[1], 10) : 0;
    const currentY = yMatch ? parseInt(yMatch[1], 10) : 0;
    
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "position-fix-confirm-modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Fix Position Issue</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This layer has a negative position which may cause layout issues.
          </p>
          <div style="padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Position:</strong></div>
            <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
              • X: <code>${currentX}px</code><br>
              • Y: <code>${currentY}px</code>
            </div>
          </div>
          <div style="padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;"><strong>After Fix:</strong></div>
            <div style="font-size: 11px; color: #1976d2; padding-left: 8px; line-height: 1.6;">
              • X: <code>0px</code><br>
              • Y: <code>0px</code>
            </div>
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          This will set the position to (0, 0) to fix the negative offset.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="position-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="position-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="position-fix-apply-btn">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#position-fix-cancel-btn");
    const applyBtn = dialog.querySelector("#position-fix-apply-btn");
    const ignoreBtn = dialog.querySelector("#position-fix-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    closeBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (onCancel) onCancel();
      }
    };
    
    ignoreBtn.onclick = () => {
      closeModal();
      if (onIgnore) onIgnore();
    };
    
    applyBtn.onclick = () => {
      closeModal();
      showFixMessage(issue.id, "⏳ Fixing position...", true);
      parent.postMessage({
        pluginMessage: {
          type: "fix-position-issue",
          issue: issue
        }
      }, "*");
      if (onApply) onApply();
    };
  }

  // Handle remove layer for position
  function handleRemovePositionLayer(issue) {
    // Show confirm modal
    showRemoveLayerConfirmModal(issue);
  }

  // Show remove layer confirm modal
  function showRemoveLayerConfirmModal(issue) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "remove-layer-confirm-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Remove Layer</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            Are you sure you want to remove this layer?
          </p>
          <div style="padding: 12px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px;">
            <div style="font-size: 12px; color: #856404; margin-bottom: 4px;"><strong>⚠️ Warning:</strong></div>
            <div style="font-size: 11px; color: #856404; line-height: 1.6;">
              This action cannot be undone. The layer and all its children will be permanently deleted.
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="remove-layer-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-danger" id="remove-layer-confirm-apply-btn" style="background: #dc3545; border-color: #dc3545;color: white;">Remove</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#remove-layer-confirm-cancel-btn");
    const applyBtn = dialog.querySelector("#remove-layer-confirm-apply-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    applyBtn.onclick = () => {
      closeModal();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Removing layer...", true);
      
      // Send remove request
      parent.postMessage({
        pluginMessage: {
          type: "remove-position-layer",
          issue: issue
        }
      }, "*");
    };
  }

  // Show empty frame fix confirm modal
  function showEmptyFrameFixConfirmModal(issue) {
    // Parse message to determine if it's empty or redundant
    const message = issue.message || "";
    const isEmpty = message.includes("Empty frame");
    const isRedundant = message.includes("redundant");
    
    const title = isRedundant ? "Remove Redundant Frame" : "Remove Empty Frame";
    const description = isRedundant
      ? "This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed."
      : "This will remove the empty frame. If it has a child, the child will be kept.";
    
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "empty-frame-fix-modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "450px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">${title}</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${description}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${escapeHtml(issue.message)}</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame removed, child kept (if applicable)</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="empty-frame-fix-apply-btn">Apply</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.appendChild(dialog);
    
    const cancelBtn = dialog.querySelector("#empty-frame-fix-cancel-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const applyBtn = dialog.querySelector("#empty-frame-fix-apply-btn");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    applyBtn.onclick = () => {
      applyBtn.disabled = true;
      applyBtn.textContent = "Applying...";
      
      parent.postMessage({
        pluginMessage: {
          type: "fix-empty-frame-issue",
          issue: issue
        }
      }, "*");
      
      closeModal();
    };
  }
  
  // Wrapper for showEmptyFrameFixConfirmModal with ignore support
  function showEmptyFrameFixConfirmModalWithIgnore(issue, callbacks = {}) {
    const { onApply, onIgnore, onCancel, progress } = callbacks;
    const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';
    
    // Parse message to determine if it's empty or redundant
    const message = issue.message || "";
    const isEmpty = message.includes("Empty frame");
    const isRedundant = message.includes("redundant");
    
    const title = isRedundant ? "Remove Redundant Frame" : "Remove Empty Frame";
    const description = isRedundant
      ? "This will remove the redundant frame and keep its single child. The child will inherit the frame's name if it was unnamed."
      : "This will remove the empty frame. If it has a child, the child will be kept.";
    
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "empty-frame-fix-modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "450px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">${title}</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <p style="margin: 0 0 16px 0; color: #333; line-height: 1.5;">
          ${description}
        </p>
        <div style="background: #f5f5f5; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">${escapeHtml(issue.message)}</div>
        </div>
        <div style="background: #e8f5e9; padding: 12px; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">After fix:</div>
          <div style="font-size: 13px; color: #333; font-weight: 500;">Frame removed, child kept (if applicable)</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="empty-frame-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="empty-frame-fix-apply-btn">Apply</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    overlay.appendChild(dialog);
    
    const cancelBtn = dialog.querySelector("#empty-frame-fix-cancel-btn");
    const applyBtn = dialog.querySelector("#empty-frame-fix-apply-btn");
    const ignoreBtn = dialog.querySelector("#empty-frame-fix-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    closeBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (onCancel) onCancel();
      }
    };
    
    ignoreBtn.onclick = () => {
      closeModal();
      if (onIgnore) onIgnore();
    };
    
    applyBtn.onclick = () => {
      applyBtn.disabled = true;
      applyBtn.textContent = "Applying...";
      parent.postMessage({
        pluginMessage: {
          type: "fix-empty-frame-issue",
          issue: issue
        }
      }, "*");
      closeModal();
      if (onApply) onApply();
    };
  }

  // Handle suggest fix for component (duplicate/component issues)
  function handleSuggestFixComponent(issue) {
    console.log("handleSuggestFixComponent called", issue);
    if (!issue || !issue.id) {
      console.error("Invalid issue in handleSuggestFixComponent", issue);
      alert("Error: Invalid issue data");
      return;
    }
    // Store issue FIRST before sending message
    window.pendingComponentIssue = issue;
    console.log("Stored pendingComponentIssue:", window.pendingComponentIssue);
    
    // Show loading indicator
    const issueEl = document.querySelector(`.issue[data-issue-id="${issue.id}"]`);
    if (issueEl) {
      const btnSuggestFix = issueEl.querySelector("button.btn-suggest-fix");
      if (btnSuggestFix) {
        const originalText = btnSuggestFix.textContent;
        btnSuggestFix.disabled = true;
        btnSuggestFix.textContent = "Loading...";
        btnSuggestFix.style.opacity = "0.6";
        btnSuggestFix.style.cursor = "wait";
        
        // Store original text to restore later
        btnSuggestFix.dataset.originalText = originalText;
      }
    }
    
    // Request existing components and find similar ones
    console.log("Sending get-components-for-issue message", { issueId: issue.id, issue: issue });
    parent.postMessage({
      pluginMessage: {
        type: "get-components-for-issue",
        issue: issue
      }
    }, "*");
  }

  // Handle select component for duplicate/component issues
  function handleSelectComponent(issue) {
    console.log("handleSelectComponent called", issue);
    if (!issue || !issue.id) {
      console.error("Invalid issue in handleSelectComponent", issue);
      alert("Error: Invalid issue data");
      return;
    }
    // Store issue FIRST before sending message
    window.pendingSelectComponentIssue = issue;
    console.log("Stored pendingSelectComponentIssue:", window.pendingSelectComponentIssue);
    
    // Show loading indicator
    const issueEl = document.querySelector(`.issue[data-issue-id="${issue.id}"]`);
    if (issueEl) {
      const btnSelectComponent = issueEl.querySelector("button.btn-select-component");
      if (btnSelectComponent) {
        const originalText = btnSelectComponent.textContent;
        btnSelectComponent.disabled = true;
        btnSelectComponent.textContent = "Loading...";
        btnSelectComponent.style.opacity = "0.6";
        
        // Store original text to restore later
        btnSelectComponent.dataset.originalText = originalText;
      }
    }
    
    // Request existing components
    console.log("Sending get-all-components message", { issueId: issue.id, issue: issue });
    parent.postMessage({
      pluginMessage: {
        type: "get-all-components",
        issue: issue
      }
    }, "*");
  }

  // Handle create component for duplicate/component issues
  function handleCreateComponent(issue) {
    // Show create component modal
    showCreateComponentModal(issue);
  }

  // Handle rename node for naming issues
  function handleRenameNode(issue) {
    // Show rename modal
    showRenameModal(issue);
  }

  // Show rename modal
  function showRenameModal(issue) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "rename-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    // Extract current name (remove "Frame" or "Group" prefix if present)
    const currentNodeName = issue.nodeName || "";
    const suggestedName = currentNodeName.replace(/^(Frame|Group)\s*/i, "").trim() || "";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Rename Node</h2>
        <p class="modal-subtitle">Current: ${escapeHtml(currentNodeName)}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #333;">New Name:</label>
          <input type="text" id="rename-input" placeholder="Enter meaningful name" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" value="${escapeHtml(suggestedName)}" autocomplete="off">
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          Enter a meaningful name that describes the purpose of this layer (e.g., "Header", "Button", "Card").
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="rename-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="rename-apply-btn">Rename</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#rename-cancel-btn");
    const applyBtn = dialog.querySelector("#rename-apply-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const nameInput = dialog.querySelector("#rename-input");
    
    // Focus on input and select all
    setTimeout(() => {
      nameInput.focus();
      nameInput.select();
    }, 100);
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    // Handle Enter key
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyBtn.click();
      }
    });
    
    applyBtn.onclick = () => {
      const newName = nameInput.value.trim();
      if (!newName) {
        alert("Please enter a name");
        nameInput.focus();
        return;
      }
      
      // Check if name still contains "Frame" or "Group" (default naming)
      if (/^(Frame|Group)\s*$/i.test(newName)) {
        if (!confirm("The name still contains default naming (Frame/Group). Do you want to continue?")) {
          nameInput.focus();
          return;
        }
      }
      
      closeModal();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Renaming...", true);
      
      // Send rename request
      parent.postMessage({
        pluginMessage: {
          type: "rename-node",
          issue: issue,
          newName: newName
        }
      }, "*");
    };
  }

  // Show create component modal
  function showCreateComponentModal(issue) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "create-component-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Create New Component</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <label style="display: block; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #333;">Component Name:</label>
          <input type="text" id="create-component-name-input" placeholder="Enter component name" style="width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px;" value="${escapeHtml(issue.nodeName || "")}">
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 12px;">
          This will convert the frame to a component and replace all duplicate frames with instances of this component.
        </p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="create-component-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="create-component-apply-btn">Create</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#create-component-cancel-btn");
    const applyBtn = dialog.querySelector("#create-component-apply-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const nameInput = dialog.querySelector("#create-component-name-input");
    
    // Focus on input
    setTimeout(() => nameInput.focus(), 100);
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    applyBtn.onclick = () => {
      const componentName = nameInput.value.trim();
      if (!componentName) {
        alert("Please enter a component name");
        return;
      }
      
      closeModal();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Creating component...", true);
      
      // Send create component request
      parent.postMessage({
        pluginMessage: {
          type: "create-component-from-issue",
          issue: issue,
          componentName: componentName
        }
      }, "*");
    };
  }

  // Show component suggest modal (for Suggest Fix now)
  function showComponentSuggestModal(issue, similarComponents) {
    console.log("[showComponentSuggestModal] Called with", { issue, similarComponents });
    if (!similarComponents || similarComponents.length === 0) {
      console.warn("[showComponentSuggestModal] No similar components provided");
      alert("No similar components found.");
      return;
    }
    
    // Use the first (most similar) component
    const bestMatch = similarComponents[0];
    console.log("[showComponentSuggestModal] Using best match:", bestMatch);
    showComponentApplyConfirmModal(issue, bestMatch, "This is the most similar component found.");
  }

  // Show component select modal (for Select Component)
  function showComponentSelectModal(issue, components) {
    console.log("[showComponentSelectModal] Called with", { issue, components });
    if (!components || components.length === 0) {
      console.warn("[showComponentSelectModal] No components provided");
      alert("No components available.");
      return;
    }
    
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "component-select-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "500px";
    
    // Build component list HTML
    const componentListHtml = components.map(comp => {
      return `
        <div class="component-picker-item" data-component-id="${comp.id}" data-component-name="${escapeHtml(comp.name.toLowerCase())}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='#ddd'; this.style.boxShadow='none'">
          <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(comp.name)}</div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">
            ${comp.description || "Component"}
          </div>
        </div>
      `;
    }).join('');
    
    // Add search input if there are many components
    const showSearch = components.length > 5;
    const searchHtml = showSearch ? `
      <div style="margin-bottom: 16px;">
        <input type="text" id="component-search-input" placeholder="Search components by name..." style="
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 13px;
          box-sizing: border-box;
        " autocomplete="off">
        <div id="component-search-results-count" style="font-size: 11px; color: #666; margin-top: 4px; display: none;"></div>
      </div>
    ` : '';
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Select Component</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        ${searchHtml}
        <div id="component-list-container" style="max-height: 400px; overflow-y: auto;">
          ${componentListHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="component-select-cancel-btn">Cancel</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    console.log("[showComponentSelectModal] Modal added to DOM");
    console.log("[showComponentSelectModal] Overlay element:", overlay);
    console.log("[showComponentSelectModal] Dialog element:", dialog);
    
    // Ensure overlay is visible
    overlay.style.display = "flex";
    overlay.style.opacity = "1";
    overlay.style.zIndex = "10000";
    
    const cancelBtn = dialog.querySelector("#component-select-cancel-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const componentItems = dialog.querySelectorAll(".component-picker-item");
    const searchInput = dialog.querySelector("#component-search-input");
    const componentListContainer = dialog.querySelector("#component-list-container");
    const searchResultsCount = dialog.querySelector("#component-search-results-count");
    
    console.log("[showComponentSelectModal] Found", componentItems.length, "component items");
    console.log("[showComponentSelectModal] Cancel button:", cancelBtn, "Close button:", closeBtn);
    
    // Setup search functionality
    if (searchInput && showSearch) {
      searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        let visibleCount = 0;
        
        componentItems.forEach(item => {
          const componentName = item.getAttribute("data-component-name") || "";
          if (searchTerm === "" || componentName.includes(searchTerm)) {
            item.style.display = "block";
            visibleCount++;
          } else {
            item.style.display = "none";
          }
        });
        
        // Update results count
        if (searchResultsCount) {
          if (searchTerm !== "") {
            searchResultsCount.textContent = `Showing ${visibleCount} of ${components.length} components`;
            searchResultsCount.style.display = "block";
          } else {
            searchResultsCount.style.display = "none";
          }
        }
      });
      
      // Focus on search input
      setTimeout(() => searchInput.focus(), 100);
    }
    
    const closeModal = () => {
      console.log("[showComponentSelectModal] Closing modal");
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      overlay.style.opacity = "0";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
          console.log("[showComponentSelectModal] Modal removed from DOM");
        }
      }, 200);
    };
    
    if (cancelBtn) {
      cancelBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      };
    } else {
      console.error("[showComponentSelectModal] Cancel button not found!");
    }
    
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeModal();
      };
    } else {
      console.error("[showComponentSelectModal] Close button not found!");
    }
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    // Handle component selection
    componentItems.forEach((item, index) => {
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("[showComponentSelectModal] Component item clicked", index);
        const componentId = item.getAttribute("data-component-id");
        console.log("[showComponentSelectModal] Component ID:", componentId);
        const component = components.find(c => c.id === componentId);
        console.log("[showComponentSelectModal] Found component:", component);
        if (component) {
          closeModal();
          showComponentApplyConfirmModal(issue, component, null);
        } else {
          console.error("[showComponentSelectModal] Component not found for ID:", componentId);
        }
      };
    });
    
    // Trigger animation
    setTimeout(() => {
      overlay.style.animation = "fadeIn 0.2s ease-out";
      overlay.style.opacity = "1";
      console.log("[showComponentSelectModal] Animation triggered, overlay visible:", overlay.offsetParent !== null);
    }, 10);
    
    console.log("[showComponentSelectModal] Modal setup complete");
  }

  // Show component apply confirm modal
  function showComponentApplyConfirmModal(issue, component, note) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "component-apply-confirm-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Apply Component</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <p style="margin-bottom: 12px; color: #666; font-size: 13px;">
            This will replace the frame with an instance of the selected component.
          </p>
          <div style="padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-size: 12px; color: #1976d2; margin-bottom: 8px;"><strong>Selected Component:</strong></div>
            <div style="font-size: 14px; color: #333; font-weight: 600;">${escapeHtml(component.name)}</div>
            ${component.description ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${escapeHtml(component.description)}</div>` : ""}
          </div>
          ${note ? `<p style="color: #666; font-size: 12px; margin-top: 12px;">${escapeHtml(note)}</p>` : ""}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="component-apply-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-primary" id="component-apply-apply-btn">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#component-apply-cancel-btn");
    const applyBtn = dialog.querySelector("#component-apply-apply-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    applyBtn.onclick = () => {
      closeModal();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Applying component...", true);
      
      // Send apply component request
      parent.postMessage({
        pluginMessage: {
          type: "apply-component-to-issue",
          issue: issue,
          componentId: component.id
        }
      }, "*");
    };
  }

  // Get suggested text size (from text styles >= 14px, or from font-size input)
  function getSuggestedTextSize(issue) {
    if (!issue || !issue.fontSize) return null;
    
    const currentSize = issue.fontSize;
    const minSize = 14; // Minimum for ADA compliance
    
    // Request text styles from Figma first (async, will be handled in handler)
    // For now, check font-size input as fallback
    
    // Get font-size scale from input
    const fontSizeScaleInput = document.getElementById("font-size-scale");
    if (fontSizeScaleInput && fontSizeScaleInput.value.trim()) {
      const fontSizeValues = fontSizeScaleInput.value.split(",")
        .map(v => parseInt(v.trim(), 10))
        .filter(v => !isNaN(v) && v >= minSize)
        .sort((a, b) => a - b);
      
      if (fontSizeValues.length > 0) {
        // Find closest value >= minSize
        let closestValue = null;
        let minDiff = Infinity;
        
        fontSizeValues.forEach(value => {
          if (value >= minSize) {
            const diff = Math.abs(value - currentSize);
            if (diff < minDiff) {
              minDiff = diff;
              closestValue = value;
            }
          }
        });
        
        // Only suggest if reasonable (within 50% difference or 10px)
        const threshold = Math.max(currentSize * 0.5, 10);
        if (closestValue && minDiff <= threshold) {
          return closestValue;
        }
      }
    }
    
    // If no match from input, return minSize as fallback if current is too small
    if (currentSize < minSize) {
      return minSize;
    }
    
    return null;
  }

  // Get suggested contrast color (closest color that passes contrast)
  function getSuggestedContrastColor(issue) {
    if (!issue || !issue.textColor || !issue.backgroundColor) return null;
    
    // Parse current colors
    const textColorHex = issue.textColor.toUpperCase();
    const bgColorHex = issue.backgroundColor.toUpperCase();
    const minContrast = issue.minContrast || 4.5;
    
    // Get color from input (Variables and Styles will be loaded when user clicks "Select Color")
    const colorScaleInput = document.getElementById("color-scale");
    if (!colorScaleInput || !colorScaleInput.value.trim()) return null;
    
    const colors = colorScaleInput.value.split(",")
      .map(c => c.trim().toUpperCase())
      .filter(c => c && c.startsWith("#"));
    
    if (colors.length === 0) return null;
    
    // Find color that passes contrast and is closest to current color
    let bestColor = null;
    let bestContrast = 0;
    let minColorDistance = Infinity;
    
    colors.forEach(color => {
      // Calculate contrast with background
      const contrast = calculateContrastRatio(color, bgColorHex);
      if (contrast >= minContrast) {
        // Calculate color distance to current color
        const colorDistance = getColorDistance(textColorHex, color);
        // Prefer colors with higher contrast, but if similar contrast, prefer closer color
        if (contrast > bestContrast || (contrast === bestContrast && colorDistance < minColorDistance)) {
          bestContrast = contrast;
          bestColor = color;
          minColorDistance = colorDistance;
        }
      }
    });
    
    return bestColor;
  }

  // calculateContrastRatio is imported from ./utils/colorMath.js

  // Show text style picker for typography-style and typography-check
  function showTextStylePickerForTypography(issue, styles) {
    if (!styles || styles.length === 0) {
      alert("No text styles found in Figma. Please create text styles first.");
      return;
    }
    
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "text-style-picker-typography-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "500px";
    
    // Get current node properties for comparison
    const currentNode = issue.nodeProps || {};
    const currentFamily = currentNode.fontFamily || "Unknown";
    const currentSize = currentNode.fontSize !== null && currentNode.fontSize !== undefined ? `${currentNode.fontSize}px` : "Unknown";
    const currentWeight = currentNode.fontWeight || "Unknown";
    const currentLineHeight = currentNode.lineHeight || "Unknown";
    const currentLetterSpacing = currentNode.letterSpacing !== null && currentNode.letterSpacing !== undefined ? currentNode.letterSpacing : "Unknown";
    
    // Find bestMatch name if exists
    let bestMatchName = null;
    if (issue.bestMatch) {
      bestMatchName = issue.bestMatch.name;
    }
    
    // Build style list HTML with detail info
    const styleListHtml = styles.map(style => {
      const isBestMatch = bestMatchName === style.name;
      return `
        <div class="style-picker-item" data-style-id="${style.id}" data-font-size="${style.fontSize}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid ${isBestMatch ? '#0071e3' : '#ddd'};
          border-radius: 8px;
          cursor: pointer;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${isBestMatch ? '#0071e3' : '#ddd'}'; this.style.boxShadow='none'">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(style.name)} ${isBestMatch ? '⭐' : ''}</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">
                ${escapeHtml(style.fontFamily)} ${style.fontSize}px ${escapeHtml(style.fontWeight)}
              </div>
            </div>
            ${isBestMatch ? '<div style="color: #0071e3; font-weight: 600; font-size: 12px;">Best Match</div>' : ''}
          </div>
          <div style="font-size: 11px; color: #666; padding-top: 8px; border-top: 1px solid #eee;">
            <div style="margin-bottom: 4px;"><strong>Details:</strong></div>
            <div style="padding-left: 8px; line-height: 1.6;">
              • Font Family: <code>${escapeHtml(style.fontFamily)}</code><br>
              • Font Size: <code>${style.fontSize}px</code><br>
              • Font Weight: <code>${escapeHtml(style.fontWeight)}</code><br>
              • Line Height: <code>${escapeHtml(style.lineHeight)}</code><br>
              • Letter Spacing: <code>${escapeHtml(style.letterSpacing || "0")}</code>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Choose Text Style</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Properties:</strong></div>
          <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
            • Font Family: <code>${escapeHtml(currentFamily)}</code><br>
            • Font Size: <code>${escapeHtml(currentSize)}</code><br>
            • Font Weight: <code>${escapeHtml(currentWeight)}</code><br>
            • Line Height: <code>${escapeHtml(currentLineHeight)}</code><br>
            • Letter Spacing: <code>${escapeHtml(currentLetterSpacing)}</code>
          </div>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
          ${styleListHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="text-style-picker-typography-modal-cancel-btn">Cancel</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Get elements
    const cancelBtn = dialog.querySelector("#text-style-picker-typography-modal-cancel-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const styleItems = dialog.querySelectorAll(".style-picker-item");
    
    // Close function
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    // Cancel button
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    // Click overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    // Style item clicks
    styleItems.forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const styleId = item.getAttribute("data-style-id");
        const style = styles.find(s => s.id === styleId);
        if (style) {
          // Don't close picker modal, just hide it temporarily
          overlay.style.display = "none";
          // Show confirm modal with reference to picker modal
          showTypographyStyleConfirmModal(issue, style, overlay);
        }
      };
    });
  }

  // Show typography style confirm modal
  function showTypographyStyleConfirmModal(issue, selectedStyle, pickerModalOverlay) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "typography-style-confirm-modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "500px";
    
    // Get current node properties
    const currentNode = issue.nodeProps || {};
    const currentFamily = currentNode.fontFamily || "Unknown";
    const currentSize = currentNode.fontSize !== null && currentNode.fontSize !== undefined ? `${currentNode.fontSize}px` : "Unknown";
    const currentWeight = currentNode.fontWeight || "Unknown";
    const currentLineHeight = currentNode.lineHeight || "Unknown";
    const currentLetterSpacing = currentNode.letterSpacing !== null && currentNode.letterSpacing !== undefined ? currentNode.letterSpacing : "Unknown";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Confirm Text Style Application</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Apply Text Style:</div>
          <div style="padding: 12px; background: #e3f2fd; border-left: 3px solid #0071e3; border-radius: 6px;">
            <div style="font-weight: 600; font-size: 16px; color: #333; margin-bottom: 8px;">${escapeHtml(selectedStyle.name)}</div>
            <div style="font-size: 12px; color: #666; line-height: 1.6;">
              • Font Family: <code>${escapeHtml(selectedStyle.fontFamily)}</code><br>
              • Font Size: <code>${selectedStyle.fontSize}px</code><br>
              • Font Weight: <code>${escapeHtml(selectedStyle.fontWeight)}</code><br>
              • Line Height: <code>${escapeHtml(selectedStyle.lineHeight)}</code><br>
              • Letter Spacing: <code>${escapeHtml(selectedStyle.letterSpacing || "0")}</code>
            </div>
          </div>
        </div>
        <div style="padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 8px;"><strong>Current Properties:</strong></div>
          <div style="font-size: 11px; color: #666; padding-left: 8px; line-height: 1.6;">
            • Font Family: <code>${escapeHtml(currentFamily)}</code><br>
            • Font Size: <code>${escapeHtml(currentSize)}</code><br>
            • Font Weight: <code>${escapeHtml(currentWeight)}</code><br>
            • Line Height: <code>${escapeHtml(currentLineHeight)}</code><br>
            • Letter Spacing: <code>${escapeHtml(currentLetterSpacing)}</code>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="typography-style-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="typography-style-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#typography-style-confirm-cancel-btn");
    const applyBtn = dialog.querySelector("#typography-style-confirm-apply-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    // Close function that also closes picker modal
    const closeAllModals = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        // Also close picker modal if exists
        if (pickerModalOverlay && pickerModalOverlay.parentNode) {
          pickerModalOverlay.style.animation = "fadeIn 0.2s ease-out reverse";
          setTimeout(() => {
            if (pickerModalOverlay.parentNode) {
              pickerModalOverlay.remove();
            }
          }, 200);
        }
      }, 200);
    };
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        // If there's a picker modal, show it again
        if (pickerModalOverlay) {
          pickerModalOverlay.style.display = "flex";
        }
      }, 200);
    };
    
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    applyBtn.onclick = () => {
      closeAllModals();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Applying style...", true);
      
      // Apply Figma text style
      handleApplyFigmaTextStyle(issue, selectedStyle);
    };
  }

  // Show text style picker for text-size-mobile
  function showTextStylePickerForTextSize(issue, styles) {
    // Filter styles with fontSize >= 14px
    const validStyles = styles.filter(s => s.fontSize >= 14);
    
    if (validStyles.length === 0) {
      // Fallback to font-size input
      const suggestedSize = getSuggestedTextSize(issue);
      if (suggestedSize) {
        showTextSizeFixConfirmModal(issue, issue.fontSize || 12, suggestedSize, null, null);
      } else {
        alert("No text styles found with fontSize >= 14px. Please add font sizes to Font Size input or create text styles in Figma.");
      }
      return;
    }
    
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "text-style-picker-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    // Build style list HTML
    const styleListHtml = validStyles.map(style => {
      return `
        <div class="style-picker-item" data-style-id="${style.id}" data-font-size="${style.fontSize}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='#ddd'; this.style.boxShadow='none'">
          <div>
            <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(style.name)}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              ${escapeHtml(style.fontFamily)} ${escapeHtml(style.fontSize)}px ${escapeHtml(style.fontWeight)}
            </div>
          </div>
          <div style="color: #28a745; font-weight: 600; font-size: 12px;">✓ ADA</div>
        </div>
      `;
    }).join('');
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Choose Text Style</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")} - Select style with fontSize >= 14px</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Font Size:</div>
          <div style="font-size: 16px; font-weight: 600; color: #333;">${issue.fontSize || 12}px</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${styleListHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="text-style-picker-modal-cancel-btn">Cancel</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Get elements
    const cancelBtn = dialog.querySelector("#text-style-picker-modal-cancel-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const styleItems = dialog.querySelectorAll(".style-picker-item");
    
    // Close function
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    // Cancel button
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    // Click overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    // Style item clicks
    styleItems.forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const styleId = item.getAttribute("data-style-id");
        const fontSize = parseInt(item.getAttribute("data-font-size"));
        const style = validStyles.find(s => s.id === styleId);
        if (style) {
          // Don't close picker modal, just hide it temporarily
          overlay.style.display = "none";
          // Show confirm modal with reference to picker modal
          showTextSizeFixConfirmModal(issue, issue.fontSize || 12, fontSize, overlay, style);
        }
      };
    });
  }

  // Show contrast color picker
  function showContrastColorPicker(issue, colorsFromFigma) {
    // Get colors from input as well
    const colorScaleInput = document.getElementById("color-scale");
    const colorsFromInput = colorScaleInput && colorScaleInput.value.trim() 
      ? colorScaleInput.value.split(",").map(c => c.trim().toUpperCase()).filter(c => c && c.startsWith("#"))
      : [];
    
    // Combine all colors (Variables -> Styles -> Input)
    const allColors = [];
    
    // Add from Variables
    colorsFromFigma.filter(c => c.source === "variable").forEach(c => {
      allColors.push({
        source: "Variable",
        name: c.name,
        hex: c.hex,
        id: c.id,
        variable: c.variable
      });
    });
    
    // Add from Styles
    colorsFromFigma.filter(c => c.source === "style").forEach(c => {
      allColors.push({
        source: "Style",
        name: c.name,
        hex: c.hex,
        id: c.id,
        style: c.style
      });
    });
    
    // Add from Input
    colorsFromInput.forEach(hex => {
      const name = colorNameMap[hex] || hex;
      allColors.push({
        source: "Input",
        name: name,
        hex: hex,
        id: null
      });
    });
    
    if (allColors.length === 0) {
      alert("No colors available. Please add colors to Color input or create color styles/variables in Figma.");
      return;
    }
    
    const bgColor = issue.backgroundColor || "#FFFFFF";
    const minContrast = issue.minContrast || 4.5;
    const currentColor = issue.textColor || "#000000";
    
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "contrast-color-picker-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    // Build color list HTML with consistent styling
    const colorListHtml = allColors.map(color => {
      const contrast = calculateContrastRatio(color.hex, bgColor);
      const passes = contrast >= minContrast;
      const borderColor = passes ? '#28a745' : '#ddd';
      const colorName = `${escapeHtml(color.name)} <span style="font-size: 11px; color: #666;">(${escapeHtml(color.source)})</span>`;
      const additionalInfo = `<span style="color: ${passes ? '#28a745' : '#dc3545'};">Contrast: ${contrast.toFixed(2)}:1 ${passes ? '✓' : '✗'} (need >= ${minContrast}:1)</span>`;
      
      return createColorPickerItem(color.hex, colorName, borderColor, additionalInfo);
    }).join('');
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")} - Select color that passes contrast</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Text Color:</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${escapeHtml(currentColor)}; border: 1px solid #ddd;"></div>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 13px; font-weight: 600;">${escapeHtml(currentColor)}</div>
            <div style="font-size: 11px; color: #dc3545;">Contrast: ${issue.contrast ? issue.contrast.toFixed(2) : "N/A"}:1 (fails)</div>
          </div>
          <div style="font-size: 11px; color: #666; margin-top: 4px;">Background: ${escapeHtml(bgColor)}</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${colorListHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="contrast-color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Get elements
    const cancelBtn = dialog.querySelector("#contrast-color-picker-modal-cancel-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const colorItems = dialog.querySelectorAll(".color-picker-item");
    
    // Close function
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    // Cancel button
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    // Click overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    // Color item clicks
    colorItems.forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const selectedColor = item.getAttribute("data-color");
        // Don't close picker modal, just hide it temporarily
        overlay.style.display = "none";
        // Show confirm modal with reference to picker modal
        showContrastFixConfirmModal(issue, currentColor, selectedColor, overlay);
      };
    });
  }

  // Handle fix text size issue
  function handleFixTextSizeIssue(issue) {
    // Request text styles from Figma
    parent.postMessage({
      pluginMessage: {
        type: "get-figma-text-styles",
        issueId: issue.id
      }
    }, "*");
    
    // Store issue for later use
    window.pendingTextSizeIssue = issue;
  }

  // Handle suggest fix for text size
  function handleSuggestFixTextSize(issue) {
    // Request text styles from Figma first to find closest style >= 14px
    parent.postMessage({
      pluginMessage: {
        type: "get-figma-text-styles",
        issueId: issue.id
      }
    }, "*");
    
    // Store issue for later use
    window.pendingSuggestTextSizeIssue = issue;
  }

  // Show text size fix confirm modal
  function showTextSizeFixConfirmModal(issue, currentSize, selectedSize, pickerModalOverlay, selectedStyle) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "text-size-fix-confirm-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    // Check if called from fix all
    const fixAllCallbacks = window.pendingTextSizeFixAllCallbacks || null;
    const progressHtml = fixAllCallbacks && fixAllCallbacks.progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${fixAllCallbacks.progress.current}/${fixAllCallbacks.progress.total}</div>` : '';
    
    // Build style info note if style is provided
    const styleNoteHtml = selectedStyle ? `
      <div style="margin-top: 16px; padding: 12px; background: #e8f5e9; border-radius: 6px; border-left: 3px solid #28a745;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">📝 Text Style sẽ được áp dụng:</div>
        <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(selectedStyle.name)}</div>
        <div style="font-size: 11px; color: #666; margin-top: 4px;">
          ${escapeHtml(selectedStyle.fontFamily)} ${selectedStyle.fontSize}px ${escapeHtml(selectedStyle.fontWeight)}
        </div>
      </div>
    ` : '';
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Confirm Text Size Change</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Change font size from:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="font-weight: 600; font-size: 18px; color: #333;">${currentSize}px</div>
            <div style="font-size: 12px; color: #999;">(Too small)</div>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">To:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="font-weight: 600; font-size: 18px; color: #0071e3;">${selectedSize}px</div>
            <div style="font-size: 12px; color: #28a745;">✓ ADA compliant (>= 14px)</div>
          </div>
        </div>
        ${styleNoteHtml}
      </div>
      <div class="modal-footer">
        ${window.pendingTextSizeFixAllCallbacks ? `<button class="modal-btn modal-btn-cancel" id="text-size-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>` : ""}
        <button class="modal-btn modal-btn-cancel" id="text-size-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="text-size-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Get elements
    const cancelBtn = dialog.querySelector("#text-size-fix-confirm-cancel-btn");
    const applyBtn = dialog.querySelector("#text-size-fix-confirm-apply-btn");
    const ignoreBtn = dialog.querySelector("#text-size-fix-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const callbacks = fixAllCallbacks;
    
    // Close function
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        // If there's a picker modal, show it again (only if cancel)
        if (pickerModalOverlay) {
          pickerModalOverlay.style.display = "block";
        }
      }, 200);
    };
    
    // Close function that also closes picker modal
    const closeAllModals = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        // Also close picker modal if exists
        if (pickerModalOverlay && pickerModalOverlay.parentNode) {
          pickerModalOverlay.style.animation = "fadeIn 0.2s ease-out reverse";
          setTimeout(() => {
            if (pickerModalOverlay.parentNode) {
              pickerModalOverlay.remove();
            }
          }, 200);
        }
      }, 200);
    };
    
    // Cancel button - go back to picker or stop processing
    cancelBtn.onclick = () => {
      if (callbacks && callbacks.onCancel) {
        closeAllModals();
        window.pendingTextSizeFixAllCallbacks = null;
        callbacks.onCancel();
      } else {
        closeModal();
      }
    };
    closeBtn.onclick = () => {
      if (callbacks && callbacks.onCancel) {
        closeAllModals();
        window.pendingTextSizeFixAllCallbacks = null;
        callbacks.onCancel();
      } else {
        closeModal();
      }
    };
    
    // Click overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        if (callbacks && callbacks.onCancel) {
          closeAllModals();
          window.pendingTextSizeFixAllCallbacks = null;
          callbacks.onCancel();
        } else {
          closeModal();
        }
      }
    };
    
    // Ignore button (only shown in fix all mode)
    if (ignoreBtn) {
      ignoreBtn.onclick = () => {
        closeAllModals();
        if (callbacks && callbacks.onIgnore) {
          window.pendingTextSizeFixAllCallbacks = null;
          callbacks.onIgnore();
        }
      };
    }
    
    // Apply button
    applyBtn.onclick = () => {
      closeAllModals();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Fixing text size...", true);
      
      // If a text style is provided, apply the style instead of just font size
      if (selectedStyle && selectedStyle.id) {
        // Apply Figma text style
        parent.postMessage({
          pluginMessage: {
            type: "apply-figma-text-style",
            issue: issue,
            styleId: selectedStyle.id,
            styleName: selectedStyle.name
          }
        }, "*");
      } else {
        // Fallback to just changing font size
      parent.postMessage({
        pluginMessage: {
          type: "fix-text-size-issue",
          issue: issue,
          fontSize: selectedSize
        }
      }, "*");
      }
      
      if (callbacks && callbacks.onApply) {
        window.pendingTextSizeFixAllCallbacks = null;
        callbacks.onApply();
      }
    };
  }

  // Handle fix contrast issue
  function handleFixContrastIssue(issue) {
    // Get colors from: Variables -> Styles -> Input
    // Request variables first, then styles, then use input
    parent.postMessage({
      pluginMessage: {
        type: "get-contrast-colors",
        issue: issue
      }
    }, "*");
    
    // Store issue for later use
    window.pendingContrastIssue = issue;
  }

  // Handle suggest fix for contrast
  function handleSuggestFixContrast(issue) {
    const suggestedColor = getSuggestedContrastColor(issue);
    if (!suggestedColor) {
      alert("No suitable color found that passes contrast requirements");
      return;
    }
    
    // Show confirm modal directly (no picker modal to go back to)
    showContrastFixConfirmModal(issue, issue.textColor, suggestedColor, null);
  }

  // Show contrast fix confirm modal
  function showContrastFixConfirmModal(issue, currentColor, selectedColor, pickerModalOverlay) {
    const colorName = colorNameMap[selectedColor] || selectedColor;
    const bgColor = issue.backgroundColor || "#FFFFFF";
    const minContrast = issue.minContrast || 4.5;
    const newContrast = calculateContrastRatio(selectedColor, bgColor);
    
    // Check if called from fix all
    const fixAllCallbacks = window.pendingContrastFixAllCallbacks || null;
    const progressHtml = fixAllCallbacks && fixAllCallbacks.progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${fixAllCallbacks.progress.current}/${fixAllCallbacks.progress.total}</div>` : '';
    
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "contrast-fix-confirm-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "400px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Confirm Color Change</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Change text color from:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 6px; background: ${escapeHtml(currentColor)}; border: 2px solid #ddd;"></div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(currentColor)}</div>
              <div style="font-size: 11px; color: #dc3545;">Contrast: ${issue.contrast ? issue.contrast.toFixed(2) : "N/A"}:1 (fails)</div>
            </div>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">To:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #e3f2fd; border-radius: 6px; margin-bottom: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 6px; background: ${escapeHtml(selectedColor)}; border: 2px solid #0071e3;"></div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(colorName)}</div>
              <div style="font-size: 11px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${escapeHtml(selectedColor)}</div>
              <div style="font-size: 11px; color: #28a745; margin-top: 4px;">Contrast: ${newContrast.toFixed(2)}:1 ✓ (passes >= ${minContrast}:1)</div>
            </div>
          </div>
          <div style="padding: 8px; background: #f0f0f0; border-radius: 4px; font-size: 11px; color: #666;">
            Background: ${escapeHtml(bgColor)}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${window.pendingContrastFixAllCallbacks ? `<button class="modal-btn modal-btn-cancel" id="contrast-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>` : ""}
        <button class="modal-btn modal-btn-cancel" id="contrast-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="contrast-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Get elements
    const cancelBtn = dialog.querySelector("#contrast-fix-confirm-cancel-btn");
    const applyBtn = dialog.querySelector("#contrast-fix-confirm-apply-btn");
    const ignoreBtn = dialog.querySelector("#contrast-fix-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    const callbacks = fixAllCallbacks;
    
    // Close function
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
        // If there's a picker modal, show it again
        if (pickerModalOverlay) {
          pickerModalOverlay.style.display = "block";
        }
      }, 200);
    };
    
    // Cancel button - go back to picker or stop processing
    cancelBtn.onclick = () => {
      if (callbacks && callbacks.onCancel) {
        closeModal();
        window.pendingContrastFixAllCallbacks = null;
        callbacks.onCancel();
      } else {
        closeModal();
      }
    };
    closeBtn.onclick = () => {
      if (callbacks && callbacks.onCancel) {
        closeModal();
        window.pendingContrastFixAllCallbacks = null;
        callbacks.onCancel();
      } else {
        closeModal();
      }
    };
    
    // Click overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        if (callbacks && callbacks.onCancel) {
          closeModal();
          window.pendingContrastFixAllCallbacks = null;
          callbacks.onCancel();
        } else {
          closeModal();
        }
      }
    };
    
    // Ignore button (only shown in fix all mode)
    if (ignoreBtn) {
      ignoreBtn.onclick = () => {
        closeModal();
        if (callbacks && callbacks.onIgnore) {
          window.pendingContrastFixAllCallbacks = null;
          callbacks.onIgnore();
        }
      };
    }
    
    // Apply button
    applyBtn.onclick = () => {
      closeModal();
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Fixing contrast...", true);
      
      // Send fix contrast request
      parent.postMessage({
        pluginMessage: {
          type: "fix-contrast-issue",
          issue: issue,
          color: selectedColor
        }
      }, "*");
      
      if (callbacks && callbacks.onApply) {
        window.pendingContrastFixAllCallbacks = null;
        callbacks.onApply();
      }
    };
  }

  // Handle ignore issue (toggle)
  function handleIgnoreIssue(issue) {
    try {
      const isCurrentlyIgnored = ignoredIssues[issue.id] === true;
      
      if (isCurrentlyIgnored) {
        // Un-ignore: restore original severity
        delete ignoredIssues[issue.id];
        
        // Find issue in currentReportData to update
        if (currentReportData && currentReportData.issues) {
          const issueInData = currentReportData.issues.find(i => i.id === issue.id);
          if (issueInData) {
            issueInData.ignored = false;
            // Restore original severity
            const originalSeverity = issueInData.originalSeverity || (issueInData.severity === "info" ? "error" : issueInData.severity);
            issueInData.severity = originalSeverity;
            issueInData.originalSeverity = undefined; // Clear originalSeverity
            issue.severity = originalSeverity;
            issue.ignored = false;
          }
        }
        
        // Save to storage
        saveInputValues();
        
        // Update UI inline (only this item)
        updateIssueItemUI(issue, false);
        
        // Update counts
        updateIssueCounts();
        
        // Notify via postMessage
        parent.postMessage({ pluginMessage: { type: "notify", message: "✅ Issue un-ignored" } }, "*");
      } else {
        // Ignore: mark as ignored
        if (!confirm(`Ignore this contrast issue?\n\nNode: ${issue.nodeName || "Unnamed"}\n\nThis issue will be marked as "Pass with ignore custom" and won't be counted as an error.`)) {
          return;
        }
        
        // Find issue in currentReportData to update
        if (currentReportData && currentReportData.issues) {
          const issueInData = currentReportData.issues.find(i => i.id === issue.id);
          if (issueInData) {
            // Store original severity before changing
            if (!issueInData.originalSeverity) {
              issueInData.originalSeverity = issueInData.severity;
            }
            issueInData.ignored = true;
            issueInData.severity = "info";
            issue.ignored = true;
            issue.originalSeverity = issueInData.originalSeverity;
            issue.severity = "info";
          }
        }
        
        // Mark as ignored
        ignoredIssues[issue.id] = true;
        
        // Save to storage
        saveInputValues();
        
        // Update UI inline (only this item)
        updateIssueItemUI(issue, true);
        
        // Update counts
        updateIssueCounts();
        
        // Notify via postMessage
        parent.postMessage({ pluginMessage: { type: "notify", message: "✅ Issue ignored" } }, "*");
      }
    } catch (error) {
      console.error("Error in handleIgnoreIssue:", error);
      // Notify via postMessage
      parent.postMessage({ pluginMessage: { type: "notify", message: `❌ Error: ${error.message}` } }, "*");
    }
  }
  
  // Update single issue item UI inline (without re-rendering entire group)
  function updateIssueItemUI(issue, isIgnored) {
    const issueEl = document.querySelector(`.issue[data-issue-id="${issue.id}"]`);
    if (!issueEl) return;
    
    if (isIgnored) {
      // Change to ignored state
      const originalSeverity = issue.originalSeverity || "error";
      
      // Update severity class
      issueEl.className = issueEl.className.replace(/\b(error|warn)\b/g, "info");
      
      // Update severity icon and text
      const issueType = issueEl.querySelector(".issue-type");
      if (issueType) {
        const issueNumber = issueType.querySelector(".issue-number");
        if (issueNumber) {
          const numberText = issueNumber.textContent;
          issueType.innerHTML = `<span class="issue-number">${numberText}</span> ℹ️ INFO`;
        } else {
          issueType.innerHTML = issueType.innerHTML.replace(/❌|⚠️/g, "ℹ️").replace(/ERROR|WARNING/g, "INFO");
        }
      }
      
      // Add ignore tag if not exists
      if (!issueEl.querySelector(".issue-ignored-tag")) {
        const issueBody = issueEl.querySelector(".issue-body");
        const issueNode = issueEl.querySelector(".issue-node");
        const ignoreTag = document.createElement("div");
        ignoreTag.className = "issue-ignored-tag";
        ignoreTag.style.cssText = "margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #28a745; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;";
        ignoreTag.textContent = "✓ Pass with ignore custom";
        if (issueNode) {
          issueNode.parentNode.insertBefore(ignoreTag, issueNode.nextSibling);
        } else if (issueBody) {
          issueBody.parentNode.insertBefore(ignoreTag, issueBody.nextSibling);
        } else {
          const issueHeader = issueEl.querySelector(".issue-header");
          if (issueHeader) {
            issueHeader.parentNode.insertBefore(ignoreTag, issueHeader.nextSibling);
          } else {
            issueEl.appendChild(ignoreTag);
          }
        }
      }
      
      // Update Ignore button
      const btnIgnore = document.querySelector(`button.btn-ignore[data-id="${issue.id}"]`);
      if (btnIgnore) {
        btnIgnore.removeAttribute("disabled");
        btnIgnore.innerHTML = "Ignored";
        btnIgnore.style.cssText = "padding: 6px 12px; border: 1px solid #28a745; background: #28a745; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;";
      }
    } else {
      // Restore to original state
      const originalSeverity = issue.originalSeverity || (issue.severity === "info" ? "error" : issue.severity);
      
      // Update severity class
      issueEl.className = issueEl.className.replace(/\binfo\b/g, originalSeverity);
      
      // Update severity icon and text
      const issueType = issueEl.querySelector(".issue-type");
      if (issueType) {
        const icon = originalSeverity === "error" ? "❌" : originalSeverity === "warn" ? "⚠️" : "ℹ️";
        const text = originalSeverity.toUpperCase();
        const issueNumber = issueType.querySelector(".issue-number");
        if (issueNumber) {
          const numberText = issueNumber.textContent;
          issueType.innerHTML = `<span class="issue-number">${numberText}</span> ${icon} ${text}`;
        } else {
          issueType.innerHTML = issueType.innerHTML.replace(/ℹ️/g, icon).replace(/INFO/g, text);
        }
      }
      
      // Remove ignore tag
      const ignoreTag = issueEl.querySelector(".issue-ignored-tag");
      if (ignoreTag) {
        ignoreTag.remove();
      }
      
      // Update Ignore button
      const btnIgnore = document.querySelector(`button.btn-ignore[data-id="${issue.id}"]`);
      if (btnIgnore) {
        btnIgnore.removeAttribute("disabled");
        btnIgnore.innerHTML = "Ignore";
        btnIgnore.style.cssText = "padding: 6px 12px; border: 1px solid #6c757d; background: #6c757d; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; color: white;";
      }
    }
  }
  
  // Update issue counts excluding ignored issues
  function updateIssueCounts() {
    if (!currentReportData || !currentReportData.issues) return;
    
    const issues = currentReportData.issues;
    
    // Count excluding ignored (ignored issues have severity "info" and ignored: true)
    const counts = {
      error: issues.filter(i => i.severity === "error" && !i.ignored).length,
      warn: issues.filter(i => i.severity === "warn" && !i.ignored).length,
      total: issues.length
    };
    
    // Update badges in header
    const resultsHeader = document.querySelector(".results-header");
    if (resultsHeader) {
      const statsEl = resultsHeader.querySelector(".results-stats");
      if (statsEl) {
        statsEl.innerHTML = `
          ${counts.error > 0 ? `<span class="stat error">${counts.error} Error</span>` : ""}
          ${counts.warn > 0 ? `<span class="stat warn">${counts.warn} Warning</span>` : ""}
          <span class="stat">${counts.total} Total</span>
        `;
      }
    }
    
    // Update group badges - only count non-ignored error/warn issues
    document.querySelectorAll(".issue-group").forEach(groupEl => {
      const badge = groupEl.querySelector(".badge");
      if (badge) {
        const type = groupEl.getAttribute("data-issue-type");
        if (type) {
          const groupIssues = issues.filter(i => i.type === type);
          // Count only non-ignored error/warn issues
          const groupCount = groupIssues.filter(i => {
            if (i.ignored) return false; // Don't count ignored
            return i.severity === "error" || i.severity === "warn"; // Only count error/warn
          }).length;
          badge.textContent = groupCount;
        }
      }
    });
  }

  // Handle fix spacing issue
  function handleFixSpacingIssue(issue) {
    // Extract property name and current value from message
    const message = issue.message || "";
    // Match: "Padding paddingLeft (64px)" or "Padding paddingLeft (64px) does not follow scale..." etc.
    // Also match: "Gap (itemSpacing: 64px)" for itemSpacing
    let match = message.match(/Padding\s+(\w+)\s+\((\d+)px\)/);
    let propertyName = null;
    let currentValue = null;
    
    if (match) {
      propertyName = match[1]; // paddingLeft, paddingRight, paddingTop, paddingBottom
      currentValue = parseInt(match[2]); // 64
    } else {
      // Try to match itemSpacing: "Gap (itemSpacing: 64px)"
      match = message.match(/Gap\s+\(itemSpacing:\s+(\d+)px\)/);
      if (match) {
        propertyName = "itemSpacing";
        currentValue = parseInt(match[1]);
      }
    }
    
    if (!match || !propertyName || currentValue === null) {
      console.error("Cannot parse spacing issue message:", message);
      alert("Cannot determine spacing property from issue message. Message: " + message);
      return;
    }
    
    // Get spacing scale from input
    const spacingScaleInput = document.getElementById("spacing-scale");
    if (!spacingScaleInput || !spacingScaleInput.value.trim()) {
      alert("No spacing scale defined. Please add spacing values to the Spacing input.");
      return;
    }
    
    // Parse spacing values from input
    const spacingValues = spacingScaleInput.value.split(",")
      .map(v => parseInt(v.trim(), 10))
      .filter(v => !isNaN(v) && v >= 0)
      .sort((a, b) => a - b); // Sort ascending
    
    if (spacingValues.length === 0) {
      alert("No valid spacing values found in Spacing input.");
      return;
    }
    
    // Show spacing picker modal
    showSpacingPickerModal(issue, propertyName, currentValue, spacingValues);
  }

  // showSpacingPickerModal/showSpacingFixConfirmModal are imported from ./features/modals/spacing.js

  // Handle fix color issue
  function handleFixColorIssue(issue) {
    // Extract current color from message
    const message = issue.message || "";
    const colorMatch = message.match(/Color (#[0-9A-Fa-f]{6})/);
    const currentColor = colorMatch ? colorMatch[1].toUpperCase() : null;
    
    if (!currentColor) {
      alert("Cannot determine current color from issue message");
      return;
    }
    
    // Get color scale from input
    const colorScaleInput = document.getElementById("color-scale");
    if (!colorScaleInput || !colorScaleInput.value.trim()) {
      alert("No color scale defined. Please add colors to the Color input.");
      return;
    }
    
    // Parse colors from input
    const colors = colorScaleInput.value.split(",")
      .map(c => c.trim().toUpperCase())
      .filter(c => c && c.startsWith("#"));
    
    if (colors.length === 0) {
      alert("No valid colors found in Color input.");
      return;
    }
    
    // Show color picker modal
    showColorPickerModal(issue, currentColor, colors, colorNameMap);
  }

  // showColorPickerModal/showColorFixConfirmModal are imported from ./features/modals/colors.js

  // Handle fix single issue
  function handleFixIssue(issue) {
    // For typography-check issues, show confirmation modal
    if (issue.type === "typography-check" && issue.bestMatch) {
      showTypographyFixModal(issue, typographyStyles);
      return;
    }
    
    // Show loading message immediately
    showFixMessage(issue.id, "⏳ Fixing...", true);
    
    if (!issue.bestMatch && issue.type !== "typography-check") {
      // Show popup for manual fix
      const userInput = prompt(`Cannot auto-fix this issue.\n\nIssue: ${issue.message}\n\nPlease provide fix instructions or press Cancel.`);
      if (userInput) {
        // Send manual fix request
        parent.postMessage({ 
          pluginMessage: { 
            type: "fix-issue", 
            issue: issue,
            manualFix: userInput
          } 
        }, "*");
      } else {
        // Remove loading message if cancelled
        const issueEl = document.querySelector(`.issue[data-issue-id="${issue.id}"]`) || 
                       document.querySelector(`button.btn-fix[data-id="${issue.id}"]`)?.closest(".issue");
        if (issueEl) {
          const msg = issueEl.querySelector(".fix-message");
          if (msg) msg.remove();
        }
      }
      return;
    }

    // Auto-fix with bestMatch
    parent.postMessage({ 
      pluginMessage: { 
        type: "fix-issue", 
        issue: issue
      } 
    }, "*");
  }

  // Show create style modal
  function showCreateStyleModal(issue, onConfirm) {
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "create-style-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    
    // Get subtitle text
    let subtitleText = issue.nodeName || "Unnamed";
    if (issue.message && issue.message.includes("(") && issue.message.includes("nodes")) {
      // Extract node count if available
      const match = issue.message.match(/\((\d+) nodes\)/);
      if (match) {
        subtitleText = `${subtitleText} (${match[1]} nodes)`;
      }
    }
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Create Style</h2>
        <p class="modal-subtitle">${escapeHtml(subtitleText)}</p>
      </div>
      <div class="modal-body">
        <input 
          type="text" 
          class="modal-input" 
          id="style-name-input" 
          placeholder="Style Name" 
          value="${escapeHtml(issue.nodeName || "New Style")}"
          autofocus
        />
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="modal-create-btn">Create</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Get elements
    const input = dialog.querySelector("#style-name-input");
    const cancelBtn = dialog.querySelector("#modal-cancel-btn");
    const createBtn = dialog.querySelector("#modal-create-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    // Focus input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);
    
    // Handle Enter key
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        createBtn.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelBtn.click();
      }
    };
    
    // Close function
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    // Cancel button
    cancelBtn.onclick = closeModal;
    closeBtn.onclick = closeModal;
    
    // Click overlay to close
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    };
    
    // Create button
    createBtn.onclick = () => {
      const styleName = input.value.trim();
      if (!styleName) {
        input.focus();
        input.style.borderColor = "#ff3b30";
        setTimeout(() => {
          input.style.borderColor = "#0071e3";
        }, 2000);
        return;
      }
      
      closeModal();
      if (onConfirm) {
        onConfirm(styleName);
      }
    };
  }

  // Show suggest apply modal
  function showSuggestApplyModal(issue, styleName, options = {}) {
    if (!issue || !styleName) {
      console.error("showSuggestApplyModal: missing issue or styleName");
      return;
    }
    
    const { onApply, onIgnore, onCancel, showIgnore = false, progress } = options;
    
    // Find the style
    const style = typographyStyles.find(s => s.name === styleName);
    if (!style) {
      alert(`Style "${styleName}" not found`);
      return;
    }
    
    // Get current node properties
    const currentNode = issue.nodeProps || {};
    const currentFamily = currentNode.fontFamily || "Unknown";
    const currentSize = currentNode.fontSize !== null && currentNode.fontSize !== undefined ? `${currentNode.fontSize}px` : "Unknown";
    const currentWeight = currentNode.fontWeight || "Unknown";
    const currentLineHeight = currentNode.lineHeight || "Unknown";
    const currentLetterSpacing = currentNode.letterSpacing !== null && currentNode.letterSpacing !== undefined ? currentNode.letterSpacing : "Unknown";
    
    // Get suggested style properties
    const suggestedFamily = style.fontFamily || "Unknown";
    const suggestedSize = style.fontSize ? `${style.fontSize}px` : "Unknown";
    const suggestedWeight = style.fontWeight || "Unknown";
    const suggestedLineHeight = style.lineHeight || "Unknown";
    const suggestedLetterSpacing = style.letterSpacing !== null && style.letterSpacing !== undefined ? style.letterSpacing : "Unknown";
    
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.id = "suggest-apply-modal-overlay";
    
    // Create modal dialog
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "500px";
    
    // Build comparison HTML
    const comparisonHtml = `
      <div style="margin-top: 16px; font-size: 13px;">
        <div style="margin-bottom: 12px; font-weight: 600; color: #333;">Comparison:</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="border-bottom: 1px solid #ddd;">
              <th style="text-align: left; padding: 8px; font-weight: 600; color: #666;">Property</th>
              <th style="text-align: left; padding: 8px; font-weight: 600; color: #666;">Current</th>
              <th style="text-align: left; padding: 8px; font-weight: 600; color: #28a745;">Suggested</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px; color: #666;">Font Family</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${escapeHtml(currentFamily)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${escapeHtml(suggestedFamily)}</code></td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px; color: #666;">Font Size</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${escapeHtml(currentSize)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${escapeHtml(suggestedSize)}</code></td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px; color: #666;">Font Weight</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${escapeHtml(currentWeight)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${escapeHtml(suggestedWeight)}</code></td>
            </tr>
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px; color: #666;">Line Height</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${escapeHtml(currentLineHeight)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${escapeHtml(suggestedLineHeight)}</code></td>
            </tr>
            <tr>
              <td style="padding: 8px; color: #666;">Letter Spacing</td>
              <td style="padding: 8px;"><code style="background: #f5f5f5; padding: 2px 6px; border-radius: 3px;">${escapeHtml(currentLetterSpacing)}</code></td>
              <td style="padding: 8px;"><code style="background: #d4edda; padding: 2px 6px; border-radius: 3px; color: #155724;">${escapeHtml(suggestedLetterSpacing)}</code></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
    
    const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Apply Suggested Style</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 14px; font-weight: 600; color: #333; margin-bottom: 8px;">
            Suggested Style: <span style="color: #28a745;">${escapeHtml(styleName)}</span>
          </div>
          ${issue.bestMatch && issue.bestMatch.percentage ? `
            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
              Match: <strong>${issue.bestMatch.percentage}%</strong>
            </div>
          ` : ''}
        </div>
        ${comparisonHtml}
      </div>
      <div class="modal-footer">
        ${showIgnore ? `<button class="modal-btn modal-btn-cancel" id="suggest-modal-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>` : ''}
        <button class="modal-btn modal-btn-cancel" id="suggest-modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="suggest-modal-apply-btn" style="background: #28a745; border-color: #28a745;">Apply Style</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    // Get elements
    const cancelBtn = dialog.querySelector("#suggest-modal-cancel-btn");
    const applyBtn = dialog.querySelector("#suggest-modal-apply-btn");
    const ignoreBtn = dialog.querySelector("#suggest-modal-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    // Close function
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    // Cancel button - if showIgnore is true, treat cancel as stop (onCancel)
    cancelBtn.onclick = () => {
      closeModal();
      if (showIgnore && options.onCancel && typeof options.onCancel === "function") {
        options.onCancel();
      }
    };
    closeBtn.onclick = () => {
      closeModal();
      if (showIgnore && options.onCancel && typeof options.onCancel === "function") {
        options.onCancel();
      }
    };
    
    // Click overlay to close - if showIgnore is true, treat as stop (onCancel)
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (showIgnore && options.onCancel && typeof options.onCancel === "function") {
          options.onCancel();
        }
      }
    };
    
    // Apply button
    applyBtn.onclick = () => {
      closeModal();
      // Show loading message
      showFixMessage(issue.id, "⏳ Applying style...", true);
      
      // Send apply style request
      parent.postMessage({
        pluginMessage: {
          type: "apply-typography-style",
          issue: issue,
          style: style
        }
      }, "*");
      
      // Call onApply callback if provided
      if (onApply && typeof onApply === "function") {
        onApply();
      }
    };
    
    // Ignore button
    if (ignoreBtn) {
      ignoreBtn.onclick = () => {
        closeModal();
        // Call onIgnore callback if provided
        if (onIgnore && typeof onIgnore === "function") {
          onIgnore();
        }
      };
    }
  }
  
  // Handle fix all with suggest fix (sequential processing)
  function handleFixAllWithSuggestFix(type, issues) {
    if (!issues || issues.length === 0) {
      alert("No issues to process");
      return;
    }
    
    let currentIndex = 0;
    let appliedCount = 0;
    let ignoredCount = 0;
    let isStopped = false;
    
    function showCompletionMessage() {
      const total = currentIndex; // Number of items processed
      const message = `✅ Đã xong!\n\nĐã xử lý ${total} item(s):\n• Applied: ${appliedCount}\n• Ignored: ${ignoredCount}`;
      alert(message);
    }
    
    function processNextIssue() {
      if (isStopped || currentIndex >= issues.length) {
        // All done or stopped, show completion popup
        showCompletionMessage();
        return;
      }
      
      const issue = issues[currentIndex];
      currentIndex++;
      
      // Select the node first
      parent.postMessage({ pluginMessage: { type: "select-node", id: issue.id } }, "*");
      
      // Show appropriate modal based on issue type
      const progress = { current: currentIndex, total: issues.length };
      
      if (issue.type === "typography-check" || issue.type === "typography-style") {
        // Use showSuggestApplyModal for typography issues
        showSuggestApplyModal(issue, issue.bestMatch.name, {
          showIgnore: true,
          progress: progress,
          onApply: () => {
            appliedCount++;
            // Wait a bit for apply to complete, then process next
            setTimeout(() => {
              processNextIssue();
            }, 500);
          },
          onIgnore: () => {
            ignoredCount++;
            // Process next immediately
            processNextIssue();
          },
          onCancel: () => {
            // Stop processing and show completion message
            isStopped = true;
            showCompletionMessage();
          }
        });
      } else if (issue.type === "color") {
        // Use showColorFixConfirmModal for color issues
        const suggestedColor = getSuggestedColor(issue);
        const message = issue.message || "";
        const colorMatch = message.match(/Color (#[0-9A-Fa-f]{6})/);
        const currentColor = colorMatch ? colorMatch[1].toUpperCase() : null;
        
        // Create a wrapper modal that supports ignore
        showColorFixConfirmModalWithIgnore(issue, currentColor, suggestedColor, {
          progress: progress,
          onApply: () => {
            appliedCount++;
            setTimeout(() => {
              processNextIssue();
            }, 500);
          },
          onIgnore: () => {
            ignoredCount++;
            processNextIssue();
          },
          onCancel: () => {
            // Stop processing and show completion message
            isStopped = true;
            showCompletionMessage();
          }
        });
      } else if (issue.type === "spacing") {
        // Use showSpacingFixConfirmModal for spacing issues
        const suggestedValue = getSuggestedSpacing(issue);
        const message = issue.message || "";
        const match = message.match(/Padding\s+(\w+)\s+\((\d+)px\)/);
        if (match) {
          const propertyName = match[1];
          const currentValue = parseInt(match[2]);
          
          showSpacingFixConfirmModalWithIgnore(issue, propertyName, currentValue, suggestedValue, {
            progress: progress,
            onApply: () => {
              appliedCount++;
              setTimeout(() => {
                processNextIssue();
              }, 500);
            },
            onIgnore: () => {
              ignoredCount++;
              processNextIssue();
            },
            onCancel: () => {
              // Stop processing and show completion message
              isStopped = true;
              showCompletionMessage();
            }
          });
        } else {
          // Skip if cannot parse
          ignoredCount++;
          processNextIssue();
        }
      } else if (issue.type === "autolayout") {
        // Use showAutolayoutFixConfirmModal for autolayout issues
        showAutolayoutFixConfirmModalWithIgnore(issue, {
          progress: progress,
          onApply: () => {
            appliedCount++;
            setTimeout(() => {
              processNextIssue();
            }, 500);
          },
          onIgnore: () => {
            ignoredCount++;
            processNextIssue();
          },
          onCancel: () => {
            // Stop processing and show completion message
            isStopped = true;
            showCompletionMessage();
          }
        });
      } else if (issue.type === "position") {
        // Use showPositionFixConfirmModal for position issues
        showPositionFixConfirmModalWithIgnore(issue, {
          progress: progress,
          onApply: () => {
            appliedCount++;
            setTimeout(() => {
              processNextIssue();
            }, 500);
          },
          onIgnore: () => {
            ignoredCount++;
            processNextIssue();
          },
          onCancel: () => {
            isStopped = true;
            showCompletionMessage();
          }
        });
      } else if (issue.type === "group") {
        // Use showGroupFixConfirmModal for group issues
        showGroupFixConfirmModalWithIgnore(issue, {
          progress: progress,
          onApply: () => {
            appliedCount++;
            setTimeout(() => {
              processNextIssue();
            }, 500);
          },
          onIgnore: () => {
            ignoredCount++;
            processNextIssue();
          },
          onCancel: () => {
            isStopped = true;
            showCompletionMessage();
          }
        });
      } else if (issue.type === "empty-frame") {
        // Use showEmptyFrameFixConfirmModal for empty-frame issues
        showEmptyFrameFixConfirmModalWithIgnore(issue, {
          progress: progress,
          onApply: () => {
            appliedCount++;
            setTimeout(() => {
              processNextIssue();
            }, 500);
          },
          onIgnore: () => {
            ignoredCount++;
            processNextIssue();
          },
          onCancel: () => {
            isStopped = true;
            showCompletionMessage();
          }
        });
      } else if (issue.type === "text-size-mobile") {
        // Use handleSuggestFixTextSize for text-size-mobile (async, needs special handling)
        // Store callbacks for when modal is shown
        window.pendingTextSizeFixAllCallbacks = {
          progress: progress,
          onApply: () => {
            appliedCount++;
            setTimeout(() => {
              processNextIssue();
            }, 500);
          },
          onIgnore: () => {
            ignoredCount++;
            processNextIssue();
          },
          onCancel: () => {
            isStopped = true;
            showCompletionMessage();
          }
        };
        handleSuggestFixTextSize(issue);
      } else if (issue.type === "contrast") {
        // Use handleSuggestFixContrast for contrast (async, needs special handling)
        // Store callbacks for when modal is shown
        window.pendingContrastFixAllCallbacks = {
          progress: progress,
          onApply: () => {
            appliedCount++;
            setTimeout(() => {
              processNextIssue();
            }, 500);
          },
          onIgnore: () => {
            ignoredCount++;
            processNextIssue();
          },
          onCancel: () => {
            isStopped = true;
            showCompletionMessage();
          }
        };
        handleSuggestFixContrast(issue);
      } else {
        // For other types, use their respective handlers
        // For now, just call the handler and continue
        // This will need to be extended for other types
        ignoredCount++;
        processNextIssue();
      }
    }
    
    // Start processing
    processNextIssue();
  }
  
  // Wrapper for showColorFixConfirmModal with ignore support
  function showColorFixConfirmModalWithIgnore(issue, currentColor, selectedColor, callbacks = {}) {
    const { onApply, onIgnore, onCancel, progress } = callbacks;
    const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';
    
    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "450px";
    
    const colorName = colorNameMap[selectedColor] || selectedColor;
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Apply Suggested Color</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Color Change:</div>
          <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; border-radius: 8px; background: ${escapeHtml(currentColor)}; border: 2px solid #ddd; margin-bottom: 8px;"></div>
              <div style="font-size: 11px; color: #666;">Current</div>
              <div style="font-size: 12px; font-weight: 600; color: #333; font-family: 'SF Mono', Monaco, monospace; margin-top: 4px;">${escapeHtml(currentColor)}</div>
            </div>
            <div style="font-size: 24px; color: #666;">→</div>
            <div style="text-align: center;">
              <div style="width: 64px; height: 64px; border-radius: 8px; background: ${escapeHtml(selectedColor)}; border: 2px solid #0071e3;"></div>
              <div style="font-size: 11px; color: #666;">Suggested</div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(colorName)}</div>
              <div style="font-size: 12px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${escapeHtml(selectedColor)}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="color-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="color-fix-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#color-fix-cancel-btn");
    const applyBtn = dialog.querySelector("#color-fix-apply-btn");
    const ignoreBtn = dialog.querySelector("#color-fix-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    closeBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (onCancel) onCancel();
      }
    };
    
    ignoreBtn.onclick = () => {
      closeModal();
      if (onIgnore) onIgnore();
    };
    
    applyBtn.onclick = () => {
      closeModal();
      showFixMessage(issue.id, "⏳ Fixing color...", true);
      parent.postMessage({
        pluginMessage: {
          type: "fix-color-issue",
          issue: issue,
          color: selectedColor
        }
      }, "*");
      if (onApply) onApply();
    };
  }
  
  // Wrapper for showSpacingFixConfirmModal with ignore support
  function showSpacingFixConfirmModalWithIgnore(issue, propertyName, currentValue, selectedValue, callbacks = {}) {
    const { onApply, onIgnore, onCancel, progress } = callbacks;
    const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';
    
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    dialog.style.maxWidth = "450px";
    
    dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Apply Suggested Spacing</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Spacing Change:</div>
          <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <div style="text-align: center;">
              <div style="font-weight: 600; font-size: 18px; color: #333;">${currentValue}px</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">Current</div>
            </div>
            <div style="font-size: 24px; color: #666;">→</div>
            <div style="text-align: center;">
              <div style="font-weight: 600; font-size: 18px; color: #333;">${selectedValue}px</div>
              <div style="font-size: 11px; color: #666; margin-top: 4px;">Suggested</div>
            </div>
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 8px;">Property: <strong>${escapeHtml(propertyName)}</strong></div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="spacing-fix-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cancelBtn = dialog.querySelector("#spacing-fix-cancel-btn");
    const applyBtn = dialog.querySelector("#spacing-fix-apply-btn");
    const ignoreBtn = dialog.querySelector("#spacing-fix-ignore-btn");
    const closeBtn = dialog.querySelector(".modal-close");
    
    const closeModal = () => {
      overlay.style.animation = "fadeIn 0.2s ease-out reverse";
      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.remove();
        }
      }, 200);
    };
    
    cancelBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    closeBtn.onclick = () => {
      closeModal();
      if (onCancel) onCancel();
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeModal();
        if (onCancel) onCancel();
      }
    };
    
    ignoreBtn.onclick = () => {
      closeModal();
      if (onIgnore) onIgnore();
    };
    
    applyBtn.onclick = () => {
      closeModal();
      showFixMessage(issue.id, "⏳ Fixing spacing...", true);
      parent.postMessage({
        pluginMessage: {
          type: "fix-spacing-issue",
          issue: issue,
          propertyName: propertyName,
          value: selectedValue
        }
      }, "*");
      if (onApply) onApply();
    };
  }

  // Handle apply Figma text style to node
  function handleApplyFigmaTextStyle(issue, style) {
    if (!issue || !style) {
      console.error("handleApplyFigmaTextStyle: missing issue or style");
      return;
    }
    
    // Show loading message
    showFixMessage(issue.id, "⏳ Applying style...", true);
    
    // Send apply Figma text style request
    parent.postMessage({
      pluginMessage: {
        type: "apply-figma-text-style",
        issue: issue,
        styleId: style.id,
        styleName: style.name
      }
    }, "*");
  }

  // Handle apply typography style to node (from typography table)
  function handleApplyTypographyStyle(issue, styleName) {
    if (!issue || !styleName) {
      console.error("handleApplyTypographyStyle: missing issue or styleName");
      return;
    }
    
    // Show suggest modal first
    showSuggestApplyModal(issue, styleName);
  }

  // Handle create text style for typography-style issue
  function handleCreateTextStyle(issue) {
    console.log("handleCreateTextStyle called", issue);
    
    if (!issue) {
      console.error("handleCreateTextStyle: issue is null/undefined");
      return;
    }
    
    // Show custom modal
    showCreateStyleModal(issue, (styleName) => {
      console.log("handleCreateTextStyle: sending message", { type: "create-text-style", issueId: issue.id, styleName: styleName });
      
      // Show loading message
      showFixMessage(issue.id, "⏳ Creating style...", true);
      
      // Send create style request
      parent.postMessage({
        pluginMessage: {
          type: "create-text-style",
          issue: issue,
          styleName: styleName
        }
      }, "*");
    });
  }

  // Handle fix all issues in a group
  function handleFixAllIssues(type, issues) {
    // Handle typography-style: create styles for all
    if (type === "typography-style") {
      // Create a fake issue object for the modal
      const fakeIssue = {
        nodeName: `${issues.length} text node(s)`,
        message: `Found ${issues.length} text node(s) without text style`
      };
      
      showCreateStyleModal(fakeIssue, (styleName) => {
        // Show loading for all issues
        issues.forEach(issue => {
          showFixMessage(issue.id, "⏳ Creating style...", true);
        });
        
        // Send create style for all request
        parent.postMessage({
          pluginMessage: {
            type: "create-text-style-all",
            issues: issues,
            styleName: styleName
          }
        }, "*");
      });
      return;
    }
    
    // Handle typography-check: fix with bestMatch
    const fixableIssues = issues.filter(i => i.bestMatch && i.type === "typography-check");
    const nonFixableIssues = issues.filter(i => !i.bestMatch || i.type !== "typography-check");

    if (fixableIssues.length === 0) {
      alert(`No auto-fixable issues found in ${getTypeDisplayName(type)}.\n\nAll ${issues.length} issues require manual intervention.`);
      return;
    }

    if (nonFixableIssues.length > 0) {
      const proceed = confirm(
        `Found ${fixableIssues.length} auto-fixable issues and ${nonFixableIssues.length} issues that require manual fix.\n\n` +
        `Do you want to auto-fix the ${fixableIssues.length} issues now?\n\n` +
        `The ${nonFixableIssues.length} issues will need to be fixed manually.`
      );
      if (!proceed) return;
    }

    // Send fix all request
    parent.postMessage({ 
      pluginMessage: { 
        type: "fix-all-issues", 
        issues: fixableIssues,
        issueType: type
      } 
    }, "*");
  }

  // getContrastTextColor is imported from ./utils/color.js

        function filterAndSearchIssues(issues) {
          console.log("filterAndSearchIssues called", { 
            totalIssues: issues.length, 
            currentFilter, 
            currentSearch 
          });
          let filtered = issues;

          // Filter by severity
          if (currentFilter !== "all") {
            filtered = filtered.filter(issue => issue.severity === currentFilter);
            console.log("After severity filter:", filtered.length);
          }

          // Search
          if (currentSearch.trim()) {
            const searchLower = currentSearch.toLowerCase();
            filtered = filtered.filter(issue => {
              const message = (issue.message || "").toLowerCase();
              const nodeName = (issue.nodeName || "").toLowerCase();
              const type = (issue.type || "").toLowerCase();
              return message.includes(searchLower) || 
                     nodeName.includes(searchLower) || 
                     type.includes(searchLower);
            });
            console.log("After search filter:", filtered.length);
          }

          console.log("Final filtered issues:", filtered.length);
          return filtered;
        }

        function renderResults(issues = [], resetFilters = false, options = {}) {
          const { skipSave = false, restoreTimestamp = null } = options;
          
          // Switch to issues tab and update badge
          switchToTab("issues");
          document.getElementById("issues-count").textContent = issues.length;
          
          // Check ignored issues and mark them
          if (issues && Array.isArray(issues)) {
            issues.forEach(issue => {
              if (ignoredIssues[issue.id] === true) {
                issue.ignored = true;
                // Store original severity if not already stored
                if (!issue.originalSeverity) {
                  issue.originalSeverity = issue.severity;
                }
                issue.severity = "info"; // Change to info for ignored issues
              }
            });
          }
          
          // Store report data
          const isNewData = currentReportData.issues !== issues;
          currentReportData.issues = issues;
          // Don't clear tokens - keep it
          // currentReportData.tokens = null;
          const timestamp = restoreTimestamp || new Date().toISOString();
          currentReportData.timestamp = timestamp;
          isViewingTokens = false;
          
          // Only reset filters if this is new data or explicitly requested
          if (resetFilters || isNewData) {
            console.log("Resetting filters for new data");
            currentFilter = "all";
            currentColorTypeFilter = "all";
            if (searchInput) {
              searchInput.value = "";
            }
            currentSearch = "";
            if (btnClearSearch) {
              btnClearSearch.style.display = "none";
            }
            if (filterButtons && filterButtons.length > 0) {
              filterButtons.forEach(btn => {
                btn.classList.remove("active");
                if (btn.getAttribute("data-filter") === "all") {
                  btn.classList.add("active");
                }
              });
            }
          }
          
          // Show filter controls
          const filterControls = document.getElementById("filter-controls");
          const colorTypeFilter = document.getElementById("color-type-filter");
          const filterButtonsContainer = document.getElementById("filter-buttons");
          filterControls.style.display = issues.length > 0 ? "flex" : "none";
          colorTypeFilter.style.display = "none";
          filterButtonsContainer.style.display = "flex";
          
          const exportGroup = document.getElementById("export-group");
          exportGroup.style.display = issues.length > 0 ? "flex" : "none";

          // Filter issues - use current filter/search values
          console.log("About to filter with:", { currentFilter, currentSearch });
          const filteredIssues = filterAndSearchIssues(issues);
          
          // Save expanded/collapsed state of groups before clearing
          const expandedGroups = new Set();
          if (!isNewData) {
            // Only save state if this is not new data (i.e., re-rendering existing data)
            const existingGroups = document.querySelectorAll(".issue-group");
            existingGroups.forEach(group => {
              const groupType = group.getAttribute("data-issue-type");
              if (groupType && !group.classList.contains("collapsed")) {
                expandedGroups.add(groupType);
              }
            });
            console.log("Saved expanded groups:", Array.from(expandedGroups));
          }
          
          clearResults("issues");

          // Only show empty state if no issues at all (first scan)
          // If filter is "all", we should still show groups even if filteredIssues is empty
          if (filteredIssues.length === 0 && issues.length === 0) {
            resultsIssues.innerHTML = `
              <div class="empty-state success">
                <div class="icon">✅</div>
                <p><strong>No issues found!</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Your design passed all configured checks.</p>
              </div>
            `;
            return;
          }
          
          // If filteredIssues is empty but we have original issues and filter is not "all", show empty state
          if (filteredIssues.length === 0 && issues.length > 0 && currentFilter !== "all") {
            resultsIssues.innerHTML = `
              <div class="empty-state">
                <div class="icon">🔍</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;
            return;
          }

          // Calculate stats from filtered issues (exclude ignored issues from error/warn counts)
          const stats = {
            error: filteredIssues.filter(i => i.severity === "error" && !i.ignored).length,
            warn: filteredIssues.filter(i => i.severity === "warn" && !i.ignored).length,
            total: filteredIssues.length,
            originalTotal: issues.length
          };

          // Results header
          const header = document.createElement("div");
          header.className = "results-header";
          header.innerHTML = `
            <h3>Check Result</h3>
            <div class="results-stats">
              ${stats.error > 0 ? `<span class="stat error">${stats.error} Error</span>` : ""}
              ${stats.warn > 0 ? `<span class="stat warn">${stats.warn} Warning</span>` : ""}
              <span class="stat">${stats.total} Total</span>
              ${stats.originalTotal !== stats.total ? `<span class="stat" style="opacity: 0.6;">(${stats.originalTotal} total)</span>` : ""}
            </div>
          `;
          resultsIssues.appendChild(header);

          // Group filtered issues by type
          const grouped = filteredIssues.reduce((acc, i) => {
            acc[i.type] = acc[i.type] || [];
            acc[i.type].push(i);
            return acc;
          }, {});
          
          // Also group original issues by type (for checking hasSuggestFixButton)
          const allGrouped = issues.reduce((acc, i) => {
            acc[i.type] = acc[i.type] || [];
            acc[i.type].push(i);
            return acc;
          }, {});

          // Define all possible issue types (to show even when count = 0)
          const allIssueTypes = [
            "naming", "autolayout", "spacing", "color", "typography", "typography-style", "typography-check",
            "line-height", "position", "duplicate", "group", "component",
            "empty-frame", "nested-group", "contrast", "text-size-mobile"
          ];

          // Render all issue types (including those with 0 issues)
          for (const type of allIssueTypes) {
            // Count issues excluding ignored ones from error/warn counts
            const groupIssues = grouped[type] || [];
            const issueCount = groupIssues.length;
            // For badge: count all issues, but ignored ones won't be counted in error/warn stats
            // For display: show all issues but mark ignored ones differently
            const nonIgnoredErrorWarnCount = groupIssues.filter(i => {
              if (i.ignored) return false; // Don't count ignored
              return i.severity === "error" || i.severity === "warn";
            }).length;
            
            // Skip if no issues and no original issues (first scan)
            // But always show groups if there are any issues in the scan (even if filtered out)
            if (issueCount === 0 && issues.length === 0) {
              continue; // Don't show empty groups on first scan with no issues
            }
            
            // Hide groups with 0 count when filtering by error or warning
            // But show them if filter is "all" (to show groups with no errors/warnings)
            if (issueCount === 0 && currentFilter !== "all") {
              continue; // Skip empty groups when filtering by error/warning
            }
            const groupEl = document.createElement("div");
            // Check if this group was expanded before re-render
            const wasExpanded = expandedGroups.has(type);
            groupEl.className = wasExpanded ? "issue-group" : "issue-group collapsed";
            groupEl.setAttribute("data-issue-type", type);
            
            const groupHeader = document.createElement("div");
            groupHeader.className = "issue-group-header";
            // Check if any issue in this group has "suggest fix now" button
            // Use allGrouped (original issues) instead of grouped (filtered) to check for suggest fix button
            const hasSuggestFixButton = (allGrouped[type] || []).some(issue => {
              if (!issue) return false;
              
              // Check based on issue type
              switch (issue.type) {
                case "color":
                  return getSuggestedColor(issue) !== null;
                case "spacing":
                  return getSuggestedSpacing(issue) !== null;
                case "autolayout":
                  return typeof getSuggestedAutolayout === "function" && getSuggestedAutolayout(issue) !== null;
                case "text-size-mobile":
                  return typeof getSuggestedTextSize === "function" && getSuggestedTextSize(issue) !== null;
                case "contrast":
                  return typeof getSuggestedContrastColor === "function" && getSuggestedContrastColor(issue) !== null;
                case "typography-style":
                case "typography-check":
                  return issue.bestMatch !== null;
                case "position":
                  return typeof getSuggestedPositionFix === "function" && getSuggestedPositionFix(issue) !== null;
                case "duplicate":
                case "component":
                  return typeof getSuggestedComponent === "function" && getSuggestedComponent(issue) !== null;
                case "group":
                  return true; // Always has suggest fix button
                case "empty-frame":
                  return typeof getSuggestedEmptyFrameFix === "function" && getSuggestedEmptyFrameFix(issue) !== null;
                default:
                  return false;
              }
            });
            
            groupHeader.innerHTML = `
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">${wasExpanded ? "▶" : "▶"}</span>
                </button>
                <h4>${getTypeIcon(type)} ${getTypeDisplayName(type)}</h4>
                <span class="badge">${nonIgnoredErrorWarnCount}</span>
              </div>
              ${issueCount > 0 && type !== "typography" && type !== "line-height" && type !== "naming" && type !== "typography-style" && type !== "component" && type !== "duplicate" && hasSuggestFixButton ? `<button class="btn-fix-all" data-type="${type}">Fix all now</button>` : ""}
            `;
            
            // Add click handler for collapse/expand
            const toggleBtn = groupHeader.querySelector(".issue-group-toggle");
            const toggleCollapse = () => {
              const isCollapsed = groupEl.classList.contains("collapsed");
              if (isCollapsed) {
                groupEl.classList.remove("collapsed");
                groupContent.style.display = "block";
                setTimeout(() => {
                  groupContent.style.opacity = "1";
                }, 10);
              } else {
                groupContent.style.opacity = "0";
                setTimeout(() => {
                  groupEl.classList.add("collapsed");
                  groupContent.style.display = "none";
                }, 200);
              }
            };
            
            toggleBtn.onclick = (e) => {
              e.stopPropagation();
              toggleCollapse();
            };
            
            groupHeader.onclick = (e) => {
              if (e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
                toggleCollapse();
              }
            };
            
            // Add click handler for "Fix all now" button
            const btnFixAll = groupHeader.querySelector(".btn-fix-all");
            if (btnFixAll) {
              btnFixAll.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Get all issues with suggest fix button in this group (use original issues, not filtered)
                const issuesWithSuggestFix = (allGrouped[type] || []).filter(issue => {
                  if (!issue) return false;
                  
                  // Check based on issue type
                  switch (issue.type) {
                    case "color":
                      return getSuggestedColor(issue) !== null;
                    case "spacing":
                      return getSuggestedSpacing(issue) !== null;
                    case "autolayout":
                      return typeof getSuggestedAutolayout === "function" && getSuggestedAutolayout(issue) !== null;
                    case "text-size-mobile":
                      return typeof getSuggestedTextSize === "function" && getSuggestedTextSize(issue) !== null;
                    case "contrast":
                      return typeof getSuggestedContrastColor === "function" && getSuggestedContrastColor(issue) !== null;
                    case "typography-style":
                    case "typography-check":
                      return issue.bestMatch !== null;
                    case "position":
                      return typeof getSuggestedPositionFix === "function" && getSuggestedPositionFix(issue) !== null;
                    case "duplicate":
                    case "component":
                      return typeof getSuggestedComponent === "function" && getSuggestedComponent(issue) !== null;
                    case "group":
                      return true; // Always has suggest fix button
                    case "empty-frame":
                      return typeof getSuggestedEmptyFrameFix === "function" && getSuggestedEmptyFrameFix(issue) !== null;
                    default:
                      return false;
                  }
                });
                
                if (issuesWithSuggestFix.length === 0) {
                  alert("No issues with suggest fix available");
                  return;
                }
                
                // Start sequential processing
                handleFixAllWithSuggestFix(type, issuesWithSuggestFix);
              };
            }
            
            groupEl.appendChild(groupHeader);

            // Create content wrapper - show if expanded
            const groupContent = document.createElement("div");
            groupContent.className = "issue-group-content";
            if (wasExpanded) {
              groupContent.style.display = "block";
              groupContent.style.opacity = "1";
            } else {
            groupContent.style.display = "none"; // Start hidden
            }

            if (issueCount === 0) {
              // Show "No issues" message for empty groups
              const emptyMsg = document.createElement("div");
              emptyMsg.className = "issue info";
              emptyMsg.style.opacity = "0.7";
              emptyMsg.innerHTML = `
                <div class="issue-header">
                  <div>
                    <span class="issue-type">✅ PASSED</span>
                    <div class="issue-body">No issues in this type.</div>
                  </div>
                </div>
              `;
              groupContent.appendChild(emptyMsg);
            } else {
              // Render issues
              grouped[type].forEach((issue, index) => {
              const issueNumber = index + 1;
              
              // Check if issue is ignored
              const isIgnored = ignoredIssues[issue.id] === true;
              if (isIgnored) {
                // Store original severity if not already stored
                if (!issue.originalSeverity) {
                  issue.originalSeverity = issue.severity;
                }
                // Change severity to info and add ignore tag
                issue.severity = "info";
                issue.ignored = true;
              }
              
              // Use addIssueEl for typography issues to get detailed rendering
              if (issue.type === "typography-check") {
                const tempDiv = document.createElement("div");
                groupContent.appendChild(tempDiv);
                
                // Call addIssueEl and move the created element into groupContent
                const issueEl = addIssueEl(issue);
                if (issueEl) {
                  // Add issue number
                  const numberSpan = document.createElement("span");
                  numberSpan.className = "issue-number";
                  numberSpan.textContent = `#${issueNumber}`;
                  numberSpan.style.cssText = "position: absolute; left: 8px; top: 8px; font-weight: bold; opacity: 0.5; font-size: 11px;";
                  issueEl.style.position = "relative";
                  issueEl.style.paddingLeft = "40px";
                  issueEl.insertBefore(numberSpan, issueEl.firstChild);
                  groupContent.replaceChild(issueEl, tempDiv);
                }
                return;
              }
              
              const issueEl = document.createElement("div");
              // Change class to info (green) if ignored
              const severityClass = isIgnored ? "info" : issue.severity;
              issueEl.className = `issue ${severityClass}`;
              issueEl.setAttribute("data-issue-id", issue.id);
              // Build issue body with additional info for contrast issues
              let issueBody = escapeHtml(issue.message);
              if (issue.type === "contrast") {
                const details = [];
                if (issue.textColor) {
                  details.push(`Text color: <code style="background: ${escapeHtml(issue.textColor)}; padding: 2px 6px; border-radius: 3px; color: ${getContrastTextColor(issue.textColor)};">${escapeHtml(issue.textColor)}</code> (${issue.textColorNode || issue.nodeName || "Unnamed"})`);
                }
                if (issue.backgroundColor) {
                  let bgLabel = "Background:";
                  let bgValue = "";
                  let bgNote = "";
                  
                  if (issue.isGradient && issue.gradientString) {
                    // Show full gradient string
                    bgLabel = `Background (gradient):`;
                    bgValue = `<code style="background: ${escapeHtml(issue.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${getContrastTextColor(issue.backgroundColor)}; font-family: 'SF Mono', Monaco, monospace; font-size: 11px;">${escapeHtml(issue.gradientString)}</code>`;
                    bgNote = " <span style='font-size: 11px; color: #999;'>(average: " + escapeHtml(issue.backgroundColor) + ")</span>";
                  } else {
                    // Show solid color
                    bgValue = `<code style="background: ${escapeHtml(issue.backgroundColor)}; padding: 2px 6px; border-radius: 3px; color: ${getContrastTextColor(issue.backgroundColor)};">${escapeHtml(issue.backgroundColor)}</code>`;
                  }
                  
                  if (issue.fromSibling) {
                    bgNote += " <span style='font-size: 11px; color: #3b82f6;'>(from sibling layer)</span>";
                  }
                  
                  details.push(`${bgLabel} ${bgValue}${bgNote} (${issue.backgroundColorNode || "Unknown"})`);
                }
                if (details.length > 0) {
                  issueBody += `<div style="margin-top: 8px; font-size: 12px; color: #666;">${details.join(" | ")}</div>`;
                }
              }
              
              issueEl.innerHTML = `
                <div class="issue-header">
                  <div>
                    <span class="issue-type">
                      <span class="issue-number">#${issueNumber}</span>
                      ${getSeverityIcon(isIgnored ? "info" : issue.severity)} ${isIgnored ? "INFO" : issue.severity.toUpperCase()}
                    </span>
                    <div class="issue-body">${issueBody}</div>
                    ${issue.nodeName ? `<div class="issue-node">Node: ${escapeHtml(issue.nodeName)}</div>` : ""}
                    ${(issue.type === "typography" || issue.type === "line-height") ? `<div style="margin-top: 8px; padding: 8px 12px; background: #fff3cd; border-left: 3px solid #ffc107; border-radius: 4px; font-size: 12px; color: #856404; line-height: 1.5;"><strong>Note:</strong> Check 'Typography Style Match' to resolve this issue.</div>` : ""}
                    ${issue.ignored ? `<div class="issue-ignored-tag" style="margin-top: 4px; padding: 4px 8px; background: #e3f2fd; color: #1976d2; border-radius: 4px; font-size: 11px; font-weight: 600; display: inline-block;">✓ Pass with ignore custom</div>` : ""}
                  </div>
                  <div class="issue-actions">
                    <button class="btn-select" data-id="${issue.id}">Select</button>
                    ${issue.type === "color" ? `
                      ${getSuggestedColor(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                      <button class="btn-fix" data-id="${issue.id}">Select Color</button>
                    ` : ""}
                    ${issue.type === "spacing" ? `
                      ${getSuggestedSpacing(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                      <button class="btn-fix" data-id="${issue.id}">Select Spacing</button>
                    ` : ""}
                    ${issue.type === "autolayout" ? `
                      ${getSuggestedAutolayout(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                      <button class="btn-fix" data-id="${issue.id}">Select</button>
                    ` : ""}
                    ${issue.type === "text-size-mobile" ? `
                      ${getSuggestedTextSize(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                      <button class="btn-fix" data-id="${issue.id}">Select Style</button>
                    ` : ""}
                    ${issue.type === "contrast" ? `
                      ${getSuggestedContrastColor(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                      <button class="btn-fix" data-id="${issue.id}">Select Color</button>
                      <button class="btn-ignore" data-id="${issue.id}" ${issue.ignored ? 'style="background: #28a745; border-color: #28a745;"' : ''}>${issue.ignored ? 'Ignored' : 'Ignore'}</button>
                    ` : ""}
                    ${issue.type === "typography-style" ? `
                      ${issue.bestMatch ? `
                        <button class="btn-suggest-fix" data-id="${issue.id}" data-style-name="${escapeHtml(issue.bestMatch.name)}">Suggest Fix now</button>
                      ` : ""}
                      <button class="btn-fix" data-id="${issue.id}">Select Style</button>
                      <button class="btn-create-style" data-id="${issue.id}" data-issue-type="${issue.type}">Create Style</button>
                    ` : ""}
                    ${issue.type === "position" ? `
                      ${getSuggestedPositionFix(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                      <button class="btn-remove-layer" data-id="${issue.id}">Remove Layer</button>
                    ` : ""}
                    ${issue.type === "duplicate" ? `
                      ${getSuggestedComponent(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                      <button class="btn-select-component" data-id="${issue.id}">Select Component</button>
                      <button class="btn-create-component" data-id="${issue.id}">Create New Component</button>
                    ` : ""}
                    ${issue.type === "component" ? `
                      ${getSuggestedComponent(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                      <button class="btn-select-component" data-id="${issue.id}">Select Component</button>
                      <button class="btn-create-component" data-id="${issue.id}">Create New Component</button>
                    ` : ""}
                    ${issue.type === "group" ? `
                      <button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>
                    ` : ""}
                    ${issue.type === "naming" ? `
                      <button class="btn-rename" data-id="${issue.id}">Rename</button>
                    ` : ""}
                    ${issue.type === "empty-frame" ? `
                      ${getSuggestedEmptyFrameFix(issue) ? `<button class="btn-suggest-fix" data-id="${issue.id}">Suggest Fix now</button>` : ""}
                    ` : ""}
                  </div>
                </div>
              `;
              groupContent.appendChild(issueEl);
              
              // Store issue data on element for later access
              issueEl.setAttribute("data-issue-id", issue.id);
              issueEl.setAttribute("data-issue-type", issue.type);
              
              const btn = issueEl.querySelector("button.btn-select");
              if (btn) {
                btn.onclick = () => {
                  parent.postMessage({ pluginMessage: { type: "select-node", id: issue.id } }, "*");
                };
              }
              
              const btnFix = issueEl.querySelector("button.btn-fix");
              if (btnFix) {
                if (issue.type === "color") {
                  btnFix.onclick = () => {
                    handleFixColorIssue(issue);
                  };
                } else if (issue.type === "spacing") {
                  btnFix.onclick = () => {
                    handleFixSpacingIssue(issue);
                  };
                } else if (issue.type === "text-size-mobile") {
                  btnFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Text Size Fix button clicked", issue);
                    if (typeof handleFixTextSizeIssue === "function") {
                      handleFixTextSizeIssue(issue);
                    } else {
                      console.error("handleFixTextSizeIssue is not a function");
                      alert("Error: handleFixTextSizeIssue function not found");
                    }
                  };
                } else if (issue.type === "contrast") {
                  btnFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Contrast Fix button clicked", issue);
                    if (typeof handleFixContrastIssue === "function") {
                      handleFixContrastIssue(issue);
                    } else {
                      console.error("handleFixContrastIssue is not a function");
                      alert("Error: handleFixContrastIssue function not found");
                    }
                  };
                } else {
                  btnFix.onclick = () => {
                    handleFixIssue(issue);
                  };
                }
              }
              
              // Handle Suggest Fix button
              const btnSuggestFix = issueEl.querySelector("button.btn-suggest-fix");
              if (btnSuggestFix) {
                if (issue.type === "color") {
                  btnSuggestFix.onclick = () => {
                    handleSuggestFixColor(issue);
                  };
                } else if (issue.type === "spacing") {
                  btnSuggestFix.onclick = () => {
                    handleSuggestFixSpacing(issue);
                  };
                } else if (issue.type === "autolayout") {
                  btnSuggestFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Autolayout Suggest Fix button clicked", issue);
                    if (typeof handleSuggestFixAutolayout === "function") {
                      handleSuggestFixAutolayout(issue);
                    } else {
                      console.error("handleSuggestFixAutolayout is not a function");
                      alert("Error: handleSuggestFixAutolayout function not found");
                    }
                  };
                } else if (issue.type === "text-size-mobile") {
                  btnSuggestFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Text Size Suggest Fix button clicked", issue);
                    if (typeof handleSuggestFixTextSize === "function") {
                      handleSuggestFixTextSize(issue);
                    } else {
                      console.error("handleSuggestFixTextSize is not a function");
                      alert("Error: handleSuggestFixTextSize function not found");
                    }
                  };
                } else if (issue.type === "position") {
                  btnSuggestFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Position Suggest Fix button clicked", issue);
                    if (typeof handleSuggestFixPosition === "function") {
                      handleSuggestFixPosition(issue);
                    } else {
                      console.error("handleSuggestFixPosition is not a function");
                      alert("Error: handleSuggestFixPosition function not found");
                    }
                  };
                } else if (issue.type === "duplicate" || issue.type === "component") {
                  btnSuggestFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Component Suggest Fix button clicked", issue);
                    if (typeof handleSuggestFixComponent === "function") {
                      handleSuggestFixComponent(issue);
                    } else {
                      console.error("handleSuggestFixComponent is not a function");
                      alert("Error: handleSuggestFixComponent function not found");
                    }
                  };
                } else if (issue.type === "contrast") {
                  btnSuggestFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Contrast Suggest Fix button clicked", issue);
                    if (typeof handleSuggestFixContrast === "function") {
                      handleSuggestFixContrast(issue);
                    } else {
                      console.error("handleSuggestFixContrast is not a function");
                      alert("Error: handleSuggestFixContrast function not found");
                    }
                  };
                } else if (issue.type === "group") {
                  btnSuggestFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Group Suggest Fix button clicked", issue);
                    if (typeof handleSuggestFixGroup === "function") {
                      handleSuggestFixGroup(issue);
                    } else {
                      console.error("handleSuggestFixGroup is not a function");
                      alert("Error: handleSuggestFixGroup function not found");
                    }
                  };
                } else if (issue.type === "empty-frame") {
                  btnSuggestFix.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Empty Frame Suggest Fix button clicked", issue);
                    if (typeof handleSuggestFixEmptyFrame === "function") {
                      handleSuggestFixEmptyFrame(issue);
                    } else {
                      console.error("handleSuggestFixEmptyFrame is not a function");
                      alert("Error: handleSuggestFixEmptyFrame function not found");
                    }
                  };
                }
              }
              
              // Handle Select Component button for duplicate and component
              const btnSelectComponent = issueEl.querySelector("button.btn-select-component");
              if (btnSelectComponent && (issue.type === "duplicate" || issue.type === "component")) {
                (function(issueData) {
                  btnSelectComponent.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Select Component button clicked", issueData);
                    if (typeof handleSelectComponent === "function") {
                      handleSelectComponent(issueData);
                    } else {
                      console.error("handleSelectComponent is not a function");
                      alert("Error: handleSelectComponent function not found");
                    }
                  };
                })(issue);
              }
              
              // Handle Create Component button for duplicate and component
              const btnCreateComponent = issueEl.querySelector("button.btn-create-component");
              if (btnCreateComponent && (issue.type === "duplicate" || issue.type === "component")) {
                (function(issueData) {
                  btnCreateComponent.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Create Component button clicked", issueData);
                    if (typeof handleCreateComponent === "function") {
                      handleCreateComponent(issueData);
                    } else {
                      console.error("handleCreateComponent is not a function");
                      alert("Error: handleCreateComponent function not found");
                    }
                  };
                })(issue);
              }
              
              // Handle Rename button for naming issues
              const btnRename = issueEl.querySelector("button.btn-rename");
              if (btnRename && issue.type === "naming") {
                (function(issueData) {
                  btnRename.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Rename button clicked", issueData);
                    if (typeof handleRenameNode === "function") {
                      handleRenameNode(issueData);
                    } else {
                      console.error("handleRenameNode is not a function");
                      alert("Error: handleRenameNode function not found");
                    }
                  };
                })(issue);
              }
              
              // Handle Remove Layer button for position
              const btnRemoveLayer = issueEl.querySelector("button.btn-remove-layer");
              if (btnRemoveLayer && issue.type === "position") {
                (function(issueData) {
                  btnRemoveLayer.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Remove Layer button clicked", issueData);
                    if (typeof handleRemovePositionLayer === "function") {
                      handleRemovePositionLayer(issueData);
                    } else {
                      console.error("handleRemovePositionLayer is not a function");
                      alert("Error: handleRemovePositionLayer function not found");
                    }
                  };
                })(issue);
              }
              
              // Handle Ignore button for contrast
              const btnIgnore = issueEl.querySelector("button.btn-ignore");
              if (btnIgnore && issue.type === "contrast") {
                // Ensure button is not disabled
                btnIgnore.removeAttribute("disabled");
                btnIgnore.onclick = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Ignore button clicked", issue);
                  try {
                    if (typeof handleIgnoreIssue === "function") {
                      handleIgnoreIssue(issue);
                    } else {
                      console.error("handleIgnoreIssue is not a function");
                      alert("Error: handleIgnoreIssue function not found");
                    }
                  } catch (error) {
                    console.error("Error handling ignore:", error);
                    alert(`Error: ${error.message}`);
                  }
                };
              }
              
              // Handle Create Style button for typography-style issues
              if (issue.type === "typography-style") {
                const btnCreateStyle = issueEl.querySelector("button.btn-create-style");
                if (btnCreateStyle) {
                  console.log("Attaching create style handler to button", { issueId: issue.id, issueType: issue.type, nodeName: issue.nodeName });
                  // Create a closure to capture the issue
                  (function(issueData) {
                    btnCreateStyle.onclick = (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Create Style button clicked", issueData);
                      if (typeof handleCreateTextStyle === "function") {
                        handleCreateTextStyle(issueData);
                      } else {
                        console.error("handleCreateTextStyle is not a function");
                        alert("Error: handleCreateTextStyle function not found");
                      }
                    };
                  })(issue);
                } else {
                  console.error("Create Style button not found in DOM", { 
                    issueId: issue.id, 
                    issueType: issue.type, 
                    hasIssueEl: !!issueEl,
                    innerHTML: issueEl.innerHTML.substring(0, 200)
                  });
                }
                
                // Handle Suggest Fix button (for typography-style)
                const btnSuggestFix = issueEl.querySelector("button.btn-suggest-fix");
                if (btnSuggestFix && issue.bestMatch && issue.type === "typography-style") {
                  (function(issueData) {
                    btnSuggestFix.onclick = (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const styleName = btnSuggestFix.getAttribute("data-style-name");
                      handleApplyTypographyStyle(issueData, styleName);
                    };
                  })(issue);
                }
                
                // Handle Suggest Fix button (for typography-check)
                if (btnSuggestFix && issue.bestMatch && issue.type === "typography-check") {
                  (function(issueData) {
                    btnSuggestFix.onclick = (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Apply bestMatch style directly
                      handleApplyTypographyStyle(issueData, issueData.bestMatch.name);
                    };
                  })(issue);
                }
                
                // Handle Select Style button for typography-style (show popup)
                const btnFix = issueEl.querySelector("button.btn-fix");
                if (btnFix && issue.type === "typography-style") {
                  (function(issueData) {
                    btnFix.onclick = (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      // Request text styles from Figma and show popup
                      parent.postMessage({
                        pluginMessage: {
                          type: "get-figma-text-styles",
                          issueId: issueData.id
                        }
                      }, "*");
                      // Store issue for later use
                      window.pendingTypographyStyleIssue = issueData;
                    };
                  })(issue);
                }
                
                // Handle Style Dropdown (for backward compatibility - old dropdown code)
                const btnStyleDropdown = issueEl.querySelector("button.btn-style-dropdown");
                const dropdownMenu = issueEl.querySelector(".style-dropdown-menu");
                if (btnStyleDropdown && dropdownMenu) {
                  let stylesLoaded = false;
                  
                  // Toggle dropdown
                  btnStyleDropdown.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const isVisible = dropdownMenu.style.display !== "none";
                    
                    // Close all other dropdowns
                    document.querySelectorAll(".style-dropdown-menu").forEach(menu => {
                      if (menu !== dropdownMenu) {
                        menu.style.display = "none";
                      }
                    });
                    
                    if (!isVisible) {
                      // Open dropdown
                      dropdownMenu.style.display = "block";
                      
                      // Load styles if not loaded yet
                      if (!stylesLoaded) {
                        dropdownMenu.innerHTML = '<div style="padding: 8px 12px; color: #999; font-size: 12px; text-align: center;">Loading...</div>';
                        
                        // Request text styles from Figma
                        parent.postMessage({
                          pluginMessage: {
                            type: "get-figma-text-styles",
                            issueId: issue.id
                          }
                        }, "*");
                      }
                    } else {
                      dropdownMenu.style.display = "none";
                    }
                  };
                  
                  // Close dropdown when clicking outside
                  document.addEventListener("click", function closeDropdown(e) {
                    if (!issueEl.contains(e.target)) {
                      dropdownMenu.style.display = "none";
                    }
                  });
                }
              }
              });
            }

            groupEl.appendChild(groupContent);
            resultsIssues.appendChild(groupEl);
          }

          if (!skipSave) {
            // Save both reports together
            saveLastReport({
              issues,
              issuesTimestamp: timestamp,
              tokens: currentReportData.tokens,
              tokensTimestamp: currentReportData.tokensTimestamp,
              lastActiveTab: "issues",
              scanMode: currentReportData.scanMode || null,
              context: currentReportData.context || null
            });
          }
        }

        function filterAndSearchTokens(tokens) {
          console.log("filterAndSearchTokens called", { 
            hasTokens: !!tokens, 
            currentColorTypeFilter, 
            currentSearch 
          });
          if (!tokens) return null;

          const filtered = {};
          let hasMatches = false;
          
          for (const [key, values] of Object.entries(tokens)) {
            let filteredValues = values || [];
            console.log(`Processing ${key}, initial count:`, filteredValues.length);

            // Filter by color type (for colors and gradients)
            if ((key === "colors" || key === "gradients") && currentColorTypeFilter !== "all") {
              filteredValues = filteredValues.filter(token => {
                const colorType = token.colorType || "";
                return colorType.toLowerCase().includes(currentColorTypeFilter.toLowerCase());
              });
              console.log(`After color type filter (${currentColorTypeFilter}):`, filteredValues.length);
            }

            // Search - search in all relevant fields and mark match source
            if (currentSearch.trim()) {
              const searchLower = currentSearch.toLowerCase();
              filteredValues = filteredValues.map(token => {
                const value = String(token.value || "").toLowerCase();
                const nodeNames = (token.nodes || []).map(n => n.name || "").join(" ").toLowerCase();
                const colorType = (token.colorType || "").toLowerCase();
                
                // Check where the match occurs
                const valueMatch = value.includes(searchLower);
                const nodeNameMatch = nodeNames.includes(searchLower);
                const colorTypeMatch = colorType.includes(searchLower);
                
                // If matches, add matchedBy field to indicate why it matched
                if (valueMatch || nodeNameMatch || colorTypeMatch) {
                  const matchedBy = [];
                  if (valueMatch) matchedBy.push("value");
                  if (nodeNameMatch) matchedBy.push("nodeName");
                  if (colorTypeMatch) matchedBy.push("colorType");
                  
                  return {
                    ...token,
                    _matchedBy: matchedBy,
                    _matchedNodeNames: nodeNameMatch ? (token.nodes || []).filter(n => 
                      (n.name || "").toLowerCase().includes(searchLower)
                    ).map(n => n.name) : []
                  };
                }
                return null;
              }).filter(token => token !== null);
              console.log(`After search filter (${key}):`, filteredValues.length);
            }

            if (filteredValues.length > 0) {
              hasMatches = true;
            }

            filtered[key] = filteredValues;
          }

          console.log("Final filtered tokens keys:", Object.keys(filtered));
          return { tokens: filtered, hasMatches };
        }

        function replaceSpacingScaleWithTokens(tokens) {
          const input = document.getElementById("spacing-scale");
          if (!input) return;
          const list = (tokens && Array.isArray(tokens.spacing)) ? tokens.spacing : [];
          const values = list
            .map(t => {
              const num = parseInt(String(t && t.value !== undefined ? t.value : "").trim(), 10);
              // Always use absolute value (convert negative to positive)
              return isNaN(num) ? null : Math.abs(num);
            })
            .filter(n => n !== null);

          if (!values.length) return;
          // Remove duplicates and sort ascending
          const next = Array.from(new Set(values)).sort((a, b) => a - b);
          input.value = next.join(", ");

          // Visual feedback
          try {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          } catch (e) {
            // ignore
          }
        }

        function renderTokens(tokens, resetFilters = false, options = {}) {
          const { skipSave = false, restoreTimestamp = null } = options;
          
          // Switch to tokens tab and update badge
          switchToTab("tokens");
          let totalTokensCount = Object.values(tokens || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
          document.getElementById("tokens-count").textContent = totalTokensCount;
          
          // Store report data
          const isNewData = currentReportData.tokens !== tokens;
          // Don't clear issues - keep it
          // currentReportData.issues = null;
          currentReportData.tokens = tokens;
          const timestamp = restoreTimestamp || new Date().toISOString();
          currentReportData.tokensTimestamp = timestamp;
          isViewingTokens = true;
          
          // Only reset filters if this is new data or explicitly requested
          if (resetFilters || isNewData) {
            console.log("Resetting filters for new token data");
            currentFilter = "all";
            currentColorTypeFilter = "all";
            if (searchInput) {
              searchInput.value = "";
            }
            currentSearch = "";
            if (btnClearSearch) {
              btnClearSearch.style.display = "none";
            }
            if (filterButtons && filterButtons.length > 0) {
              filterButtons.forEach(btn => {
                btn.classList.remove("active");
                if (btn.getAttribute("data-filter") === "all") {
                  btn.classList.add("active");
                }
              });
            }
            if (colorTypeSelect) {
              colorTypeSelect.value = "all";
            }
          }
          
          // Show filter controls
          const filterControls = document.getElementById("filter-controls");
          const colorTypeFilter = document.getElementById("color-type-filter");
          const filterButtonsContainer = document.getElementById("filter-buttons");
          filterControls.style.display = tokens && Object.keys(tokens).length > 0 ? "flex" : "none";
          colorTypeFilter.style.display = (tokens && (tokens.colors || tokens.gradients)) ? "block" : "none";
          filterButtonsContainer.style.display = "none"; // Hide severity filter for tokens
          
          const exportGroup = document.getElementById("export-group");
          exportGroup.style.display = tokens && Object.keys(tokens).length > 0 ? "flex" : "none";

          // Filter tokens - use current filter/search values
          console.log("About to filter tokens with:", { currentColorTypeFilter, currentSearch });
          const filterResult = filterAndSearchTokens(tokens);
          
          clearResults("tokens");

          if (!tokens || Object.keys(tokens).length === 0) {
            resultsTokens.innerHTML = `
              <div class="empty-state">
                <div class="icon">📋</div>
                <p>No design tokens found</p>
              </div>
            `;
            return;
          }

          if (!filterResult) {
            resultsTokens.innerHTML = `
              <div class="empty-state">
                <div class="icon">🔍</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;
            return;
          }

          const filteredTokens = filterResult.tokens || {};
          const hasTokenMatches = filterResult.hasMatches;
          const isSearchActive = currentSearch.trim() || currentColorTypeFilter !== "all";

          if (isSearchActive && !hasTokenMatches) {
            resultsTokens.innerHTML = `
              <div class="empty-state">
                <div class="icon">🔍</div>
                <p><strong>No results found</strong></p>
                <p style="margin-top: 8px; font-size: 12px;">Try changing the filter or search keyword.</p>
              </div>
            `;
            return;
          }

            const tokenGroups = {
              colors: { icon: "🎨", label: "Colors", values: filteredTokens.colors || [] },
              gradients: { icon: "🌈", label: "Gradients", values: filteredTokens.gradients || [] },
              spacing: { icon: "↔️", label: "Spacing (px)", values: filteredTokens.spacing || [] },
              borderRadius: { icon: "⭕", label: "Border Radius", values: filteredTokens.borderRadius || [] },
              fontWeight: { icon: "💪", label: "Font Weight", values: filteredTokens.fontWeight || [] },
              lineHeight: { icon: "📏", label: "Line Height (%)", values: filteredTokens.lineHeight || [] },
              fontSize: { icon: "📝", label: "Font Size", values: filteredTokens.fontSize || [] },
              fontFamily: { icon: "🔤", label: "Font Family", values: filteredTokens.fontFamily || [] }
            };

          // Results header
          const header = document.createElement("div");
          header.className = "results-header";
          const totalTokens = Object.values(tokenGroups).reduce((sum, group) => sum + group.values.length, 0);
          header.innerHTML = `
            <h3>Design Tokens</h3>
            <div class="results-stats">
              <span class="stat">${totalTokens} Tokens</span>
            </div>
          `;
          resultsTokens.appendChild(header);

          // Render token groups
          for (const [key, group] of Object.entries(tokenGroups)) {
            const groupEl = document.createElement("div");
            groupEl.className = "issue-group collapsed"; // Default collapsed
            
            const groupHeader = document.createElement("div");
            groupHeader.className = "issue-group-header";
            groupHeader.innerHTML = `
              <div class="issue-group-header-left">
                <button class="issue-group-toggle" type="button">
                  <span class="issue-group-toggle-icon">▶</span>
                </button>
                <h4>${group.icon} ${group.label}</h4>
                <span class="badge">${group.values.length}</span>
              </div>
            `;
            
            // Create content wrapper - start hidden
            const groupContent = document.createElement("div");
            groupContent.className = "issue-group-content";
            groupContent.style.display = "none";

            // Add click handler for collapse/expand
            const toggleBtn = groupHeader.querySelector(".issue-group-toggle");
            const toggleCollapse = () => {
              const isCollapsed = groupEl.classList.contains("collapsed");
              if (isCollapsed) {
                groupEl.classList.remove("collapsed");
                groupContent.style.display = "block";
                setTimeout(() => {
                  groupContent.style.opacity = "1";
                }, 10);
              } else {
                groupContent.style.opacity = "0";
                setTimeout(() => {
                  groupEl.classList.add("collapsed");
                  groupContent.style.display = "none";
                }, 200);
              }
            };
            
            toggleBtn.onclick = (e) => {
              e.stopPropagation();
              toggleCollapse();
            };
            
            groupHeader.onclick = (e) => {
              if (e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
                toggleCollapse();
              }
            };
            
            groupEl.appendChild(groupHeader);

            const hasValues = Array.isArray(group.values) && group.values.length > 0;

            if (hasValues) {
              const tokenList = document.createElement("div");
              tokenList.className = "token-list";

              group.values.forEach((token, idx) => {
              const tokenNumber = idx + 1;
              const tokenEl = document.createElement("div");
              tokenEl.className = "token-item";
              
              // token is now an object: {value, nodes: [{id, name}], colorType}
              const tokenValue = token.value;
              const nodes = token.nodes || [];
              const firstNode = nodes.length > 0 ? nodes[0] : null;
              const nodeCount = (typeof token.totalNodes === "number") ? token.totalNodes : nodes.length;
              const colorType = token.colorType || null;
              
              let valueHtml = "";
              // Special handling for colors
              if (key === "colors") {
                const colorTypeBadge = colorType ? `<span class="token-color-type">${escapeHtml(colorType)}</span>` : "";
                valueHtml = `
                  <span class="token-number">#${tokenNumber}</span>
                  <span class="token-color-preview" style="background-color: ${escapeHtml(tokenValue)}"></span>
                  <code>${escapeHtml(tokenValue)}</code>
                  ${colorTypeBadge}
                `;
              } else if (key === "gradients") {
                const colorTypeBadge = colorType ? `<span class="token-color-type">${escapeHtml(colorType)}</span>` : "";
                valueHtml = `
                  <span class="token-number">#${tokenNumber}</span>
                  <span class="token-gradient-preview" style="background: ${escapeHtml(tokenValue)}"></span>
                  <code>${escapeHtml(tokenValue)}</code>
                  ${colorTypeBadge}
                `;
              } else {
                valueHtml = `<span class="token-number">#${tokenNumber}</span><code>${escapeHtml(String(tokenValue))}</code>`;
              }
              
              // Check if this token matched by node name in search
              const matchedBy = token._matchedBy || [];
              const matchedNodeNames = token._matchedNodeNames || [];
              const isMatchedByNodeName = matchedBy.includes("nodeName");
              
              // Show matched node names if search matched by node name
              let nodeNameDisplay = "";
              if (firstNode && firstNode.name) {
                if (isMatchedByNodeName && matchedNodeNames.length > 0) {
                  // Highlight matched node names
                  const matchedNamesHtml = matchedNodeNames.map(name => 
                    `<span class="token-matched-node">${escapeHtml(name)}</span>`
                  ).join(", ");
                  nodeNameDisplay = `<div class="token-node-name token-matched-by-name">
                    <span class="match-indicator">🔍 Matched in:</span> ${matchedNamesHtml}
                  </div>`;
                } else {
                  nodeNameDisplay = `<div class="token-node-name">Node: ${escapeHtml(firstNode.name)}</div>`;
                }
              }

              // Extra note for Font Weight: show font-family usage breakdown
              let noteHtml = "";
              if (key === "fontWeight") {
                const fontFamilies = Array.isArray(token.fontFamilies) ? token.fontFamilies : null;
                let list = fontFamilies;
                if (!list) {
                  // Fallback (older data): compute from nodes
                  const counts = {};
                  nodes.forEach(n => {
                    const fam = (n && n.fontFamily) ? String(n.fontFamily) : "Unknown";
                    counts[fam] = (counts[fam] || 0) + 1;
                  });
                  list = Object.entries(counts)
                    .map(([family, count]) => ({ family, count }))
                    .sort((a, b) => (b.count - a.count) || a.family.localeCompare(b.family));
                }
                if (Array.isArray(list) && list.length > 0) {
                  const items = list
                    .map(x => `<li><code>${escapeHtml(x.family)}</code> (${x.count})</li>`)
                    .join("");
                  noteHtml = `
                    <div class="token-note">
                      <div class="token-note-label">Font-family:</div>
                      <ul class="token-note-list">${items}</ul>
                    </div>
                  `;
                }
              }
              
              tokenEl.innerHTML = `
                <div class="token-item-row">
                  <div class="token-value">
                    ${valueHtml}
                  </div>
                  ${firstNode ? `
                    <div class="token-actions">
                      <button class="btn-select" data-id="${firstNode.id}">Select</button>
                      ${nodeCount > 1 ? `<span class="token-node-count">(${nodeCount})</span>` : ""}
                    </div>
                  ` : ""}
                </div>
                ${nodeNameDisplay}
                ${noteHtml}
              `;
              
              // Add click handler for Select button
              const btn = tokenEl.querySelector("button.btn-select");
              if (btn) {
                btn.onclick = () => {
                  parent.postMessage({ pluginMessage: { type: "select-node", id: firstNode.id } }, "*");
                };
              }

                tokenList.appendChild(tokenEl);
              });

              groupContent.appendChild(tokenList);
            } else {
              const emptyMsg = document.createElement("div");
              emptyMsg.className = "token-empty-message";
              emptyMsg.textContent = "No tokens in this group.";
              groupContent.appendChild(emptyMsg);
            }
            groupEl.appendChild(groupContent);
            resultsTokens.appendChild(groupEl);
          }

          if (!skipSave) {
            // Save both reports together
            saveLastReport({
              issues: currentReportData.issues,
              issuesTimestamp: currentReportData.timestamp,
              tokens,
              tokensTimestamp: timestamp,
              lastActiveTab: "tokens",
              scanMode: currentReportData.scanMode || null,
              context: currentReportData.context || null
            });
          }
        }

  // Helper function to show validation error
  function showValidationError(message) {
    const validationError = document.getElementById("validation-error");
    const validationErrorMessage = document.getElementById("validation-error-message");
    const btnCloseValidationError = document.getElementById("btn-close-validation-error");
    
    if (validationError && validationErrorMessage) {
      validationErrorMessage.textContent = message;
      validationError.style.display = "block";
      
      // Hide scan progress and cancel button
      btnScan.style.display = "block";
      btnCancelScan.style.display = "none";
      scanProgress.style.display = "none";
      btnScan.disabled = false;
      btnExtractTokens.disabled = false;
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (validationError.style.display === "block") {
          validationError.style.display = "none";
        }
      }, 10000);
      
      // Close button handler
      if (btnCloseValidationError) {
        btnCloseValidationError.onclick = () => {
          validationError.style.display = "none";
        };
      }
    }
  }

  btnScan.onclick = () => {
    console.log("btnScan clicked");
    try {
      // Hide validation error if visible
      const validationError = document.getElementById("validation-error");
      if (validationError) {
        validationError.style.display = "none";
      }
      
      // Show cancel button and progress, hide scan button
      btnScan.style.display = "none";
      btnCancelScan.style.display = "block";
      scanProgress.style.display = "block";
      // Force reset progress bar
      scanProgressBar.style.transition = "none";
      scanProgressBar.style.width = "0%";
      scanProgressText.textContent = "0%";
      // Re-enable transition after reset
      setTimeout(() => {
        scanProgressBar.style.transition = "width 0.3s";
      }, 10);
      
      // Don't clear - keep both tabs' content
      // clearResults();
      const scope = document.querySelector('input[name="scope"]:checked')?.value || "page";
      const spacingScaleInput = document.getElementById("spacing-scale");
      const spacingThresholdInput = document.getElementById("spacing-threshold");
      const colorScaleInput = document.getElementById("color-scale");
      const fontSizeScaleInput = document.getElementById("font-size-scale");
      const fontSizeThresholdInput = document.getElementById("font-size-threshold");
      const lineHeightScaleInput = document.getElementById("line-height-scale");
      const lineHeightThresholdInput = document.getElementById("line-height-threshold");
      const lineHeightBaselineThresholdInput = document.getElementById("line-height-baseline-threshold");
      
      let spacingScaleValue = spacingScaleInput ? spacingScaleInput.value.trim() : "";
      const spacingThreshold = spacingThresholdInput ? parseInt(spacingThresholdInput.value, 10) : 100;
      let colorScaleValue = colorScaleInput ? colorScaleInput.value.trim() : "";
      let fontSizeScaleValue = fontSizeScaleInput ? fontSizeScaleInput.value.trim() : "";
      const fontSizeThreshold = fontSizeThresholdInput ? parseInt(fontSizeThresholdInput.value, 10) : 100;
      let lineHeightScaleValue = lineHeightScaleInput ? lineHeightScaleInput.value.trim() : "";
      const lineHeightThreshold = lineHeightThresholdInput ? parseInt(lineHeightThresholdInput.value, 10) : 300;
      const lineHeightBaselineThreshold = lineHeightBaselineThresholdInput ? parseInt(lineHeightBaselineThresholdInput.value, 10) : 120;
      
      // Validate spacing guidelines format if not empty
      if (spacingScaleValue) {
        const formatRegex = /^\d+(\s*,\s*\d+)*$/;
        if (!formatRegex.test(spacingScaleValue)) {
          showValidationError("Spacing guidelines format is incorrect. Please enter the numbers separated by commas (e.g. 4, 8, 12, 16)");
          return;
        }
      }
      
      // Validate color format if not empty (allow hex only)
      if (colorScaleValue) {
        // Split by comma and validate each color
        const colors = colorScaleValue.split(",").map(c => c.trim()).filter(c => c);
        const colorRegex = /^#[0-9a-fA-F]{3,8}$/;
        const invalidColors = colors.filter(c => !colorRegex.test(c));
        if (invalidColors.length > 0) {
          showValidationError(`Color format is incorrect. Invalid colors: ${invalidColors.join(", ")}. Please use hex format only (e.g., #000000, #FFFFFF).`);
          return;
        }
      }
      
      // Validate font-size scale format if not empty
      if (fontSizeScaleValue) {
        const formatRegex = /^\d+(\s*,\s*\d+)*$/;
        if (!formatRegex.test(fontSizeScaleValue)) {
          showValidationError("Font-size scale format is incorrect. Please enter the numbers separated by commas (e.g. 32, 24, 20, 18)");
          return;
        }
      }
      
      // Validate line-height scale format if not empty (allow "auto" keyword anywhere)
      if (lineHeightScaleValue) {
        // Split by comma and check each value
        const values = lineHeightScaleValue.split(",").map(v => v.trim()).filter(v => v);
        const isValid = values.every(v => {
          return v.toLowerCase() === "auto" || /^\d+$/.test(v);
        });
        
        if (!isValid || values.length === 0) {
          showValidationError('Line-height scale format is incorrect. Please enter "auto" and/or numbers separated by commas. "auto" can be placed anywhere (e.g. auto, 100, 120 or 100, auto, 150)');
          return;
        }
      }
      
      // Validate thresholds
      if (isNaN(spacingThreshold) || spacingThreshold < 0) {
        showValidationError("Spacing threshold must be a number >= 0");
        return;
      }
      
      if (isNaN(fontSizeThreshold) || fontSizeThreshold < 0) {
        showValidationError("Font-size threshold must be a number >= 0");
        return;
      }
      
      if (isNaN(lineHeightThreshold) || lineHeightThreshold < 0) {
        showValidationError("Line-height threshold must be a number >= 0");
        return;
      }
      
      if (isNaN(lineHeightBaselineThreshold) || lineHeightBaselineThreshold < 0) {
        showValidationError("Line-height baseline threshold must be a number >= 0");
        return;
      }
      
      // Don't save to history here - wait for actual results
      
      resultsIssues.innerHTML = `
        <div class="scanning">
          <div class="spinner"></div>
          <p>Scanning design... Please wait</p>
        </div>
      `;
      switchToTab("issues");
      btnScan.disabled = true;
      btnExtractTokens.disabled = true;
      currentReportData.scanMode = scope;
      
      // Save input values before scanning
      saveInputValues();
      
      // Get Typography settings
      const typographyRules = {
        checkStyle: document.getElementById("rule-typo-style")?.checked || false,
        checkFontFamily: document.getElementById("rule-font-family")?.checked || false,
        checkFontSize: document.getElementById("rule-font-size")?.checked || false,
        checkFontWeight: document.getElementById("rule-font-weight")?.checked || false,
        checkLineHeight: document.getElementById("rule-line-height")?.checked || false,
        checkLetterSpacing: document.getElementById("rule-letter-spacing")?.checked || false,
        checkWordSpacing: document.getElementById("rule-word-spacing")?.checked || false
      };
      
      parent.postMessage({ 
        pluginMessage: { 
          type: "scan", 
          mode: scope, 
          spacingScale: spacingScaleValue, 
          spacingThreshold: spacingThreshold,
          colorScale: colorScaleValue,
          fontSizeScale: fontSizeScaleValue,
          fontSizeThreshold: fontSizeThreshold,
          lineHeightScale: lineHeightScaleValue,
          lineHeightThreshold: lineHeightThreshold,
          lineHeightBaselineThreshold: lineHeightBaselineThreshold,
          typographyStyles: typographyStyles,
          typographyRules: typographyRules,
          ignoredIssues: ignoredIssues // Send ignored issues to backend
        } 
      }, "*");
      console.log("Message sent:", { type: "scan", mode: scope });
    } catch (error) {
      console.error("Error in btnScan.onclick:", error);
      resultsIssues.innerHTML = `<div class="error-message">Error: ${escapeHtml(error.message)}</div>`;
      switchToTab("issues");
      btnScan.disabled = false;
      btnExtractTokens.disabled = false;
    }
  };

  btnExtractTokens.onclick = () => {
    console.log("btnExtractTokens clicked");
    try {
      // Show cancel button and progress, hide extract button
      btnExtractTokens.style.display = "none";
      btnCancelScan.style.display = "block";
      scanProgress.style.display = "block";
      // Force reset progress bar
      scanProgressBar.style.transition = "none";
      scanProgressBar.style.width = "0%";
      scanProgressText.textContent = "0%";
      // Re-enable transition after reset
      setTimeout(() => {
        scanProgressBar.style.transition = "width 0.3s";
      }, 10);
      
      // Don't clear - keep both tabs' content
      // clearResults();
      const scope = document.querySelector('input[name="scope"]:checked')?.value || "page";

      // Don't save to history here - wait for actual results

      resultsTokens.innerHTML = `
        <div class="scanning">
          <div class="spinner"></div>
          <p>Extracting design tokens... Please wait</p>
        </div>
      `;
      switchToTab("tokens");
      btnScan.disabled = true;
      btnExtractTokens.disabled = true;
      currentReportData.scanMode = scope;
      parent.postMessage({ pluginMessage: { type: "extract-tokens", mode: scope } }, "*");
      console.log("Message sent:", { type: "extract-tokens", mode: scope });
    } catch (error) {
      console.error("Error in btnExtractTokens.onclick:", error);
      resultsTokens.innerHTML = `<div class="error-message">Error: ${escapeHtml(error.message)}</div>`;
      switchToTab("tokens");
      btnScan.disabled = false;
      btnExtractTokens.disabled = false;
    }
  };

  btnFillSpacingScale.onclick = () => {
    try {
      replaceSpacingScaleWithTokens(currentReportData.tokens);
    } catch (e) {
      console.error("Failed to fill spacing guidelines from tokens", e);
    }
  };

  // getColorBrightness is imported from ./utils/colorMath.js

  btnFillColorScale.onclick = () => {
    try {
      const tokens = currentReportData.tokens;
      if (!tokens || !Array.isArray(tokens.colors) || !tokens.colors.length) {
        alert("No color tokens found. Please run 'Extract Design Tokens' first.");
        return;
      }

      const input = document.getElementById("color-scale");
      if (!input) return;

      const list = tokens.colors || [];
      // Extract hex values and ensure uppercase for consistency
      const values = list
        .map(t => String(t && t.value !== undefined ? t.value : "").trim().toUpperCase())
        .filter(v => v && v.startsWith("#"));

      if (!values.length) return;
      
      // Remove duplicates and sort by brightness (dark to light: #000000 → #FFFFFF)
      const uniqueValues = Array.from(new Set(values)).sort((a, b) => {
        return getColorBrightness(a) - getColorBrightness(b);
      });
      input.value = uniqueValues.join(", ");

      // Render color preview after filling
      if (typeof renderColorPreview === "function") renderColorPreview();

      // Visual feedback
      try {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.error("Failed to fill color from tokens", e);
    }
  };

  // Extract Color Styles from Figma
  btnExtractColorStyles.onclick = () => {
    // Request color styles from Figma
    parent.postMessage({ pluginMessage: { type: "extract-color-styles" } }, "*");
  };

  const btnExtractColorVariables = document.getElementById("btn-extract-color-variables");
  if (btnExtractColorVariables) {
    btnExtractColorVariables.onclick = () => {
      // Request color variables from Figma
      parent.postMessage({ pluginMessage: { type: "extract-color-variables" } }, "*");
    };
  }

  btnFillFontSizeScale.onclick = () => {
    try {
      const tokens = currentReportData.tokens;
      if (!tokens || !Array.isArray(tokens.fontSize) || !tokens.fontSize.length) {
        alert("No font size tokens found. Please run 'Extract Design Tokens' first.");
        return;
      }

      const input = document.getElementById("font-size-scale");
      if (!input) return;

      // Extract unique font sizes and sort
      const values = tokens.fontSize
        .map(t => parseInt(String(t && t.value !== undefined ? t.value : "").trim(), 10))
        .filter(n => !isNaN(n));

      if (!values.length) return;

      const uniqueSorted = Array.from(new Set(values)).sort((a, b) => b - a); // Descending for font sizes
      input.value = uniqueSorted.join(", ");

      // Visual feedback
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    } catch (e) {
      console.error("Failed to fill font size from tokens", e);
    }
  };

  btnFillLineHeightScale.onclick = () => {
    try {
      const tokens = currentReportData.tokens;
      if (!tokens || !Array.isArray(tokens.lineHeight) || !tokens.lineHeight.length) {
        alert("No line height tokens found. Please run 'Extract Design Tokens' first.");
        return;
      }

      const input = document.getElementById("line-height-scale");
      if (!input) return;

      // Extract unique line heights and sort
      const values = [];
      tokens.lineHeight.forEach(t => {
        const value = String(t && t.value !== undefined ? t.value : "").trim();
        if (value === "auto") {
          values.push("auto");
        } else {
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            values.push(numValue);
          }
        }
      });

      if (!values.length) return;

      // Separate auto and numeric values
      const hasAuto = values.includes("auto");
      const numericValues = values.filter(v => v !== "auto");
      const uniqueSorted = Array.from(new Set(numericValues)).sort((a, b) => a - b); // Ascending

      // Combine: auto first, then sorted numeric
      const finalValues = hasAuto ? ["auto", ...uniqueSorted] : uniqueSorted;
      input.value = finalValues.join(", ");

      // Visual feedback
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    } catch (e) {
      console.error("Failed to fill line height from tokens", e);
    }
  };

  // Use Typography for Font Size
  btnFillFontSizeFromTypo.onclick = () => {
    try {
      if (!typographyStyles || !Array.isArray(typographyStyles) || typographyStyles.length === 0) {
        alert("No typography styles defined. Please add typography styles or extract from Figma first.");
        return;
      }

      const input = document.getElementById("font-size-scale");
      if (!input) return;

      // Extract unique font sizes from typography styles
      const values = typographyStyles
        .map(style => {
          const size = parseInt(String(style.fontSize || "").trim(), 10);
          return isNaN(size) ? null : size;
        })
        .filter(v => v !== null);

      if (!values.length) {
        alert("No valid font sizes found in typography styles.");
        return;
      }

      const uniqueSorted = Array.from(new Set(values)).sort((a, b) => b - a); // Descending for font sizes
      input.value = uniqueSorted.join(", ");
      
      // Save and visual feedback
      saveInputValues();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      
      console.log("Filled font size from typography:", uniqueSorted);
    } catch (e) {
      console.error("Failed to fill font size from typography", e);
    }
  };

  // Use Typography for Line Height
  btnFillLineHeightFromTypo.onclick = () => {
    try {
      if (!typographyStyles || !Array.isArray(typographyStyles) || typographyStyles.length === 0) {
        alert("No typography styles defined. Please add typography styles or extract from Figma first.");
        return;
      }

      const input = document.getElementById("line-height-scale");
      if (!input) return;

      // Extract unique line heights from typography styles
      const values = [];
      typographyStyles.forEach(style => {
        const lh = String(style.lineHeight || "").trim();
        if (lh === "auto") {
          values.push("auto");
        } else {
          // Handle both percentage (120%) and numeric (1.5)
          const numValue = parseFloat(lh.replace("%", ""));
          if (!isNaN(numValue)) {
            values.push(numValue);
          }
        }
      });

      if (!values.length) {
        alert("No valid line heights found in typography styles.");
        return;
      }

      // Separate auto and numeric values
      const hasAuto = values.includes("auto");
      const numericValues = values.filter(v => v !== "auto");
      const uniqueSorted = Array.from(new Set(numericValues)).sort((a, b) => a - b); // Ascending

      // Combine: auto first, then sorted numeric
      const finalValues = hasAuto ? ["auto", ...uniqueSorted] : uniqueSorted;
      input.value = finalValues.join(", ");
      
      // Save and visual feedback
      saveInputValues();
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      
      console.log("Filled line height from typography:", finalValues);
    } catch (e) {
      console.error("Failed to fill line height from typography", e);
    }
  };

  // Typography Panel Toggle
  const typographyPanel = document.getElementById("typography-panel");
  const typographyPanelHeader = document.getElementById("typography-panel-header");
  const typographyPanelToggle = document.getElementById("typography-panel-toggle");
  
  if (typographyPanelHeader && typographyPanel && typographyPanelToggle) {
    typographyPanelHeader.onclick = () => {
      const isCollapsed = typographyPanel.classList.contains("collapsed");
      typographyPanel.classList.toggle("collapsed");
      
      // Update icon
      const icon = typographyPanelToggle.querySelector(".issue-group-toggle-icon");
      if (icon) {
        icon.textContent = isCollapsed ? "▶" : "▶";
      }
    };
  }

  // Settings Panel Toggle
  const settingsPanel = document.getElementById("settings-panel");
  const settingsPanelHeader = document.getElementById("settings-panel-header");
  const settingsPanelToggle = document.getElementById("settings-panel-toggle");
  
  if (settingsPanelHeader && settingsPanel && settingsPanelToggle) {
    const toggleSettingsPanel = () => {
      const isCollapsed = settingsPanel.classList.contains("collapsed");
      settingsPanel.classList.toggle("collapsed");
      
      // Update icon
      const icon = settingsPanelToggle.querySelector(".issue-group-toggle-icon");
      if (icon) {
        icon.textContent = isCollapsed ? "▶" : "▶";
      }
    };
    
    // Handle click on header
    settingsPanelHeader.onclick = (e) => {
      // Don't toggle if clicking directly on the button (button handles its own click)
      if (e.target === settingsPanelToggle || settingsPanelToggle.contains(e.target)) {
        return;
      }
      toggleSettingsPanel();
    };
    
    // Handle click on toggle button
    settingsPanelToggle.onclick = (e) => {
      e.stopPropagation();
      toggleSettingsPanel();
    };
  }

  // Color Preview Panel Toggle
  function setupColorPreviewPanelToggle() {
    const colorPreviewPanel = document.getElementById("color-preview-panel");
    const colorPreviewPanelHeader = document.getElementById("color-preview-panel-header");
    const colorPreviewPanelToggle = document.getElementById("color-preview-panel-toggle");
    
    if (!colorPreviewPanel || !colorPreviewPanelHeader || !colorPreviewPanelToggle) {
      console.log("Color preview panel elements not found, retrying...");
      setTimeout(setupColorPreviewPanelToggle, 100);
      return;
    }
    
    console.log("Setting up color preview panel toggle");
    
    const toggleColorPreviewPanel = () => {
      const isCollapsed = colorPreviewPanel.classList.contains("collapsed");
      colorPreviewPanel.classList.toggle("collapsed");
      
      // Update icon
      const icon = colorPreviewPanelToggle.querySelector(".issue-group-toggle-icon");
      if (icon) {
        icon.textContent = isCollapsed ? "▶" : "▶";
      }
      console.log("Color preview panel toggled, isCollapsed:", !isCollapsed);
    };
    
    // Handle click on header
    colorPreviewPanelHeader.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Color preview panel header clicked");
      toggleColorPreviewPanel();
    };
    
    // Handle click on toggle button
    colorPreviewPanelToggle.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log("Color preview panel toggle button clicked");
      toggleColorPreviewPanel();
    };
  }
  
  // Setup after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupColorPreviewPanelToggle);
  } else {
    setupColorPreviewPanelToggle();
  }

  // Render Color Preview Swatches
  function renderColorPreview() {
    const colorInput = document.getElementById("color-scale");
    const colorPreview = document.getElementById("color-preview");
    
    if (!colorInput || !colorPreview) return;
    
    const value = colorInput.value.trim();
    colorPreview.innerHTML = "";
    
    if (!value) return;
    
    // Parse colors (split by comma)
    const colors = value.split(",").map(c => c.trim()).filter(c => c);
    
    colors.forEach((color, index) => {
      // Validate color format (basic hex or rgba)
      const isValidHex = /^#[0-9A-Fa-f]{3,8}$/.test(color);
      const isValidRgba = /^rgba?\(/.test(color);
      
      if (!isValidHex && !isValidRgba) return; // Skip invalid colors
      
      // Create color swatch container
      const swatchContainer = document.createElement("div");
      swatchContainer.className = "color-swatch-container";
      
      // Create color swatch
      const swatch = document.createElement("div");
      swatch.className = "color-swatch";
      swatch.style.background = color; // Only set the dynamic background color
      
      // Add close button
      const closeBtn = document.createElement("button");
      closeBtn.innerHTML = "×";
      closeBtn.className = "color-swatch-close";
      
      closeBtn.onclick = function(e) {
        e.stopPropagation();
        // Remove this color from input
        const allColors = colorInput.value.split(",").map(c => c.trim()).filter(c => c);
        const newColors = allColors.filter((c, i) => i !== index);
        colorInput.value = newColors.join(", ");
        
        // Re-render and save
        renderColorPreview();
        if (typeof saveInputValues === "function") saveInputValues();
      };
      
      // Add label below swatch with color name and value (always visible)
      const colorHex = color.toUpperCase();
      const colorName = colorNameMap[colorHex];
      
      const label = document.createElement("div");
      label.className = "color-swatch-label";
      
      // Show "Name (Hex)" if name exists, otherwise just "Hex"
      if (colorName) {
        label.innerHTML = `
          <div class="color-swatch-label-name">${escapeHtml(colorName)}</div>
          <div class="color-swatch-label-hex">${escapeHtml(colorHex)}</div>
        `;
      } else {
        label.innerHTML = `<div class="color-swatch-label-hex">${escapeHtml(colorHex)}</div>`;
      }
      
      swatch.appendChild(closeBtn);
      swatchContainer.appendChild(swatch);
      swatchContainer.appendChild(label);
      colorPreview.appendChild(swatchContainer);
    });
  }

  // Get active rules
  function getActiveRules() {
    return {
      fontFamily: document.getElementById("rule-font-family")?.checked || false,
      fontSize: document.getElementById("rule-font-size")?.checked || false,
      fontWeight: document.getElementById("rule-font-weight")?.checked || false,
      lineHeight: document.getElementById("rule-line-height")?.checked || false,
      letterSpacing: document.getElementById("rule-letter-spacing")?.checked || false,
      wordSpacing: document.getElementById("rule-word-spacing")?.checked || false
    };
  }

  // Render Typography Table
  function renderTypographyTable() {
    const tbody = document.getElementById("typography-table-body");
    const thead = document.querySelector("#typography-table thead tr");
    if (!tbody || !thead) return;

    const activeRules = getActiveRules();

    // Build table headers based on active rules (Actions first)
    let headers = '<th class="typography-table-actions">Actions</th>';
    headers += '<th class="typography-table-style-name" style="width: 120px;">Style Name</th>';
    if (activeRules.fontFamily) headers += '<th class="typography-table-font-family" style="width: 140px;">Font Family</th>';
    if (activeRules.fontSize) headers += '<th class="typography-table-font-size" style="width: 80px;">Size (px)</th>';
    if (activeRules.fontWeight) headers += '<th class="typography-table-font-weight" style="width: 100px;">Weight</th>';
    if (activeRules.lineHeight) headers += '<th class="typography-table-line-height" style="width: 100px;">Line Height</th>';
    if (activeRules.letterSpacing) headers += '<th class="typography-table-letter-spacing" style="width: 100px;">Letter Spacing</th>';
    if (activeRules.wordSpacing) headers += '<th class="typography-table-word-spacing" style="width: 100px;">Word Spacing</th>';
    thead.innerHTML = headers;

    if (typographyStyles.length === 0) {
      const colspanCount = Object.values(activeRules).filter(v => v).length + 2; // +2 for name and actions
      tbody.innerHTML = `
        <tr>
          <td colspan="${colspanCount}" class="typography-empty-message">
            No typography styles defined. Click "Add Typography Style" to create one.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = typographyStyles.map(style => {
      let row = `<tr data-id="${style.id}">`;
      
      // Actions column first
      row += `<td class="typography-table-actions">`;
      
      // Add select button if styleId exists
      if (style.styleId) {
        row += `<button class="btn-table-action" onclick="selectTypographyStyle('${style.styleId}')" title="Select layer in Figma" style="background: #0071e3; color: white;">👁</button>`;
      }
      
      row += `<button class="btn-table-action delete" onclick="deleteTypographyStyle(${style.id})" title="Delete">🗑</button>
        </td>`;
      
      // Style Name
      row += `<td><input type="text" value="${escapeHtml(style.name)}" data-field="name"></td>`;
      
      if (activeRules.fontFamily) {
        row += `<td><input type="text" value="${escapeHtml(style.fontFamily)}" data-field="fontFamily"></td>`;
      }
      
      if (activeRules.fontSize) {
        row += `<td><input type="number" value="${style.fontSize}" data-field="fontSize" min="1"></td>`;
      }
      
      if (activeRules.fontWeight) {
        row += `<td>
          <select data-field="fontWeight">
            <option value="Thin" ${style.fontWeight === "Thin" ? "selected" : ""}>Thin (100)</option>
            <option value="ExtraLight" ${style.fontWeight === "ExtraLight" ? "selected" : ""}>ExtraLight (200)</option>
            <option value="Light" ${style.fontWeight === "Light" ? "selected" : ""}>Light (300)</option>
            <option value="Regular" ${style.fontWeight === "Regular" ? "selected" : ""}>Regular (400)</option>
            <option value="Medium" ${style.fontWeight === "Medium" ? "selected" : ""}>Medium (500)</option>
            <option value="SemiBold" ${style.fontWeight === "SemiBold" ? "selected" : ""}>SemiBold (600)</option>
            <option value="Bold" ${style.fontWeight === "Bold" ? "selected" : ""}>Bold (700)</option>
            <option value="ExtraBold" ${style.fontWeight === "ExtraBold" ? "selected" : ""}>ExtraBold (800)</option>
            <option value="Black" ${style.fontWeight === "Black" ? "selected" : ""}>Black (900)</option>
          </select>
        </td>`;
      }
      
      if (activeRules.lineHeight) {
        row += `<td><input type="text" value="${escapeHtml(style.lineHeight)}" data-field="lineHeight" placeholder="120% or auto"></td>`;
      }
      
      if (activeRules.letterSpacing) {
        row += `<td><input type="text" value="${escapeHtml(style.letterSpacing || "0")}" data-field="letterSpacing" placeholder="0 or 0.5px"></td>`;
      }
      
      if (activeRules.wordSpacing) {
        row += `<td><input type="text" value="${escapeHtml(style.wordSpacing || "0")}" data-field="wordSpacing" placeholder="0"></td>`;
      }
      
      row += `</tr>`;
      
      return row;
    }).join("");

    // Add change listeners to auto-save
    tbody.querySelectorAll("input, select").forEach(input => {
      input.addEventListener("change", (e) => {
        const row = e.target.closest("tr");
        const id = parseInt(row.dataset.id);
        const field = e.target.dataset.field;
        const value = e.target.value;
        
        updateTypographyStyle(id, field, value);
      });
    });
  }

  // Add Typography Style
  window.addTypographyStyle = function() {
    const newStyle = {
      id: nextTypoStyleId++,
      name: "New Style",
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: "Regular",
      lineHeight: "150%",
      letterSpacing: "0",
      wordSpacing: "0"
    };
    typographyStyles.push(newStyle);
    renderTypographyTable();
    saveInputValues();
  };

  // Update Typography Style
  function updateTypographyStyle(id, field, value) {
    const style = typographyStyles.find(s => s.id === id);
    if (style) {
      if (field === "fontSize") {
        style[field] = parseInt(value) || 16;
      } else {
        style[field] = value;
      }
      saveInputValues();
    }
  }

  // Delete Typography Style
  window.deleteTypographyStyle = function(id) {
    if (!confirm("Delete this typography style?")) return;
    typographyStyles = typographyStyles.filter(s => s.id !== id);
    renderTypographyTable();
    saveInputValues();
  };

  window.selectTypographyStyle = function(styleId) {
    // Send message to backend to select the text style
    parent.postMessage({ pluginMessage: { type: "select-text-style", styleId: styleId } }, "*");
  };

  // Add button handler
  const btnAddTypoStyle = document.getElementById("btn-add-typo-style");
  if (btnAddTypoStyle) {
    btnAddTypoStyle.onclick = () => addTypographyStyle();
  }

  const btnExtractTypoDesktop = document.getElementById("btn-extract-typo-desktop");
  if (btnExtractTypoDesktop) {
    btnExtractTypoDesktop.onclick = () => {
      parent.postMessage({ pluginMessage: { type: "extract-typography-styles", mode: "desktop" } }, "*");
    };
  }

  const btnExtractTypoTablet = document.getElementById("btn-extract-typo-tablet");
  if (btnExtractTypoTablet) {
    btnExtractTypoTablet.onclick = () => {
      parent.postMessage({ pluginMessage: { type: "extract-typography-styles", mode: "tablet" } }, "*");
    };
  }

  const btnExtractTypoMobile = document.getElementById("btn-extract-typo-mobile");
  if (btnExtractTypoMobile) {
    btnExtractTypoMobile.onclick = () => {
      parent.postMessage({ pluginMessage: { type: "extract-typography-styles", mode: "mobile" } }, "*");
    };
  }

  const btnExtractTypoAll = document.getElementById("btn-extract-typo-all");
  if (btnExtractTypoAll) {
    btnExtractTypoAll.onclick = () => {
      parent.postMessage({ pluginMessage: { type: "extract-typography-styles", mode: "all" } }, "*");
    };
  }

  const btnResetTypoTable = document.getElementById("btn-reset-typo-table");
  if (btnResetTypoTable) {
    btnResetTypoTable.onclick = () => {
      if (confirm("⚠️ Reset typography table to default styles?\n\nThis will:\n• Clear all current styles\n• Restore default H1-H6 and Body styles\n\nThis action cannot be undone.")) {
        // Reset to default styles
        typographyStyles = [
          { id: 1, name: "H1", fontFamily: "Inter", fontSize: 48, fontWeight: "Bold", lineHeight: "120%", letterSpacing: "0", wordSpacing: "0" },
          { id: 2, name: "H2", fontFamily: "Inter", fontSize: 36, fontWeight: "Bold", lineHeight: "130%", letterSpacing: "0", wordSpacing: "0" },
          { id: 3, name: "H3", fontFamily: "Inter", fontSize: 30, fontWeight: "Semi Bold", lineHeight: "130%", letterSpacing: "0", wordSpacing: "0" },
          { id: 4, name: "H4", fontFamily: "Inter", fontSize: 24, fontWeight: "Semi Bold", lineHeight: "140%", letterSpacing: "0", wordSpacing: "0" },
          { id: 5, name: "H5", fontFamily: "Inter", fontSize: 20, fontWeight: "Semi Bold", lineHeight: "140%", letterSpacing: "0", wordSpacing: "0" },
          { id: 6, name: "H6", fontFamily: "Inter", fontSize: 16, fontWeight: "Semi Bold", lineHeight: "150%", letterSpacing: "0", wordSpacing: "0" },
          { id: 7, name: "Body", fontFamily: "Inter", fontSize: 14, fontWeight: "Regular", lineHeight: "150%", letterSpacing: "0", wordSpacing: "0" }
        ];
        nextTypoStyleId = 8;
        renderTypographyTable();
        saveInputValues();
        alert("✅ Typography table has been reset to default styles!");
      }
    };
  }

  // Initial render
  renderTypographyTable();

  // Add event listeners to rule checkboxes to re-render table
  const ruleCheckboxes = [
    "rule-font-family",
    "rule-font-size", 
    "rule-font-weight",
    "rule-line-height",
    "rule-letter-spacing",
    "rule-word-spacing"
  ];

  ruleCheckboxes.forEach(id => {
    const checkbox = document.getElementById(id);
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        renderTypographyTable();
        saveInputValues();
      });
    }
  });

  // Add event listener for color-scale input to render color preview
  const colorScaleInputEl = document.getElementById("color-scale");
  if (colorScaleInputEl) {
    colorScaleInputEl.addEventListener("input", () => {
      renderColorPreview();
    });
    // Render initial preview
    renderColorPreview();
  }

        // HTML export is handled by exportReport() (which uses generateHTMLReport internally)

        // Scan history management - persisted via clientStorage through main plugin
        const scanHistory = createScanHistoryManager({
          maxHistory: 10,
          postPluginMessage: (pluginMessage) => parent.postMessage({ pluginMessage }, "*"),
          getCurrentReportData: () => currentReportData,
          setIsViewingTokens: (v) => {
            isViewingTokens = !!v;
          },
          renderResults,
          renderTokens
        });

        const {
          saveScanHistory,
          requestScanHistory,
          renderScanHistory,
          restoreReportFromHistory,
          loadLastScanModeOnce,
          setHistory: setScanHistory,
          clearLocalHistory: clearScanHistoryLocal
        } = scanHistory;

        // exportReport is imported from ./features/reports/exportReport.js

        // Export button handlers
        const exportGroup = document.getElementById("export-group");
        const exportDropdown = document.getElementById("export-dropdown");
        
        btnExport.onclick = (e) => {
          e.stopPropagation();
          exportDropdown.style.display = exportDropdown.style.display === "block" ? "none" : "block";
        };

        document.querySelectorAll(".export-option").forEach(btn => {
          btn.onclick = (e) => {
            e.stopPropagation();
            const format = btn.getAttribute("data-format");
            exportReport({ format, reportData: currentReportData, getTypeDisplayName });
            exportDropdown.style.display = "none";
          };
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
          if (!exportGroup.contains(e.target)) {
            exportDropdown.style.display = "none";
          }
        });

  // Filter and search handlers - setup after DOM is ready
  let searchInput, btnClearSearch, filterButtons, colorTypeSelect;

  function applyFilters() {
    console.log("applyFilters called", { 
      isViewingTokens, 
      hasTokens: !!currentReportData.tokens, 
      hasIssues: !!currentReportData.issues,
      currentFilter,
      currentSearch,
      currentColorTypeFilter
    });
    if (isViewingTokens && currentReportData.tokens) {
      console.log("Applying filters to tokens");
      renderTokens(currentReportData.tokens, false); // Don't reset filters
    } else if (currentReportData.issues) {
      console.log("Applying filters to issues");
      renderResults(currentReportData.issues, false); // Don't reset filters
    }
  }

  function setupFilterHandlers() {
    console.log("setupFilterHandlers called");
    searchInput = document.getElementById("search-input");
    btnClearSearch = document.getElementById("btn-clear-search");
    filterButtons = document.querySelectorAll(".filter-btn");
    colorTypeSelect = document.getElementById("color-type-select");

    console.log("Elements found:", {
      searchInput: !!searchInput,
      btnClearSearch: !!btnClearSearch,
      filterButtons: filterButtons ? filterButtons.length : 0,
      colorTypeSelect: !!colorTypeSelect
    });

    if (!searchInput || !btnClearSearch || !filterButtons || filterButtons.length === 0) {
      console.warn("Filter elements not found, retrying...", {
        searchInput: !!searchInput,
        btnClearSearch: !!btnClearSearch,
        filterButtons: filterButtons ? filterButtons.length : 0
      });
      setTimeout(setupFilterHandlers, 100);
      return;
    }

    // Search input handler
    console.log("Setting up search input handler");
    searchInput.addEventListener("input", (e) => {
      const newValue = e.target.value;
      console.log("Search input changed:", newValue);
      currentSearch = newValue;
      console.log("currentSearch set to:", currentSearch);
      if (btnClearSearch) {
        btnClearSearch.style.display = currentSearch.trim() ? "block" : "none";
      }
      applyFilters();
    });

    // Clear search button
    if (btnClearSearch) {
      console.log("Setting up clear search button handler");
      btnClearSearch.onclick = (e) => {
        console.log("Clear search clicked");
        e.preventDefault();
        e.stopPropagation();
        if (searchInput) {
          searchInput.value = "";
        }
        currentSearch = "";
        btnClearSearch.style.display = "none";
        applyFilters();
      };
    }

    // Filter buttons handler - toggle behavior
    console.log("Setting up filter buttons handlers, count:", filterButtons.length);
    filterButtons.forEach((btn, index) => {
      console.log(`Setting up filter button ${index}:`, btn.getAttribute("data-filter"));
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const filterValue = btn.getAttribute("data-filter");
        const isCurrentlyActive = btn.classList.contains("active");
        console.log("Filter button clicked:", filterValue, "isActive:", isCurrentlyActive);
        
        if (isCurrentlyActive && filterValue !== "all") {
          // If clicking an active button (except "all"), toggle it off and set to "all"
          btn.classList.remove("active");
          currentFilter = "all";
          // Activate "all" button
          filterButtons.forEach(b => {
            if (b.getAttribute("data-filter") === "all") {
              b.classList.add("active");
            }
          });
        } else {
          // Normal behavior: activate clicked button
          filterButtons.forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          currentFilter = filterValue;
        }
        
        console.log("currentFilter set to:", currentFilter);
        applyFilters();
      };
    });

    // Color type filter handler
    if (colorTypeSelect) {
      console.log("Setting up color type select handler");
      colorTypeSelect.addEventListener("change", (e) => {
        console.log("Color type changed:", e.target.value);
        currentColorTypeFilter = e.target.value;
        applyFilters();
      });
    }

    console.log("Filter handlers setup complete");
  }

  // Setup handlers when DOM is ready
  console.log("Setting up filter handlers, DOM readyState:", document.readyState);
  if (document.readyState === "loading") {
    console.log("DOM still loading, waiting for DOMContentLoaded");
    document.addEventListener("DOMContentLoaded", () => {
      console.log("DOMContentLoaded fired, setting up handlers");
      setupFilterHandlers();
      restoreLastReport(); // Restore last report if available
      restoreInputValues(); // Restore input values
      requestScanHistory(); // Fetch persisted history
    });
  } else {
    console.log("DOM already ready, setting up handlers immediately");
    setupFilterHandlers();
    restoreLastReport(); // Restore last report if available
    restoreInputValues(); // Restore input values
    requestScanHistory(); // Fetch persisted history
  }

  // History panel handlers
  if (btnHistory) {
    // Cancel Scan button
    btnCancelScan.onclick = () => {
      console.log("Cancel operation clicked");
      parent.postMessage({ pluginMessage: { type: "cancel-scan" } }, "*");
      // Reset UI state immediately (show both buttons, hide cancel/progress)
      btnScan.style.display = "block";
      btnScan.disabled = false;
      btnExtractTokens.style.display = "block";
      btnExtractTokens.disabled = false;
      btnCancelScan.style.display = "none";
      scanProgress.style.display = "none";
    };

    // Reset All button
    btnResetAll.onclick = () => {
      if (confirm("⚠️ Are you sure you want to reset all settings to default and clear history?\n\nThis will:\n• Reset all input values to default\n• Clear scan history\n• Clear current reports\n\nThis action cannot be undone.")) {
        // Reset all inputs to default
        document.getElementById("spacing-scale").value = "0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96";
        document.getElementById("spacing-threshold").value = "100";
        document.getElementById("color-scale").value = "";
        document.getElementById("font-size-scale").value = "32, 24, 20, 18, 16, 14, 12";
        document.getElementById("font-size-threshold").value = "100";
        document.getElementById("line-height-scale").value = "auto, 100, 110, 120, 130, 140, 150, 160, 170";
        document.getElementById("line-height-threshold").value = "300";
        document.getElementById("line-height-baseline-threshold").value = "120";
        
        // Reset typography styles to default
        typographyStyles = [
          { id: 1, name: "H1", fontFamily: "Inter", fontSize: 48, fontWeight: "Bold", lineHeight: "120%", letterSpacing: "0", wordSpacing: "0" },
          { id: 2, name: "H2", fontFamily: "Inter", fontSize: 36, fontWeight: "Bold", lineHeight: "130%", letterSpacing: "0", wordSpacing: "0" },
          { id: 3, name: "H3", fontFamily: "Inter", fontSize: 30, fontWeight: "Semi Bold", lineHeight: "130%", letterSpacing: "0", wordSpacing: "0" },
          { id: 4, name: "H4", fontFamily: "Inter", fontSize: 24, fontWeight: "Semi Bold", lineHeight: "140%", letterSpacing: "0", wordSpacing: "0" },
          { id: 5, name: "H5", fontFamily: "Inter", fontSize: 20, fontWeight: "Semi Bold", lineHeight: "140%", letterSpacing: "0", wordSpacing: "0" },
          { id: 6, name: "H6", fontFamily: "Inter", fontSize: 16, fontWeight: "Semi Bold", lineHeight: "150%", letterSpacing: "0", wordSpacing: "0" },
          { id: 7, name: "Body", fontFamily: "Inter", fontSize: 14, fontWeight: "Regular", lineHeight: "150%", letterSpacing: "0", wordSpacing: "0" }
        ];
        nextTypoStyleId = 8;
        renderTypographyTable();
        
        // Reset typography rules
        document.getElementById("rule-typo-style").checked = true;
        document.getElementById("rule-font-family").checked = true;
        document.getElementById("rule-font-size").checked = true;
        document.getElementById("rule-font-weight").checked = true;
        document.getElementById("rule-line-height").checked = true;
        document.getElementById("rule-letter-spacing").checked = false;
        document.getElementById("rule-word-spacing").checked = false;
        renderTypographyTable();
        
        // Render color preview after reset
        renderColorPreview();
        
        // Clear reports
        currentReportData = {
          issues: null,
          tokens: null,
          scanMode: null,
          timestamp: null,
          context: null,
          lastActiveTab: "issues"
        };
        clearResults("issues");
        clearResults("tokens");
        switchToTab("issues");
        
        // Clear history
        clearScanHistoryLocal();
        parent.postMessage({ pluginMessage: { type: "clear-history" } }, "*");
        
        // Re-render history panel to show empty state
        const historyPanel = document.getElementById("history-panel");
        if (historyPanel && historyPanel.style.display !== "none") {
          renderScanHistory();
        }
        
        // Save reset input values only (don't save report - it's already cleared in backend)
        saveInputValues();
        
        // Note: Don't call saveLastReport() here - backend already cleared it
        // and we want to keep it empty
        
        alert("✅ All settings have been reset to default and history has been cleared!");
      }
    };

    btnHistory.onclick = () => {
      const historyPanel = document.getElementById("history-panel");
      if (historyPanel) {
        const isVisible = historyPanel.style.display !== "none";
        historyPanel.style.display = isVisible ? "none" : "flex";
        if (!isVisible) {
          renderScanHistory();
        }
      }
    };
  }

  if (btnCloseHistory) {
    btnCloseHistory.onclick = () => {
      const historyPanel = document.getElementById("history-panel");
      if (historyPanel) {
        historyPanel.style.display = "none";
      }
    };
  }

  // Save Settings functionality
  const btnSaveSettings = document.getElementById("btn-save-settings");
  const saveSettingsModal = document.getElementById("save-settings-modal");
  const settingNameInput = document.getElementById("setting-name-input");
  const btnConfirmSaveSettings = document.getElementById("btn-confirm-save-settings");
  const btnCancelSaveSettings = document.getElementById("btn-cancel-save-settings");
  const btnCloseSaveSettings = document.getElementById("btn-close-save-settings");

  if (btnSaveSettings) {
    btnSaveSettings.onclick = () => {
      // Get project name as default
      parent.postMessage({ pluginMessage: { type: "get-project-name" } }, "*");
      
      // Show modal
      if (saveSettingsModal) {
        saveSettingsModal.style.display = "flex";
        if (settingNameInput) {
          settingNameInput.value = "";
          settingNameInput.focus();
          // Allow Enter key to save
          settingNameInput.onkeydown = (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (btnConfirmSaveSettings) {
                btnConfirmSaveSettings.click();
              }
            }
          };
        }
      }
    };
  }

  // Close save settings modal
  if (btnCloseSaveSettings) {
    btnCloseSaveSettings.onclick = () => {
      if (saveSettingsModal) {
        saveSettingsModal.style.display = "none";
      }
    };
  }

  if (btnCancelSaveSettings) {
    btnCancelSaveSettings.onclick = () => {
      if (saveSettingsModal) {
        saveSettingsModal.style.display = "none";
      }
    };
  }

  // Replace confirm modal
  const replaceConfirmModal = document.getElementById("replace-confirm-modal");
  const replaceSettingName = document.getElementById("replace-setting-name");
  const btnConfirmReplace = document.getElementById("btn-confirm-replace");
  const btnCancelReplace = document.getElementById("btn-cancel-replace");
  const btnCloseReplaceConfirm = document.getElementById("btn-close-replace-confirm");
  
  let pendingSaveData = null; // Store name and values when checking

  // Function to actually save settings
  function performSaveSettings(name, values) {
    parent.postMessage({ 
      pluginMessage: { 
        type: "save-settings", 
        name, 
        values,
        forceReplace: true
      } 
    }, "*");
  }

  // Confirm save settings
  if (btnConfirmSaveSettings) {
    btnConfirmSaveSettings.onclick = () => {
      const name = settingNameInput?.value?.trim();
      if (!name) {
        alert("⚠️ Please enter a setting name");
        return;
      }

      // Get current values
      const values = {
        spacingScale: document.getElementById("spacing-scale")?.value || "",
        spacingThreshold: document.getElementById("spacing-threshold")?.value || "100",
        colorScale: document.getElementById("color-scale")?.value || "",
        colorNameMap: colorNameMap,
        ignoredIssues: ignoredIssues,
        fontSizeScale: document.getElementById("font-size-scale")?.value || "",
        fontSizeThreshold: document.getElementById("font-size-threshold")?.value || "100",
        lineHeightScale: document.getElementById("line-height-scale")?.value || "",
        lineHeightThreshold: document.getElementById("line-height-threshold")?.value || "300",
        lineHeightBaselineThreshold: document.getElementById("line-height-baseline-threshold")?.value || "120",
        typographyStyles: typographyStyles,
        typographyRules: {
          checkStyle: document.getElementById("rule-typo-style")?.checked || true,
          checkFontFamily: document.getElementById("rule-font-family")?.checked || true,
          checkFontSize: document.getElementById("rule-font-size")?.checked || true,
          checkFontWeight: document.getElementById("rule-font-weight")?.checked || true,
          checkLineHeight: document.getElementById("rule-line-height")?.checked || true,
          checkLetterSpacing: document.getElementById("rule-letter-spacing")?.checked || false,
          checkWordSpacing: document.getElementById("rule-word-spacing")?.checked || false
        }
      };

      // Store pending save data
      pendingSaveData = { name, values };

      // Check if name already exists
      parent.postMessage({ 
        pluginMessage: { 
          type: "check-setting-name", 
          name 
        } 
      }, "*");
    };
  }

  // Handle replace confirm
  if (btnConfirmReplace) {
    btnConfirmReplace.onclick = () => {
      if (pendingSaveData) {
        performSaveSettings(pendingSaveData.name, pendingSaveData.values);
        pendingSaveData = null;
      }
      if (replaceConfirmModal) {
        replaceConfirmModal.style.display = "none";
      }
    };
  }

  if (btnCancelReplace) {
    btnCancelReplace.onclick = () => {
      pendingSaveData = null;
      if (replaceConfirmModal) {
        replaceConfirmModal.style.display = "none";
      }
      // Focus back to input to allow user to enter new name
      if (settingNameInput) {
        settingNameInput.focus();
        settingNameInput.select();
      }
    };
  }

  if (btnCloseReplaceConfirm) {
    btnCloseReplaceConfirm.onclick = () => {
      pendingSaveData = null;
      if (replaceConfirmModal) {
        replaceConfirmModal.style.display = "none";
      }
      // Focus back to input
      if (settingNameInput) {
        settingNameInput.focus();
        settingNameInput.select();
      }
    };
  }

  // Close replace confirm modal when clicking outside
  if (replaceConfirmModal) {
    replaceConfirmModal.onclick = (e) => {
      if (e.target === replaceConfirmModal) {
        pendingSaveData = null;
        replaceConfirmModal.style.display = "none";
        if (settingNameInput) {
          settingNameInput.focus();
          settingNameInput.select();
        }
      }
    };
  }

  // Load Settings functionality
  const btnLoadSettings = document.getElementById("btn-load-settings");
  const loadSettingsModal = document.getElementById("load-settings-modal");
  const settingsList = document.getElementById("settings-list");
  const settingsEmptyState = document.getElementById("settings-empty-state");
  const btnCloseLoadSettings = document.getElementById("btn-close-load-settings");

  function renderSettingsList(settings) {
    if (!settingsList || !settingsEmptyState) return;

    if (!settings || settings.length === 0) {
      settingsList.innerHTML = "";
      settingsEmptyState.style.display = "block";
      return;
    }

    settingsEmptyState.style.display = "none";
    settingsList.innerHTML = settings.map(setting => {
      const date = new Date(setting.updatedAt || setting.createdAt);
      const dateStr = date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `
        <div class="settings-item" data-setting-name="${escapeHtml(setting.name)}">
          <div class="settings-item-info">
            <div class="settings-item-name">${escapeHtml(setting.name)}</div>
            <div class="settings-item-date">Updated: ${dateStr}</div>
          </div>
          <div class="settings-item-actions">
            <button class="btn-remove-setting" data-setting-name="${escapeHtml(setting.name)}" title="Remove">🗑️</button>
          </div>
        </div>
      `;
    }).join("");

    // Add click handlers for settings items
    settingsList.querySelectorAll(".settings-item").forEach(item => {
      const settingName = item.getAttribute("data-setting-name");
      item.onclick = (e) => {
        // Don't trigger if clicking remove button
        if (e.target.closest(".btn-remove-setting")) return;
        
        parent.postMessage({ 
          pluginMessage: { 
            type: "load-settings", 
            name: settingName 
          } 
        }, "*");
        
        if (loadSettingsModal) {
          loadSettingsModal.style.display = "none";
        }
      };
    });

    // Add click handlers for remove buttons
    settingsList.querySelectorAll(".btn-remove-setting").forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const settingName = btn.getAttribute("data-setting-name");
        if (confirm(`⚠️ Are you sure you want to remove "${settingName}"?`)) {
          parent.postMessage({ 
            pluginMessage: { 
              type: "remove-settings", 
              name: settingName 
            } 
          }, "*");
        }
      };
    });
  }

  if (btnLoadSettings) {
    btnLoadSettings.onclick = () => {
      // Load settings list
      parent.postMessage({ pluginMessage: { type: "get-saved-settings" } }, "*");
      
      // Show modal
      if (loadSettingsModal) {
        loadSettingsModal.style.display = "flex";
      }
    };
  }

  // Close load settings modal
  if (btnCloseLoadSettings) {
    btnCloseLoadSettings.onclick = () => {
      if (loadSettingsModal) {
        loadSettingsModal.style.display = "none";
      }
    };
  }

  // Close modals when clicking outside
  if (saveSettingsModal) {
    saveSettingsModal.onclick = (e) => {
      if (e.target === saveSettingsModal) {
        saveSettingsModal.style.display = "none";
      }
    };
  }

  if (loadSettingsModal) {
    loadSettingsModal.onclick = (e) => {
      if (e.target === loadSettingsModal) {
        loadSettingsModal.style.display = "none";
      }
    };
  }

  btnClose.onclick = () => {
    parent.postMessage({ pluginMessage: { type: "close" } }, "*");
  };

  // Receive report from plugin code
  window.onmessage = (event) => {
    console.log("Received message:", event.data);
    const msg = event.data.pluginMessage;

    if (msg && msg.type === "fix-issue-result") {
      console.log("[fix-issue-result] Received:", { issueId: msg.issueId, success: msg.success, message: msg.message });
      
      // Show fix result message
      showFixMessage(msg.issueId, msg.message, msg.success);
      
      // If error, show error popup
      if (!msg.success) {
        console.log("[fix-issue-result] Error detected, showing error modal...");
        const errorMsg = msg.message || "An error occurred while fixing the issue.";
        console.log("[fix-issue-result] Error message:", errorMsg);
        try {
          showErrorModal(errorMsg);
          console.log("[fix-issue-result] Error modal should be displayed");
        } catch (error) {
          console.error("[fix-issue-result] Error showing error modal:", error);
          // Fallback to alert
          alert("Error: " + errorMsg);
        }
      }
      
      // If successful, remove the issue immediately and update counts
      if (msg.success) {
        console.log("[fix-issue-result] Starting remove process for issueId:", msg.issueId);
        console.log("[fix-issue-result] issueId type:", typeof msg.issueId, "value:", msg.issueId);
        
        // Remove ALL issues with this ID from currentReportData (there might be multiple issues with same ID but different types)
        if (currentReportData && currentReportData.issues) {
          const initialLength = currentReportData.issues.length;
          currentReportData.issues = currentReportData.issues.filter(i => String(i.id) !== String(msg.issueId));
          const removedCount = initialLength - currentReportData.issues.length;
          console.log("[fix-issue-result] Removed", removedCount, "issue(s) from data. Remaining issues:", currentReportData.issues.length);
        }
        
        // Find ALL issue elements with this ID (there might be multiple issues with same ID but different types)
        const selector1 = `.issue[data-issue-id="${msg.issueId}"]`;
        console.log("[fix-issue-result] Trying selector1:", selector1);
        const allIssueElements = document.querySelectorAll(selector1);
        console.log("[fix-issue-result] Found", allIssueElements.length, "issue element(s) with this ID");
        
        // Also try to find by buttons
        const selector2 = `button.btn-fix[data-id="${msg.issueId}"]`;
        const selector3 = `button.btn-suggest-fix[data-id="${msg.issueId}"]`;
        const btnElements = [
          ...document.querySelectorAll(selector2),
          ...document.querySelectorAll(selector3)
        ];
        
        // Get issues from buttons
        btnElements.forEach(btn => {
          const issueFromBtn = btn.closest(".issue");
          if (issueFromBtn && !Array.from(allIssueElements).includes(issueFromBtn)) {
            allIssueElements.push(issueFromBtn);
          }
        });
        
        // Remove duplicates
        const uniqueIssueElements = Array.from(new Set(Array.from(allIssueElements)));
        console.log("[fix-issue-result] Total unique issue elements to remove:", uniqueIssueElements.length);
        
        if (uniqueIssueElements.length > 0) {
          // Track groups and badges before removing
          const groupBadgeMap = new Map();
          
          uniqueIssueElements.forEach((issueEl, index) => {
            console.log(`[fix-issue-result] Issue element ${index}:`, issueEl);
            console.log(`[fix-issue-result] Issue element ${index} data-issue-id:`, issueEl.getAttribute("data-issue-id"));
            console.log(`[fix-issue-result] Issue element ${index} data-issue-type:`, issueEl.getAttribute("data-issue-type"));
            
                const groupEl = issueEl.closest(".issue-group");
                if (groupEl) {
              const groupType = groupEl.getAttribute("data-issue-type");
              if (!groupBadgeMap.has(groupType)) {
                  const badge = groupEl.querySelector(".badge");
                  if (badge) {
                    const currentCount = parseInt(badge.textContent) || 0;
                  groupBadgeMap.set(groupType, { groupEl, badge, currentCount, removeCount: 0 });
                }
              }
              const groupInfo = groupBadgeMap.get(groupType);
              if (groupInfo) {
                groupInfo.removeCount++;
              }
            }
          });
          
          // Remove all elements
          uniqueIssueElements.forEach((issueEl, index) => {
            issueEl.style.transition = "opacity 0.3s ease-out";
            issueEl.style.opacity = "0";
            setTimeout(() => {
              if (issueEl.parentNode) {
                console.log(`[fix-issue-result] Removing element ${index} from DOM...`);
                issueEl.remove();
              }
            }, 300);
          });
          
          // Update badges after all removals
          setTimeout(() => {
            // Check if any elements still exist
            const remainingElements = document.querySelectorAll(selector1);
            console.log("[fix-issue-result] After remove, remaining elements:", remainingElements.length);
            
            // Update group badge counts
            groupBadgeMap.forEach((groupInfo, groupType) => {
              const newCount = Math.max(0, groupInfo.currentCount - groupInfo.removeCount);
              groupInfo.badge.textContent = newCount;
              console.log(`[fix-issue-result] Updated badge for group "${groupType}" from ${groupInfo.currentCount} to ${newCount}`);
              
                    // Hide group if no issues left
                    if (newCount === 0) {
                groupInfo.groupEl.style.display = "none";
                console.log(`[fix-issue-result] Hiding group "${groupType}" (no issues left)`);
              }
            });
            
            // Update stats header
            console.log("[fix-issue-result] Calling updateIssueCounts()...");
            updateIssueCounts();
            console.log("[fix-issue-result] updateIssueCounts() completed");
            
            // Re-render issues to sync UI with updated data
            console.log("[fix-issue-result] Re-rendering issues to sync UI...");
            if (currentReportData && currentReportData.issues) {
              renderResults(currentReportData.issues, false); // Don't reset filters
            }
          }, 350);
        } else {
          console.log("[fix-issue-result] No issue elements found! Trying to update counts anyway...");
          // If element not found, still update counts and re-render
          updateIssueCounts();
          if (currentReportData && currentReportData.issues) {
            renderResults(currentReportData.issues, false); // Don't reset filters
          }
        }
      }
      return;
    }

    if (msg && msg.type === "create-text-style-result") {
      // Show create style result message
      showFixMessage(msg.issueId, msg.message, msg.success);
      
      // If successful, hide the issue after 5 seconds
      if (msg.success) {
        setTimeout(() => {
          const issueEl = document.querySelector(`.issue[data-issue-id="${msg.issueId}"]`) ||
                         document.querySelector(`button.btn-create-style[data-id="${msg.issueId}"]`)?.closest(".issue");
          if (issueEl) {
            issueEl.style.transition = "opacity 0.5s ease-out";
            issueEl.style.opacity = "0";
            setTimeout(() => {
              if (issueEl.parentNode) {
                issueEl.remove();
                // Update badge count
                const groupEl = issueEl.closest(".issue-group");
                if (groupEl) {
                  const badge = groupEl.querySelector(".badge");
                  if (badge) {
                    const currentCount = parseInt(badge.textContent) || 0;
                    const newCount = Math.max(0, currentCount - 1);
                    badge.textContent = newCount;
                    // Hide group if no issues left
                    if (newCount === 0) {
                      groupEl.style.display = "none";
                    }
                  }
                }
              }
            }, 500);
          }
        }, 5000);
      }
      return;
    }

    // Handle get-components-for-issue (Suggest Fix now) - CHECK FIRST before other handlers
    if (msg && msg.type === "components-for-issue-loaded") {
      console.log("=== [components-for-issue-loaded] HANDLER CALLED ===");
      console.log("[components-for-issue-loaded] Received message", msg);
      const pendingIssue = window.pendingComponentIssue;
      console.log("[components-for-issue-loaded] Pending issue:", pendingIssue, "Message issueId:", msg.issueId);
      console.log("[components-for-issue-loaded] Similar components:", msg.similarComponents);
      
      // Restore button state
      if (pendingIssue) {
        const issueEl = document.querySelector(`.issue[data-issue-id="${pendingIssue.id}"]`);
        if (issueEl) {
          const btnSuggestFix = issueEl.querySelector("button.btn-suggest-fix");
          if (btnSuggestFix) {
            btnSuggestFix.disabled = false;
            btnSuggestFix.style.opacity = "1";
            btnSuggestFix.style.cursor = "pointer";
            if (btnSuggestFix.dataset.originalText) {
              btnSuggestFix.textContent = btnSuggestFix.dataset.originalText;
              delete btnSuggestFix.dataset.originalText;
            }
          }
        }
      }
      
      // Always show modal if we have similar components (simplified logic)
      if (msg.similarComponents && msg.similarComponents.length > 0) {
        console.log("[components-for-issue-loaded] Showing suggest modal with", msg.similarComponents.length, "similar components");
        // Use pending issue if available, otherwise create a minimal issue object
        const issueToUse = pendingIssue || { id: msg.issueId, nodeName: "Unnamed" };
        try {
          showComponentSuggestModal(issueToUse, msg.similarComponents);
          console.log("[components-for-issue-loaded] Modal function called successfully");
        } catch (error) {
          console.error("[components-for-issue-loaded] Error showing modal:", error);
          alert("Error showing component suggestion modal: " + error.message);
        }
        window.pendingComponentIssue = null;
        return;
      } else {
        console.warn("[components-for-issue-loaded] No similar components found");
        alert("No similar components found. Please use 'Select Component' to choose from all components or 'Create New Component' to create a new one.");
        window.pendingComponentIssue = null;
        return;
      }
    }
    
    // Handle get-all-components (Select Component) - CHECK FIRST before other handlers
    if (msg && msg.type === "all-components-loaded") {
      console.log("=== [all-components-loaded] HANDLER CALLED ===");
      console.log("[all-components-loaded] Received message", msg);
      const pendingIssue = window.pendingSelectComponentIssue;
      console.log("[all-components-loaded] Pending issue:", pendingIssue);
      console.log("[all-components-loaded] Message issueId:", msg.issueId, typeof msg.issueId);
      console.log("[all-components-loaded] Pending issueId:", pendingIssue?.id, typeof pendingIssue?.id);
      console.log("[all-components-loaded] Components:", msg.components);
      console.log("[all-components-loaded] Components length:", msg.components ? msg.components.length : 0);
      
      // Restore button state
      if (pendingIssue) {
        const issueEl = document.querySelector(`.issue[data-issue-id="${pendingIssue.id}"]`);
        if (issueEl) {
          const btnSelectComponent = issueEl.querySelector("button.btn-select-component");
          if (btnSelectComponent) {
            btnSelectComponent.disabled = false;
            btnSelectComponent.style.opacity = "1";
            btnSelectComponent.style.cursor = "pointer";
            if (btnSelectComponent.dataset.originalText) {
              btnSelectComponent.textContent = btnSelectComponent.dataset.originalText;
              delete btnSelectComponent.dataset.originalText;
            }
          }
        }
      }
      
      // Always show modal if we have components (simplified logic)
      if (msg.components && msg.components.length > 0) {
        console.log("[all-components-loaded] ✓ Showing select modal with", msg.components.length, "components");
        // Use pending issue if available, otherwise create a minimal issue object
        const issueToUse = pendingIssue || { id: msg.issueId, nodeName: "Unnamed" };
        console.log("[all-components-loaded] Issue to use:", issueToUse);
        console.log("[all-components-loaded] Calling showComponentSelectModal...");
        try {
          showComponentSelectModal(issueToUse, msg.components);
          console.log("[all-components-loaded] ✓ Modal function called successfully");
        } catch (error) {
          console.error("[all-components-loaded] ✗ Error showing modal:", error);
          console.error("[all-components-loaded] Error stack:", error.stack);
          alert("Error showing component selection modal: " + error.message);
        }
        window.pendingSelectComponentIssue = null;
        return;
      } else {
        console.warn("[all-components-loaded] ✗ No components available");
        alert("No components found. Please use 'Create New Component' to create a new one.");
        window.pendingSelectComponentIssue = null;
        return;
      }
    }

    if (msg && msg.type === "figma-text-styles-loaded") {
      // Check if this is for "Suggest Fix now" button (text-size-mobile)
      const pendingSuggestIssue = window.pendingSuggestTextSizeIssue;
      if (pendingSuggestIssue && pendingSuggestIssue.id === msg.issueId) {
        // Find closest text style >= 14px
        const currentSize = pendingSuggestIssue.fontSize || 12;
        const validStyles = (msg.styles || []).filter(s => s.fontSize >= 14);
        
        if (validStyles.length === 0) {
          // Fallback to font-size input
          const suggestedSize = getSuggestedTextSize(pendingSuggestIssue);
          if (suggestedSize) {
            showTextSizeFixConfirmModal(pendingSuggestIssue, currentSize, suggestedSize, null, null);
          } else {
            alert("No suitable text size match found (need >= 14px for ADA compliance). Please add font sizes to Font Size input or create text styles in Figma.");
          }
          window.pendingSuggestTextSizeIssue = null;
          return;
        }
        
        // Find closest style to current size
        let closestStyle = null;
        let minDiff = Infinity;
        
        validStyles.forEach(style => {
          const diff = Math.abs(style.fontSize - currentSize);
          if (diff < minDiff) {
            minDiff = diff;
            closestStyle = style;
          }
        });
        
        if (closestStyle) {
          showTextSizeFixConfirmModal(pendingSuggestIssue, currentSize, closestStyle.fontSize, null, closestStyle);
        } else {
          alert("No suitable text style found (need >= 14px for ADA compliance)");
        }
        
        window.pendingSuggestTextSizeIssue = null;
        return;
      }
      
      // Check if this is for text-size-mobile issue (Select Style button)
      const pendingIssue = window.pendingTextSizeIssue;
      if (pendingIssue && pendingIssue.id === msg.issueId) {
        // Show text style picker for text-size-mobile
        showTextStylePickerForTextSize(pendingIssue, msg.styles || []);
        window.pendingTextSizeIssue = null;
        return;
      }
      
      // Check if this is for typography-style issue (Select Style button)
      const pendingTypographyStyleIssue = window.pendingTypographyStyleIssue;
      if (pendingTypographyStyleIssue && pendingTypographyStyleIssue.id === msg.issueId) {
        // Hide buttons if error or no styles
        if (msg.error || !msg.styles || msg.styles.length === 0) {
          const issueEl = document.querySelector(`.issue[data-issue-id="${msg.issueId}"]`);
          if (issueEl) {
            const btnFix = issueEl.querySelector("button.btn-fix");
            const btnSuggestFix = issueEl.querySelector("button.btn-suggest-fix");
            if (btnFix) btnFix.style.display = "none";
            if (btnSuggestFix) btnSuggestFix.style.display = "none";
          }
          window.pendingTypographyStyleIssue = null;
          return;
        }
        // Show text style picker popup for typography-style
        showTextStylePickerForTypography(pendingTypographyStyleIssue, msg.styles || []);
        window.pendingTypographyStyleIssue = null;
        return;
      }
      
      // Check if this is for typography-check issue (Select Style button)
      const pendingTypographyCheckIssue = window.pendingTypographyCheckIssue;
      if (pendingTypographyCheckIssue && pendingTypographyCheckIssue.id === msg.issueId) {
        // Hide buttons if error or no styles
        if (msg.error || !msg.styles || msg.styles.length === 0) {
          const issueEl = document.querySelector(`.issue[data-issue-id="${msg.issueId}"]`);
          if (issueEl) {
            const btnStyleDropdown = issueEl.querySelector("button.btn-style-dropdown");
            const btnSuggestFix = issueEl.querySelector("button.btn-suggest-fix");
            if (btnStyleDropdown) btnStyleDropdown.style.display = "none";
            if (btnSuggestFix) btnSuggestFix.style.display = "none";
          }
          window.pendingTypographyCheckIssue = null;
          return;
        }
        // Show text style picker popup for typography-check
        showTextStylePickerForTypography(pendingTypographyCheckIssue, msg.styles || []);
        window.pendingTypographyCheckIssue = null;
        return;
      }
      
      // Update dropdown menu with loaded styles (for backward compatibility - old dropdown code)
      const dropdownMenu = document.querySelector(`.style-dropdown-menu[data-issue-id="${msg.issueId}"]`);
      if (dropdownMenu) {
        const issueEl = dropdownMenu.closest(".issue");
        const issueId = issueEl ? issueEl.getAttribute("data-issue-id") : null;
        const issueType = issueEl ? issueEl.getAttribute("data-issue-type") : null;
        
        if (msg.error) {
          dropdownMenu.innerHTML = `<div style="padding: 8px 12px; color: #dc3545; font-size: 12px;">Error: ${escapeHtml(msg.error)}</div>`;
          // Hide dropdown button if error
          const btnStyleDropdown = issueEl ? issueEl.querySelector("button.btn-style-dropdown") : null;
          if (btnStyleDropdown) {
            btnStyleDropdown.style.display = "none";
          }
          // Also hide Suggest Fix button if error
          const btnSuggestFix = issueEl ? issueEl.querySelector("button.btn-suggest-fix") : null;
          if (btnSuggestFix && (issueType === "typography-style" || issueType === "typography-check")) {
            btnSuggestFix.style.display = "none";
          }
        } else if (msg.styles && msg.styles.length > 0) {
          // Find the issue to get bestMatch
          let bestMatchName = null;
          if (issueId) {
            // Try to find bestMatch from current report data
            if (currentReportData && currentReportData.issues) {
              const issue = currentReportData.issues.find(i => i.id === issueId);
              if (issue && issue.bestMatch) {
                bestMatchName = issue.bestMatch.name;
              }
            }
          }
          
          dropdownMenu.innerHTML = msg.styles.map(style => `
            <div class="style-dropdown-item" data-issue-id="${msg.issueId}" data-style-id="${style.id}" data-style-name="${escapeHtml(style.name)}" style="padding: 8px 12px; cursor: pointer; font-size: 12px; ${bestMatchName === style.name ? 'background: #e3f2fd; font-weight: 600;' : ''}" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='${bestMatchName === style.name ? '#e3f2fd' : 'white'}'">
              ${escapeHtml(style.name)} ${bestMatchName === style.name ? '⭐' : ''}
            </div>
          `).join('');
          
          // Attach click handlers
          dropdownMenu.querySelectorAll(".style-dropdown-item").forEach(item => {
            item.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              // Auto jump to the node for this issue before applying style
              try {
                const iid = item.getAttribute("data-issue-id");
                if (iid) {
                  parent.postMessage({ pluginMessage: { type: "select-node", id: iid } }, "*");
                }
              } catch (err) {
                console.error("Failed to auto-select node for style dropdown item:", err);
              }
              const styleId = item.getAttribute("data-style-id");
              const styleName = item.getAttribute("data-style-name");
              
              // Find issue
              if (issueEl) {
                if (currentReportData && currentReportData.issues) {
                  const issue = currentReportData.issues.find(i => i.id === issueId);
                  if (issue) {
                    // Create style object from Figma text style
                    const style = msg.styles.find(s => s.id === styleId);
                    if (style) {
                      dropdownMenu.style.display = "none";
                      handleApplyFigmaTextStyle(issue, style);
                    }
                  }
                }
              }
            };
          });
        } else {
          // No styles found - hide dropdown button
          dropdownMenu.innerHTML = '<div style="padding: 8px 12px; color: #999; font-size: 12px;">No text styles found in Figma</div>';
          const btnStyleDropdown = issueEl ? issueEl.querySelector("button.btn-style-dropdown") : null;
          if (btnStyleDropdown) {
            btnStyleDropdown.style.display = "none";
          }
          // Also hide Suggest Fix button if no styles available (for typography-style and typography-check)
          const btnSuggestFix = issueEl ? issueEl.querySelector("button.btn-suggest-fix") : null;
          if (btnSuggestFix && (issueType === "typography-style" || issueType === "typography-check")) {
            btnSuggestFix.style.display = "none";
          }
        }
      }
      return;
    }

    if (msg && msg.type === "contrast-colors-loaded") {
      // Show color picker for contrast issue
      const pendingIssue = window.pendingContrastIssue;
      if (pendingIssue && pendingIssue.id === msg.issueId) {
        showContrastColorPicker(pendingIssue, msg.colors || []);
        window.pendingContrastIssue = null;
      }
      return;
    }

    if (msg && msg.type === "apply-typography-style-result") {
      // Show apply style result message
      showFixMessage(msg.issueId, msg.message, msg.success);
      
      // If error, show error popup
      if (!msg.success) {
        showErrorModal(msg.message || "An error occurred while applying the style.");
      }
      
      // If successful, remove the issue immediately and update counts
      if (msg.success) {
        console.log("[apply-typography-style-result] Starting remove process for issueId:", msg.issueId);
        console.log("[apply-typography-style-result] issueId type:", typeof msg.issueId, "value:", msg.issueId);
        
        // Remove ALL issues with this ID from currentReportData (there might be multiple issues with same ID but different types)
        if (currentReportData && currentReportData.issues) {
          const initialLength = currentReportData.issues.length;
          currentReportData.issues = currentReportData.issues.filter(i => String(i.id) !== String(msg.issueId));
          const removedCount = initialLength - currentReportData.issues.length;
          console.log("[apply-typography-style-result] Removed", removedCount, "issue(s) from data. Remaining issues:", currentReportData.issues.length);
        }
        
        // Find ALL issue elements with this ID (there might be multiple issues with same ID but different types)
        const selector1 = `.issue[data-issue-id="${msg.issueId}"]`;
        console.log("[apply-typography-style-result] Trying selector1:", selector1);
        const allIssueElements = document.querySelectorAll(selector1);
        console.log("[apply-typography-style-result] Found", allIssueElements.length, "issue element(s) with this ID");
        
        // Also try to find by buttons
        const selector2 = `button.btn-suggest-apply[data-id="${msg.issueId}"]`;
        const selector3 = `button.btn-fix[data-id="${msg.issueId}"]`;
        const selector4 = `button.btn-suggest-fix[data-id="${msg.issueId}"]`;
        const btnElements = [
          ...document.querySelectorAll(selector2),
          ...document.querySelectorAll(selector3),
          ...document.querySelectorAll(selector4)
        ];
        
        // Get issues from buttons
        btnElements.forEach(btn => {
          const issueFromBtn = btn.closest(".issue");
          if (issueFromBtn && !Array.from(allIssueElements).includes(issueFromBtn)) {
            allIssueElements.push(issueFromBtn);
          }
        });
        
        // Remove duplicates
        const uniqueIssueElements = Array.from(new Set(Array.from(allIssueElements)));
        console.log("[apply-typography-style-result] Total unique issue elements to remove:", uniqueIssueElements.length);
        
        if (uniqueIssueElements.length > 0) {
          // Track groups and badges before removing
          const groupBadgeMap = new Map();
          
          uniqueIssueElements.forEach((issueEl, index) => {
            console.log(`[apply-typography-style-result] Issue element ${index}:`, issueEl);
            console.log(`[apply-typography-style-result] Issue element ${index} data-issue-id:`, issueEl.getAttribute("data-issue-id"));
            console.log(`[apply-typography-style-result] Issue element ${index} data-issue-type:`, issueEl.getAttribute("data-issue-type"));
            
                const groupEl = issueEl.closest(".issue-group");
                if (groupEl) {
              const groupType = groupEl.getAttribute("data-issue-type");
              if (!groupBadgeMap.has(groupType)) {
                  const badge = groupEl.querySelector(".badge");
                  if (badge) {
                    const currentCount = parseInt(badge.textContent) || 0;
                  groupBadgeMap.set(groupType, { groupEl, badge, currentCount, removeCount: 0 });
                }
              }
              const groupInfo = groupBadgeMap.get(groupType);
              if (groupInfo) {
                groupInfo.removeCount++;
              }
            }
          });
          
          // Remove all elements
          uniqueIssueElements.forEach((issueEl, index) => {
            issueEl.style.transition = "opacity 0.3s ease-out";
            issueEl.style.opacity = "0";
            setTimeout(() => {
              if (issueEl.parentNode) {
                console.log(`[apply-typography-style-result] Removing element ${index} from DOM...`);
                issueEl.remove();
              }
            }, 300);
          });
          
          // Update badges after all removals
          setTimeout(() => {
            // Check if any elements still exist
            const remainingElements = document.querySelectorAll(selector1);
            console.log("[apply-typography-style-result] After remove, remaining elements:", remainingElements.length);
            
            // Update group badge counts
            groupBadgeMap.forEach((groupInfo, groupType) => {
              const newCount = Math.max(0, groupInfo.currentCount - groupInfo.removeCount);
              groupInfo.badge.textContent = newCount;
              console.log(`[apply-typography-style-result] Updated badge for group "${groupType}" from ${groupInfo.currentCount} to ${newCount}`);
              
                    // Hide group if no issues left
                    if (newCount === 0) {
                groupInfo.groupEl.style.display = "none";
                console.log(`[apply-typography-style-result] Hiding group "${groupType}" (no issues left)`);
              }
            });
            
            // Update stats header
            console.log("[apply-typography-style-result] Calling updateIssueCounts()...");
            updateIssueCounts();
            console.log("[apply-typography-style-result] updateIssueCounts() completed");
            
            // Re-render issues to sync UI with updated data
            console.log("[apply-typography-style-result] Re-rendering issues to sync UI...");
            if (currentReportData && currentReportData.issues) {
              renderResults(currentReportData.issues, false); // Don't reset filters
            }
          }, 350);
        } else {
          console.log("[apply-typography-style-result] No issue elements found! Trying to update counts anyway...");
          // If element not found, still update counts and re-render
          updateIssueCounts();
          if (currentReportData && currentReportData.issues) {
            renderResults(currentReportData.issues, false); // Don't reset filters
          }
        }
      }
      return;
    }

    if (msg && msg.type === "scan-progress") {
      // Update progress bar
      if (scanProgressBar && scanProgressText) {
        scanProgressBar.style.width = msg.progress + "%";
        scanProgressText.textContent = msg.progress + "%" + " (" + msg.current + "/" + msg.total + ")";
      }
      return;
    }

    if (msg && msg.type === "last-report") {
      if (msg.report) {
        applySavedReport(msg.report);
      } else {
        console.log("No last report stored");
      }
      return;
    }

    if (msg && msg.type === "history-data") {
      setScanHistory(msg.history);
      loadLastScanModeOnce();
      const historyPanel = document.getElementById("history-panel");
      if (historyPanel && historyPanel.style.display !== "none") {
        renderScanHistory();
      }
      return;
    }

    if (msg && msg.type === "input-values-data") {
      if (msg.values) {
        applyInputValues(msg.values);
        console.log("Restored input values:", msg.values);
      } else {
        console.log("No saved input values to restore");
      }
      return;
    }

    // Settings management messages
    if (msg && msg.type === "project-name") {
      if (settingNameInput) {
        settingNameInput.value = msg.name || "";
      }
      return;
    }

    if (msg && msg.type === "check-setting-name-result") {
      if (msg.exists) {
        // Show replace confirm modal
        if (replaceSettingName && pendingSaveData) {
          replaceSettingName.textContent = msg.name || pendingSaveData.name;
        }
        if (replaceConfirmModal) {
          replaceConfirmModal.style.display = "flex";
        }
      } else {
        // Name doesn't exist, proceed with save
        if (pendingSaveData) {
          performSaveSettings(pendingSaveData.name, pendingSaveData.values);
          pendingSaveData = null;
        }
      }
      return;
    }

    if (msg && msg.type === "save-settings-result") {
      if (msg.success) {
        // Close replace confirm modal if open
        if (replaceConfirmModal) {
          replaceConfirmModal.style.display = "none";
        }
        // Close save settings modal
        if (saveSettingsModal) {
          saveSettingsModal.style.display = "none";
        }
        if (settingNameInput) {
          settingNameInput.value = "";
        }
        pendingSaveData = null;
        // Refresh settings list if load modal is open
        if (loadSettingsModal && loadSettingsModal.style.display !== "none") {
          parent.postMessage({ pluginMessage: { type: "get-saved-settings" } }, "*");
        }
      } else {
        alert("❌ Failed to save settings: " + (msg.error || "Unknown error"));
        // Close replace confirm modal on error
        if (replaceConfirmModal) {
          replaceConfirmModal.style.display = "none";
        }
        pendingSaveData = null;
      }
      return;
    }

    if (msg && msg.type === "saved-settings-list") {
      renderSettingsList(msg.settings || []);
      return;
    }

    if (msg && msg.type === "load-settings-result") {
      if (msg.success && msg.values) {
        applyInputValues(msg.values);
        // Save as current input values
        saveInputValues();
      } else {
        alert("❌ Failed to load settings: " + (msg.error || "Unknown error"));
      }
      return;
    }

    if (msg && msg.type === "remove-settings-result") {
      if (msg.success) {
        // Refresh settings list
        renderSettingsList(msg.settings || []);
      } else {
        alert("❌ Failed to remove settings: " + (msg.error || "Unknown error"));
      }
      return;
    }

    if (msg && msg.type === "report") {
            // Reset UI state
            btnScan.style.display = "block";
            btnScan.disabled = false;
            btnCancelScan.style.display = "none";
            scanProgress.style.display = "none";
            btnExtractTokens.disabled = false;
      const issues = msg.issues || [];
            
            currentReportData.context = msg.context || null;
            renderResults(issues);
            
            // Save to history after successful scan (with full data)
            const scope = document.querySelector('input[name="scope"]:checked')?.value || "page";
            saveScanHistory(scope, "issues", { issues: issues }, msg.context || null);
          }
          if (msg && msg.type === "tokens-report") {
            // Reset UI state
            btnExtractTokens.style.display = "block";
            btnExtractTokens.disabled = false;
            btnCancelScan.style.display = "none";
            scanProgress.style.display = "none";
            btnScan.disabled = false;
            if (msg.error) {
              resultsTokens.innerHTML = `<div class="error-message">Error: ${escapeHtml(msg.error)}</div>`;
              switchToTab("tokens");
            } else {
              currentReportData.context = msg.context || null;
              renderTokens(msg.tokens);
              btnFillSpacingScale.disabled = !(msg.tokens && Array.isArray(msg.tokens.spacing) && msg.tokens.spacing.length > 0);
              btnFillColorScale.disabled = !(msg.tokens && Array.isArray(msg.tokens.colors) && msg.tokens.colors.length > 0);
              btnFillFontSizeScale.disabled = !(msg.tokens && Array.isArray(msg.tokens.fontSize) && msg.tokens.fontSize.length > 0);
              btnFillLineHeightScale.disabled = !(msg.tokens && Array.isArray(msg.tokens.lineHeight) && msg.tokens.lineHeight.length > 0);
              
              // Save to history after successful extract (with full data)
              const scope = document.querySelector('input[name="scope"]:checked')?.value || "page";
              saveScanHistory(scope, "tokens", { tokens: msg.tokens }, msg.context || null);
      }
    }

    if (msg && msg.type === "typography-styles-extracted") {
      if (msg.styles && Array.isArray(msg.styles) && msg.styles.length > 0) {
        const modeLabel = msg.mode === "desktop" ? "Desktop" : 
                         msg.mode === "tablet" ? "Tablet" : 
                         msg.mode === "mobile" ? "Mobile" : "All";
        
        // Clear existing styles and replace with extracted ones
        typographyStyles = msg.styles.map((style, index) => {
          return {
            id: index + 1,
            name: style.name,
            styleId: style.styleId, // Store styleId for "Select" button
            fontFamily: style.fontFamily,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            lineHeight: style.lineHeight,
            letterSpacing: style.letterSpacing || "0",
            wordSpacing: style.wordSpacing || "0"
          };
        });
        
        nextTypoStyleId = typographyStyles.length + 1;
        
        // Re-render table
        renderTypographyTable();
        
        // Save to storage
        saveInputValues();
        
        alert(`✅ Successfully imported ${msg.styles.length} ${modeLabel} typography styles from Figma!\n\nStyles: ${msg.styles.map(s => s.name).join(", ")}`);
      } else {
        const modeLabel = msg.mode === "desktop" ? "Desktop" : 
                         msg.mode === "tablet" ? "Tablet" : 
                         msg.mode === "mobile" ? "Mobile" : "";
        alert(`⚠️ No ${modeLabel.toLowerCase()} text styles found in this Figma file.\n\nMake sure you have defined text styles in your design system.`);
      }
    }

    if (msg && msg.type === "color-styles-extracted") {
      if (msg.colors && Array.isArray(msg.colors) && msg.colors.length > 0) {
        const input = document.getElementById("color-scale");
        if (!input) return;

        // Extract unique hex colors
        const uniqueColors = Array.from(new Set(msg.colors.map(c => c.hex)));

        const sortedColors = uniqueColors.sort((a, b) => {
          return getColorBrightness(a) - getColorBrightness(b);
        });

        // Build color name map for tooltips
        colorNameMap = {};
        msg.colors.forEach(c => {
          if (c.hex && c.name) {
            colorNameMap[c.hex.toUpperCase()] = c.name;
          }
        });

        input.value = sortedColors.join(", ");

        // Render color preview
        if (typeof renderColorPreview === "function") renderColorPreview();

        // Save to storage
        saveInputValues();

        // Visual feedback
        try {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        } catch (e) {
          // ignore
        }

        alert(`✅ Successfully imported ${msg.colors.length} color styles from Figma!\n\nColors: ${msg.colors.map(c => c.name + " (" + c.hex + ")").join(", ")}`);
      } else {
        alert("⚠️ No color styles found in this Figma file.\n\nMake sure you have defined color styles (paint styles) in your design system.");
      }
    }

    if (msg && msg.type === "color-variables-extracted") {
      if (msg.colors && Array.isArray(msg.colors) && msg.colors.length > 0) {
        const input = document.getElementById("color-scale");
        if (!input) return;

        // Extract unique hex colors
        const uniqueColors = Array.from(new Set(msg.colors.map(c => c.hex)));

        const sortedColors = uniqueColors.sort((a, b) => {
          return getColorBrightness(a) - getColorBrightness(b);
        });

        // Build color name map for tooltips
        colorNameMap = {};
        msg.colors.forEach(c => {
          if (c.hex && c.name) {
            colorNameMap[c.hex.toUpperCase()] = c.name;
          }
        });

        input.value = sortedColors.join(", ");

        // Render color preview
        if (typeof renderColorPreview === "function") renderColorPreview();

        // Save to storage
        saveInputValues();

        // Visual feedback
        try {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        } catch (e) {
          // ignore
        }

        alert(`✅ Successfully imported ${msg.colors.length} color variables from Figma!\n\nColors: ${msg.colors.map(c => c.name + " (" + c.hex + ")").join(", ")}`);
      } else {
        alert("⚠️ No color variables found in this Figma file.\n\nMake sure you have defined color variables in your design system.");
      }
    }
  };
})();