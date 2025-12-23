import { showFixMessage } from "../fixMessage.js";
import { escapeHtml } from "../../utils/html.js";

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

export function showSpacingFixConfirmModal(issue, propertyName, currentValue, selectedValue) {
  // Format property name for display
  const propertyDisplayName = String(propertyName || "")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();

  // Create modal overlay
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "spacing-fix-confirm-modal-overlay";

  // Create modal dialog
  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "400px";

  dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title">Confirm Spacing Change</h2>
        <p class="modal-subtitle">Node: ${escapeHtml(issue.nodeName || "Unnamed")}</p>
      </div>
      <div class="modal-body">
        <div style="margin-bottom: 16px;">
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">Change ${escapeHtml(
    propertyDisplayName
  )} from:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #f5f5f5; border-radius: 6px; margin-bottom: 12px;">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 6px;
              background: #f0f0f0;
              border: 2px solid #ddd;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 600;
              color: #333;
            ">${currentValue}px</div>
            <div>
              <div style="font-weight: 600; font-size: 16px; color: #333;">${currentValue}px</div>
            </div>
          </div>
          <div style="font-size: 13px; color: #666; margin-bottom: 12px;">To:</div>
          <div style="display: flex; align-items: center; gap: 12px; padding: 12px; background: #e3f2fd; border-radius: 6px;">
            <div style="
              width: 50px;
              height: 50px;
              border-radius: 6px;
              background: #e3f2fd;
              border: 2px solid #0071e3;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 14px;
              font-weight: 600;
              color: #0071e3;
            ">${selectedValue}px</div>
            <div>
              <div style="font-weight: 600; font-size: 16px; color: #333;">${selectedValue}px</div>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-cancel" id="spacing-fix-confirm-cancel-btn">Cancel</button>
        <button class="modal-btn modal-btn-create" id="spacing-fix-confirm-apply-btn" style="background: #28a745; border-color: #28a745;">Apply</button>
      </div>
    `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Get elements
  const cancelBtn = dialog.querySelector("#spacing-fix-confirm-cancel-btn");
  const applyBtn = dialog.querySelector("#spacing-fix-confirm-apply-btn");
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
    showFixMessage(issue.id, "⏳ Fixing spacing...", true);

    // Send fix spacing request
    parent.postMessage(
      {
        pluginMessage: {
          type: "fix-spacing-issue",
          issue: issue,
          propertyName: propertyName,
          value: selectedValue
        }
      },
      "*"
    );
  };
}


