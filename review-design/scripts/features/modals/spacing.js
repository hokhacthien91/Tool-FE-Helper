import { showFixMessage } from "../fixMessage.js";
import { escapeHtml } from "../../utils/html.js";

// Helper function to calculate spacing similarity
function calculateSpacingSimilarity(currentValue, targetValue) {
  if (currentValue === targetValue) return 100;
  const maxDiff = 100; // Consider values more than 100px apart as 0% similar
  const diff = Math.abs(currentValue - targetValue);
  return Math.max(0, Math.round((1 - diff / maxDiff) * 100));
}

export function showSpacingPickerModal(issue, propertyName, currentValue, availableValues) {
  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "spacing-picker-modal-overlay";

  // Create modal dialog
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "400px";

  // Build spacing list HTML
  const spacingListHtml = availableValues
    .map((value) => {
      return `
        <div class="spacing-picker-item" data-value="${value}" style="
          padding: 12px;
          margin-bottom: 8px;
          border: 2px solid ${currentValue === value ? "#0071e3" : "#ddd"};
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          transition: all 0.2s;
        " onmouseover="this.style.borderColor='#0071e3'; this.style.boxShadow='0 2px 8px rgba(0,113,227,0.2)'" onmouseout="this.style.borderColor='${
          currentValue === value ? "#0071e3" : "#ddd"
        }'; this.style.boxShadow='none'">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 4px;
              background: #f0f0f0;
              border: 1px solid #ddd;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: 600;
              color: #666;
            ">${value}px</div>
            <div style="font-weight: 600; font-size: 14px; color: #333;">
              ${value}px
            </div>
          </div>
          ${currentValue === value ? '<div style="color: #0071e3; font-weight: 600;">Current</div>' : ""}
        </div>
      `;
    })
    .join("");

  // Format property name for display
  const propertyDisplayName = String(propertyName || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Choose Spacing Value</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")} - ${escapeHtml(
    propertyDisplayName
  )}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px;">
          <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Current Value:</div>
          <div style="font-size: 16px; font-weight: 600; color: #333;">${currentValue}px</div>
        </div>
        <div style="max-height: 300px; overflow-y: auto;">
          ${spacingListHtml}
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-picker-modal-cancel-btn">Cancel</button>
      </div>
    `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const cancelBtn = dialog.querySelector("#spacing-picker-modal-cancel-btn");
  const closeBtn = dialog.querySelector(".modal-close");
  const spacingItems = dialog.querySelectorAll(".spacing-picker-item");

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

  // Spacing item clicks
  spacingItems.forEach((item) => {
    item.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const selectedValue = parseInt(item.getAttribute("data-value"), 10);
      closeModal();
      // Show confirm modal
      showSpacingFixConfirmModal(issue, propertyName, currentValue, selectedValue);
    };
  });
}

// Show spacing fix confirm modal with top 5 similar values
export function showSpacingFixConfirmModal(issue, propertyName, currentValue, suggestedValue, availableValues = [], callbacks = {}) {
  const { onApply, onIgnore, onCancel, showIgnore = false, progress } = callbacks;

  // Format property name for display
  const propertyDisplayName = String(propertyName || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  // Get available values or use default scale
  let values = availableValues.length > 0 ? availableValues : [0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 72, 80, 88, 96];

  // Calculate similarity and sort by closest match
  const sortedValues = values
    .map(value => ({
      value,
      similarity: calculateSpacingSimilarity(currentValue, value),
      diff: Math.abs(currentValue - value)
    }))
    .sort((a, b) => {
      // Put suggested value first if provided
      if (suggestedValue !== undefined && a.value === suggestedValue) return -1;
      if (suggestedValue !== undefined && b.value === suggestedValue) return 1;
      // Sort by smallest difference (closest match)
      return a.diff - b.diff;
    })
    .slice(0, 5);

  if (sortedValues.length === 0) {
    alert("No spacing values available");
    return;
  }

  // Track selected value (default to first one)
  let selectedSpacingValue = sortedValues[0].value;

  // Build spacing option HTML
  const buildSpacingOptionHtml = (spacingData, isSelected) => {
    const isDifferent = spacingData.value !== currentValue;
    return `
      <div class="spacing-option-item" data-value="${spacingData.value}" style="
        padding: 10px 12px;
        margin-bottom: 6px;
        border: 2px solid ${isSelected ? '#0071e3' : '#e0e0e0'};
        border-radius: 8px;
        cursor: pointer;
        background: ${isSelected ? '#e3f2fd' : 'white'};
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.15s;
      ">
        <input type="radio" name="spacing-option" ${isSelected ? 'checked' : ''} style="margin: 0; cursor: pointer;" />
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 6px;
          background: ${isSelected ? '#e3f2fd' : '#f0f0f0'};
          border: 2px solid ${isSelected ? '#0071e3' : '#ddd'};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          color: ${isSelected ? '#0071e3' : '#666'};
          flex-shrink: 0;
        ">${spacingData.value}</div>
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 13px; color: #333;">${spacingData.value}px</div>
          <div style="font-size: 10px; color: ${isDifferent ? '#721c24' : '#155724'};">
            ${isDifferent ? `⚠ Δ${spacingData.value > currentValue ? '+' : ''}${spacingData.value - currentValue}px` : '✓ Same'}
          </div>
        </div>
        <span style="font-size: 11px; color: #666; background: #f0f0f0; padding: 2px 8px; border-radius: 10px;">${spacingData.similarity}%</span>
      </div>
    `;
  };

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "spacing-fix-confirm-modal-overlay";

  // Create modal dialog
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "420px";

  const progressHtml = progress ? `<div style="margin-bottom: 12px; padding: 8px 12px; background: #e3f2fd; border-radius: 6px; font-size: 13px; color: #1976d2; font-weight: 600;">Progress: ${progress.current}/${progress.total}</div>` : '';

  const spacingOptionsHtml = sortedValues.map((spacingData, index) => buildSpacingOptionHtml(spacingData, index === 0)).join('');

  dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Apply Suggested Spacing</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")} - ${escapeHtml(propertyDisplayName)}</p>
      </div>
      ${progressHtml}
      <div class="modal-body">
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px; display: flex; align-items: center; gap: 10px;">
          <div style="
            width: 40px;
            height: 40px;
            border-radius: 4px;
            background: #f0f0f0;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            color: #666;
          ">${currentValue}</div>
          <div>
            <div style="font-size: 11px; color: #666;">Current ${escapeHtml(propertyDisplayName)}:</div>
            <div style="font-size: 14px; font-weight: 600;">${currentValue}px</div>
          </div>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: #333; margin-bottom: 8px;">
          Select a value to apply (Top 5 closest):
        </div>
        <div id="spacing-options-container" style="max-height: 280px; overflow-y: auto;">
          ${spacingOptionsHtml}
        </div>
      </div>
      <div class="modal-footer">
        ${showIgnore ? `<button class="modal-btn modal-btn-cancel" id="spacing-fix-ignore-btn" style="background: #6c757d; border-color: #6c757d; color: white;">Ignore</button>` : ''}
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="spacing-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const cancelBtn = dialog.querySelector("#spacing-fix-confirm-cancel-btn");
  const applyBtn = dialog.querySelector("#spacing-fix-confirm-apply-btn");
  const ignoreBtn = dialog.querySelector("#spacing-fix-ignore-btn");
  const closeBtn = dialog.querySelector(".modal-close");
  const spacingOptionsContainer = dialog.querySelector("#spacing-options-container");

  // Function to update selection UI
  const updateSelection = (newSelectedValue) => {
    selectedSpacingValue = newSelectedValue;
    const items = spacingOptionsContainer.querySelectorAll(".spacing-option-item");
    items.forEach(item => {
      const itemValue = parseInt(item.getAttribute("data-value"), 10);
      const isSelected = itemValue === newSelectedValue;
      item.style.border = isSelected ? "2px solid #0071e3" : "2px solid #e0e0e0";
      item.style.background = isSelected ? "#e3f2fd" : "white";
      const radio = item.querySelector('input[type="radio"]');
      if (radio) radio.checked = isSelected;
    });
  };

  // Attach click handlers to spacing options
  const attachOptionHandlers = () => {
    const items = spacingOptionsContainer.querySelectorAll(".spacing-option-item");
    items.forEach(item => {
      item.onclick = (e) => {
        e.preventDefault();
        const value = parseInt(item.getAttribute("data-value"), 10);
        updateSelection(value);
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
    showFixMessage(issue.id, "⏳ Fixing spacing...", true);

    // Send fix spacing request
    parent.postMessage(
      {
        pluginMessage: {
          type: "fix-spacing-issue",
          issue: issue,
          propertyName: propertyName,
          value: selectedSpacingValue
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
