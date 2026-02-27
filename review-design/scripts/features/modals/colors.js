import { showFixMessage } from "../fixMessage.js";
import { getContrastTextColor } from "../../utils/color.js";
import { escapeHtml } from "../../utils/html.js";

// Helper function to calculate color distance (simple RGB distance)
function calculateColorDistance(color1, color2) {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substr(0, 2), 16);
  const g1 = parseInt(hex1.substr(2, 2), 16);
  const b1 = parseInt(hex1.substr(4, 2), 16);

  const r2 = parseInt(hex2.substr(0, 2), 16);
  const g2 = parseInt(hex2.substr(2, 2), 16);
  const b2 = parseInt(hex2.substr(4, 2), 16);

  // Euclidean distance in RGB space
  return Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
}

// Helper function to calculate similarity percentage (max distance is ~441 for black to white)
function calculateColorSimilarity(color1, color2) {
  const maxDistance = 441.67; // sqrt(255^2 * 3)
  const distance = calculateColorDistance(color1, color2);
  return Math.round((1 - distance / maxDistance) * 100);
}

// Helper function to create color picker item with consistent styling
export function createColorPickerItem(color, colorName, borderColor, additionalInfo = "", rightLabel = "") {
  // keep for potential future styling (currently unused but harmless)
  getContrastTextColor(color);

  return `
      <div class="color-picker-item" data-color="${escapeHtml(color)}" style="
        padding: 7px;
        margin-bottom: 8px;
        border: 1px solid ${borderColor};
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        background: white;
        transition: all 0.2s;
      " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${borderColor}'; this.style.boxShadow='none'">
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: ${escapeHtml(color)};
          border: 1px solid #ddd;
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 12px; color: #333; margin-bottom: 4px;">
            ${colorName || escapeHtml(color)}
          </div>
          <div style="font-size: 10px; color: #666; font-family: 'SF Mono', Monaco, monospace;">
            ${escapeHtml(color)}
          </div>
          ${additionalInfo ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">${additionalInfo}</div>` : ""}
        </div>
        ${rightLabel ? `<div style="color: #0071e3; font-weight: 600; margin-left: auto;">${rightLabel}</div>` : ""}
      </div>
    `;
}

// Show color picker modal (updated to accept currentColor parameter)
export function showColorPickerModal(issue, currentColor, availableColors, colorNameMap = {}) {
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
      const colorName = colorNameMap[color] || "";
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
            <div style="font-family: 'SF Mono', Monaco, monospace; font-size: 11px; font-weight: 600;">${escapeHtml(
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
      showColorFixConfirmModal(issue, currentColor, selectedColor, colorNameMap);
    };
  });
}

// Show color fix confirm modal with top 5 similar colors
export function showColorFixConfirmModal(issue, currentColor, suggestedColor, colorNameMap = {}, availableColors = [], callbacks = {}) {
  const { onApply, onIgnore, onCancel, showIgnore = false, progress } = callbacks;

  // Get available colors from colorNameMap if not provided
  let colors = availableColors.length > 0 ? availableColors : Object.keys(colorNameMap);

  // If still empty, just use the suggested color
  if (colors.length === 0 && suggestedColor) {
    colors = [suggestedColor];
  }

  // Calculate similarity and sort by closest match
  const sortedColors = colors
    .map(color => ({
      color,
      name: colorNameMap[color] || color,
      similarity: calculateColorSimilarity(currentColor, color)
    }))
    .sort((a, b) => {
      // Put suggested color first if provided
      if (suggestedColor && a.color === suggestedColor) return -1;
      if (suggestedColor && b.color === suggestedColor) return 1;
      return b.similarity - a.similarity;
    })
    .slice(0, 5);

  if (sortedColors.length === 0) {
    alert("No colors available");
    return;
  }

  // Track selected color (default to first one)
  let selectedColorValue = sortedColors[0].color;

  // Build color option HTML
  const buildColorOptionHtml = (colorData, isSelected) => {
    return `
      <div class="color-option-item" data-color="${escapeHtml(colorData.color)}" style="
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 1px solid ${isSelected ? '#0071e3' : '#e0e0e0'};
        border-radius: 8px;
        cursor: pointer;
        background: ${isSelected ? '#e3f2fd' : 'white'};
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.15s;
      ">
        <input type="radio" name="color-option" ${isSelected ? 'checked' : ''} style="margin: 0; cursor: pointer;" />
        <div style="
          width: 36px;
          height: 36px;
          border-radius: 6px;
          background: ${escapeHtml(colorData.color)};
          border: 1px solid ${isSelected ? '#0071e3' : '#ddd'};
          flex-shrink: 0;
        "></div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: #333;">${escapeHtml(colorData.name)}</div>
          <div style="font-size: 11px; color: #666; font-family: 'SF Mono', Monaco, monospace;">${escapeHtml(colorData.color)}</div>
        </div>
        <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${colorData.similarity}%</span>
      </div>
    `;
  };

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "color-fix-confirm-modal-overlay";

  // Create modal dialog
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "420px";

  const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';

  const colorOptionsHtml = sortedColors.map((colorData, index) => buildColorOptionHtml(colorData, index === 0)).join('');

  dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Apply Suggested Color</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 32px;
            height: 32px;
            border-radius: 4px;
            background: ${escapeHtml(currentColor)};
            border: 1px solid #ddd;
          "></div>
          <div>
            <div style="font-size: 11px; color: #666;">Current:</div>
            <div style="font-size: 12px; font-weight: 600; font-family: 'SF Mono', Monaco, monospace;">${escapeHtml(currentColor)}</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a color to apply (Top 5 matches):
        </div>
        <div id="color-options-container" style="max-height: 280px; overflow-y: auto;">
          ${colorOptionsHtml}
        </div>
      </div>
      <div class="modal-footer">
        ${showIgnore ? `<button class="modal-btn modal-btn-cancel" id="color-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>` : ''}
        <button class="modal-btn modal-btn-cancel" id="color-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="color-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const cancelBtn = dialog.querySelector("#color-fix-confirm-cancel-btn");
  const applyBtn = dialog.querySelector("#color-fix-confirm-apply-btn");
  const ignoreBtn = dialog.querySelector("#color-fix-ignore-btn");
  const closeBtn = dialog.querySelector(".modal-close");
  const colorOptionsContainer = dialog.querySelector("#color-options-container");

  // Function to update selection UI
  const updateSelection = (newSelectedColor) => {
    selectedColorValue = newSelectedColor;
    const items = colorOptionsContainer.querySelectorAll(".color-option-item");
    items.forEach(item => {
      const itemColor = item.getAttribute("data-color");
      const isSelected = itemColor === newSelectedColor;
      item.style.border = isSelected ? "2px solid #0071e3" : "2px solid #e0e0e0";
      item.style.background = isSelected ? "#e3f2fd" : "white";
      const radio = item.querySelector('input[type="radio"]');
      if (radio) radio.checked = isSelected;
    });
  };

  // Attach click handlers to color options
  const attachOptionHandlers = () => {
    const items = colorOptionsContainer.querySelectorAll(".color-option-item");
    items.forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        const color = item.getAttribute("data-color");
        updateSelection(color);
      };
    });
  };
  attachOptionHandlers();

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
  cancelBtn.onclick = () => {
    closeModal();
    if (onCancel && typeof onCancel === "function") {
      onCancel();
    }
  };
  closeBtn.onclick = () => {
    closeModal();
    if (onCancel && typeof onCancel === "function") {
      onCancel();
    }
  };

  // Click overlay to close
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
      if (onCancel && typeof onCancel === "function") {
        onCancel();
      }
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
          color: selectedColorValue
        }
      },
      "*"
    );

    if (onApply && typeof onApply === "function") {
      onApply();
    }
  };

  // Ignore button
  if (ignoreBtn) {
    ignoreBtn.onclick = () => {
      closeModal();
      if (onIgnore && typeof onIgnore === "function") {
        onIgnore();
      }
    };
  }
}
