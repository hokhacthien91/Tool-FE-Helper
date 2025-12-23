import { showFixMessage } from "../fixMessage.js";
import { escapeHtml } from "../../utils/html.js";
import { getContrastTextColor } from "../../utils/color.js";

// Helper function to create color picker item with consistent styling
// Note: `colorName` may contain HTML (used by contrast picker), so we do NOT escape it here.
export function createColorPickerItem(color, colorName, borderColor, additionalInfo, rightLabel) {
  // Keep parity with the old implementation (even if textColor isn't used today).
  getContrastTextColor(color);

  const safeAdditionalInfo = additionalInfo || "";
  const safeRightLabel = rightLabel || "";

  return `
      <div class="color-picker-item" data-color="${escapeHtml(color)}" style="
        padding: 12px;
        margin-bottom: 8px;
        border: 2px solid ${borderColor};
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        background: white;
        transition: all 0.2s;
      " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${borderColor}'; this.style.boxShadow='none'">
        <div style="
          width: 48px;
          height: 48px;
          border-radius: 6px;
          background: ${escapeHtml(color)};
          border: 2px solid #ddd;
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 14px; color: #333; margin-bottom: 4px;">
            ${colorName || escapeHtml(color)}
          </div>
          <div style="font-size: 12px; color: #666; font-family: 'SF Mono', Monaco, monospace;">
            ${escapeHtml(color)}
          </div>
          ${safeAdditionalInfo ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${safeAdditionalInfo}</div>` : ""}
        </div>
        ${safeRightLabel ? `<div style="color: #0071e3; font-weight: 600; margin-left: auto;">${safeRightLabel}</div>` : ""}
      </div>
    `;
}

// Show color picker modal (updated to accept currentColor parameter)
export function showColorPickerModal(issue, currentColor, availableColors, colorNameMap) {
  // If currentColor not provided, extract from issue message
  if (!currentColor) {
    const message = issue.message || "";
    const colorMatch = message.match(/Color (#[0-9A-Fa-f]{6})/);
    currentColor = colorMatch ? colorMatch[1].toUpperCase() : null;
  }

  if (!currentColor) {
    alert("Cannot determine current color from issue message");
    return;
  }

  const colorNameMapSafe = colorNameMap || {};

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "color-picker-modal-overlay";

  // Create modal dialog
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "400px";

  // Build color list HTML with consistent styling
  const colorListHtml = availableColors
    .map((color) => {
      const colorName = colorNameMapSafe[color] || "";
      const borderColor = currentColor === color ? "#0071e3" : "#ddd";
      const rightLabel = currentColor === color ? "Current" : "";
      return createColorPickerItem(color, colorName || color, borderColor, "", rightLabel);
    })
    .join("");

  dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Choose Color</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Color:</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 32px; height: 32px; border-radius: 4px; background: ${escapeHtml(
              currentColor
            )}; border: 1px solid #ddd;"></div>
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 13px; font-weight: 600;">${escapeHtml(
              currentColor
            )}</div>
          </div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${colorListHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-picker-modal-cancel-btn">Cancel</button>
      </div>
    `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const cancelBtn = dialog.querySelector("#color-picker-modal-cancel-btn");
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
  colorItems.forEach((item) => {
    item.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selectedColor = item.getAttribute("data-color");
      closeModal();
      // Show confirm modal
      showColorFixConfirmModal(issue, currentColor, selectedColor, colorNameMapSafe);
    };
  });
}

// Show color fix confirm modal
export function showColorFixConfirmModal(issue, currentColor, selectedColor, colorNameMap) {
  const colorNameMapSafe = colorNameMap || {};
  const colorName = colorNameMapSafe[selectedColor] || selectedColor;

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "color-fix-confirm-modal-overlay";

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
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Change color from:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 6px; background: ${escapeHtml(
              currentColor
            )}; border: 2px solid #ddd;"></div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(currentColor)}</div>
            </div>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">To:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="width: 48px; height: 48px; border-radius: 6px; background: ${escapeHtml(
              selectedColor
            )}; border: 2px solid #0071e3;"></div>
            <div>
              <div style="font-weight: 600; font-size: 14px; color: #333;">${escapeHtml(colorName)}</div>
              <div style="font-size: 12px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${escapeHtml(
                selectedColor
              )}</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="color-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="color-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const cancelBtn = dialog.querySelector("#color-fix-confirm-cancel-btn");
  const applyBtn = dialog.querySelector("#color-fix-confirm-apply-btn");
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

  // Cancel button
  cancelBtn.onclick = closeModal;
  closeBtn.onclick = closeModal;

  // Click overlay to close
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  };

  // Apply button
  applyBtn.onclick = () => {
    closeModal();

    // Show loading message
    showFixMessage(issue.id, "⏳ Fixing color...", true);

    // Send fix color request
    parent.postMessage(
      {
        pluginMessage: {
          type: "fix-color-issue",
          issue: issue,
          color: selectedColor
        }
      },
      "*"
    );
  };
}


