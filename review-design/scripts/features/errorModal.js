import { escapeHtml } from "../utils/html.js";

export function showErrorModal(errorMessage) {
  console.log("[showErrorModal] Called with message:", errorMessage);

  // Remove any existing error modal
  const existingModal = document.getElementById("error-modal-overlay");
  if (existingModal) {
    console.log("[showErrorModal] Removing existing modal");
    existingModal.remove();
  }

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "error-modal-overlay";
  console.log("[showErrorModal] Created overlay element");

  const dialog = document.createElement("div");
  dialog.className = "modal-dialog";
  dialog.style.maxWidth = "450px";

  // Clean error message (remove emoji prefixes if any)
  const cleanMessage = String(errorMessage || "").replace(/^[❌⚠️✅]\s*/, "").trim();

  dialog.innerHTML = `
      <div class="modal-header">
        <button class="modal-close" aria-label="Close">×</button>
        <h2 class="modal-title" style="color: #dc3545;">⚠️ Error</h2>
      </div>
      <div class="modal-body">
        <div style="padding: 16px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 6px; margin-bottom: 16px;">
          <div style="font-size: 14px; color: #721c24; line-height: 1.6;">
            ${escapeHtml(cleanMessage)}
          </div>
        </div>
        <div style="font-size: 12px; color: #666; line-height: 1.5;">
          Please check the issue and try again. If the problem persists, you may need to switch to Design Mode or edit the main component directly.
        </div>
      </div>
      <div class="modal-footer">
        <button class="modal-btn modal-btn-primary" id="error-modal-ok-btn" style="background: #dc3545; border-color: #dc3545; color: white;">OK</button>
      </div>
    `;

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
  console.log("[showErrorModal] Appended overlay to body, overlay visible:", overlay.offsetParent !== null);

  // Force display
  overlay.style.display = "flex";
  overlay.style.visibility = "visible";
  overlay.style.opacity = "1";

  const okBtn = dialog.querySelector("#error-modal-ok-btn");
  const closeBtn = dialog.querySelector(".modal-close");
  console.log("[showErrorModal] Found buttons:", { okBtn: !!okBtn, closeBtn: !!closeBtn });

  if (!okBtn) {
    console.error("[showErrorModal] OK button not found!");
    return;
  }

  const closeModal = () => {
    overlay.style.animation = "fadeIn 0.2s ease-out reverse";
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    }, 200);
  };

  okBtn.onclick = closeModal;
  if (closeBtn) {
    closeBtn.onclick = closeModal;
  }
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  };

  // Focus on OK button for accessibility
  setTimeout(() => {
    okBtn.focus();
  }, 100);

  console.log("[showErrorModal] Modal setup complete");
}


