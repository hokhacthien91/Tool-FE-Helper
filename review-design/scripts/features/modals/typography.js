import { showFixMessage } from "../fixMessage.js";
import { escapeHtml } from "../../utils/html.js";

export function showTypographyStylePicker(typographyStyles, onSelect) {
  if (!typographyStyles || typographyStyles.length === 0) {
    alert("No typography styles available. Please add styles in Typography Settings.");
    return;
  }

  // Create dropdown overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.style.zIndex = "10001";

  const dropdown = document.createElement("div");
  dropdown.className = "modal-dialog";
  dropdown.style.maxWidth = "300px";
  dropdown.style.padding = "0";

  dropdown.innerHTML = `
      <div class="modal-header" style="padding: 16px;">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title" style="font-size: 14px;">Choose Typography Style</h2>
      </div>
      <div style="max-height: 300px; overflow-y: auto;">
        ${typographyStyles
          .map((style) => {
            const name = escapeHtml(style.name || "");
            const fontFamily = escapeHtml(style.fontFamily || "");
            const fontSize = escapeHtml(style.fontSize || "");
            const fontWeight = escapeHtml(style.fontWeight || "");
            return `
          <div class="style-dropdown-item" data-style-id="${style.id}" style="padding: 12px 16px; cursor: pointer; font-size: 13px; border-bottom: 1px solid #f0f0f0;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
            <div style="font-weight: 600; color: #333;">${name}</div>
            <div style="font-size: 11px; color: #666; margin-top: 4px;">
              ${fontFamily} ${fontSize}px ${fontWeight}
            </div>
          </div>
        `;
          })
          .join("")}
      </div>
    `;

  overlay.appendChild(dropdown);
  document.body.appendChild(overlay);

  // Close function
  const closeDropdown = () => {
    overlay.style.animation = "fadeIn 0.2s ease-out reverse";
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 200);
  };

  // Close button
  dropdown.querySelector(".modal-close").onclick = closeDropdown;

  // Click overlay to close
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeDropdown();
    }
  };

  // Item clicks
  dropdown.querySelectorAll(".style-dropdown-item").forEach((item) => {
    item.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const styleId = parseInt(item.getAttribute("data-style-id"), 10);
      const style = typographyStyles.find((s) => s.id === styleId);
      if (style && onSelect) {
        onSelect(style);
        closeDropdown();
      }
    };
  });
}

export function showTypographyFixModal(issue, typographyStyles) {
  if (!issue || !issue.bestMatch) {
    console.error("showTypographyFixModal: missing issue or bestMatch");
    return;
  }

  const currentNode = issue.nodeProps || {};
  const bestMatch = issue.bestMatch;

  // Get current values
  const currentFamily = currentNode.fontFamily || "";
  const currentSize =
    currentNode.fontSize !== null && currentNode.fontSize !== undefined ? currentNode.fontSize : "";
  const currentWeight = currentNode.fontWeight || "";
  const currentLineHeight = currentNode.lineHeight || "";
  const currentLetterSpacing =
    currentNode.letterSpacing !== null && currentNode.letterSpacing !== undefined
      ? currentNode.letterSpacing
      : "";

  // Get suggested values from bestMatch differences
  let suggestedFamily = currentFamily;
  let suggestedSize = currentSize;
  let suggestedWeight = currentWeight;
  let suggestedLineHeight = currentLineHeight;
  let suggestedLetterSpacing = currentLetterSpacing;

  if (bestMatch.differences) {
    bestMatch.differences.forEach((diff) => {
      if (diff.property === "Font Family" && diff.expected) {
        suggestedFamily = diff.expected;
      } else if (diff.property === "Font Size" && diff.expected) {
        suggestedSize = diff.expected.replace("px", "");
      } else if (diff.property === "Font Weight" && diff.expected) {
        suggestedWeight = diff.expected;
      } else if (diff.property === "Line Height" && diff.expected) {
        suggestedLineHeight = diff.expected;
      } else if (diff.property === "Letter Spacing" && diff.expected) {
        suggestedLetterSpacing = diff.expected;
      }
    });
  }

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "typography-fix-modal-overlay";

  // Create modal dialog
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "500px";

  dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Fix Typography Style</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")} → Suggested: ${escapeHtml(
    bestMatch.name
  )}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">
            Edit values below and click Apply to fix:
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Family</label>
            <input type="text" class="modal-input" id="fix-font-family" value="${escapeHtml(
    suggestedFamily
  )}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Size (px)</label>
            <input type="number" class="modal-input" id="fix-font-size" value="${escapeHtml(
    suggestedSize
  )}" style="width: 100%;" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Font Weight</label>
            <select class="modal-input" id="fix-font-weight" style="width: 100%;">
              <option value="Regular" ${suggestedWeight === "Regular" ? "selected" : ""}>Regular</option>
              <option value="Medium" ${suggestedWeight === "Medium" ? "selected" : ""}>Medium</option>
              <option value="SemiBold" ${
                suggestedWeight === "SemiBold" || suggestedWeight === "Semi Bold" ? "selected" : ""
              }>SemiBold</option>
              <option value="Bold" ${suggestedWeight === "Bold" ? "selected" : ""}>Bold</option>
            </select>
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Line Height (% or px or auto)</label>
            <input type="text" class="modal-input" id="fix-line-height" value="${escapeHtml(
    suggestedLineHeight
  )}" style="width: 100%;" placeholder="e.g. 120%, 24px, auto" />
          </div>

          <div style="margin-bottom: 12px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #333; margin-bottom: 4px;">Letter Spacing (px or %)</label>
            <input type="text" class="modal-input" id="fix-letter-spacing" value="${escapeHtml(
    suggestedLetterSpacing
  )}" style="width: 100%;" placeholder="e.g. 0, 0.5px, 1%" />
          </div>

          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
            <button class="modal-btn modal-btn-cancel" id="choose-typo-style-btn" style="width: 100%; margin-bottom: 8px; background: #0071e3; border-color: #0071e3; color: white;">
              Choose Typography Style
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="typography-fix-modal-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="typography-fix-modal-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const fontFamilyInput = dialog.querySelector("#fix-font-family");
  const fontSizeInput = dialog.querySelector("#fix-font-size");
  const fontWeightSelect = dialog.querySelector("#fix-font-weight");
  const lineHeightInput = dialog.querySelector("#fix-line-height");
  const letterSpacingInput = dialog.querySelector("#fix-letter-spacing");
  const chooseStyleBtn = dialog.querySelector("#choose-typo-style-btn");
  const cancelBtn = dialog.querySelector("#typography-fix-modal-cancel-btn");
  const applyBtn = dialog.querySelector("#typography-fix-modal-apply-btn");
  const closeBtn = dialog.querySelector(".modal-close");

  // Focus first input
  setTimeout(() => {
    fontFamilyInput.focus();
  }, 100);

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

  // Choose Typography Style button
  chooseStyleBtn.onclick = () => {
    showTypographyStylePicker(typographyStyles, (selectedStyle) => {
      // Fill inputs with selected style values
      if (selectedStyle) {
        fontFamilyInput.value = selectedStyle.fontFamily || "";
        fontSizeInput.value = selectedStyle.fontSize || "";
        fontWeightSelect.value = selectedStyle.fontWeight || "Regular";
        lineHeightInput.value = selectedStyle.lineHeight || "";
        letterSpacingInput.value = selectedStyle.letterSpacing || "0";
      }
    });
  };

  // Apply button
  applyBtn.onclick = () => {
    // Collect values
    const fixData = {
      fontFamily: fontFamilyInput.value.trim(),
      fontSize: fontSizeInput.value.trim(),
      fontWeight: fontWeightSelect.value,
      lineHeight: lineHeightInput.value.trim(),
      letterSpacing: letterSpacingInput.value.trim()
    };

    // Validate
    if (!fixData.fontFamily) {
      fontFamilyInput.focus();
      fontFamilyInput.style.borderColor = "#ff3b30";
      setTimeout(() => {
        fontFamilyInput.style.borderColor = "#0071e3";
      }, 2000);
      return;
    }

    if (!fixData.fontSize || isNaN(parseFloat(fixData.fontSize))) {
      fontSizeInput.focus();
      fontSizeInput.style.borderColor = "#ff3b30";
      setTimeout(() => {
        fontSizeInput.style.borderColor = "#0071e3";
      }, 2000);
      return;
    }

    closeModal();

    // Show loading message
    showFixMessage(issue.id, "⏳ Fixing...", true);

    // Send fix request with custom values
    parent.postMessage(
      {
        pluginMessage: {
          type: "fix-issue",
          issue: issue,
          fixData: fixData
        }
      },
      "*"
    );
  };
}


