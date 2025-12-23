export function showFixMessage(issueId, message, isSuccess) {
  if (!message) return;
  let issueEl = document.querySelector(`.issue[data-issue-id="${issueId}"]`);
  if (!issueEl) {
    // Try to find by button data-id
    const btn = document.querySelector(`button.btn-fix[data-id="${issueId}"]`);
    if (btn) {
      issueEl = btn.closest(".issue");
    }
  }

  if (!issueEl) return;

  // Remove existing message if any
  const existingMsg = issueEl.querySelector(".fix-message");
  if (existingMsg) existingMsg.remove();

  // Create message element
  const msgEl = document.createElement("div");
  msgEl.className = "fix-message";
  msgEl.style.cssText = `
      margin-top: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      background: ${isSuccess ? "#d4edda" : "#f8d7da"};
      color: ${isSuccess ? "#155724" : "#721c24"};
      border: 1px solid ${isSuccess ? "#c3e6cb" : "#f5c6cb"};
      animation: slideIn 0.3s ease-out;
    `;
  msgEl.textContent = message;

  // Insert after issue-header
  const issueHeader = issueEl.querySelector(".issue-header");
  if (issueHeader) {
    issueHeader.parentNode.insertBefore(msgEl, issueHeader.nextSibling);
  } else {
    issueEl.appendChild(msgEl);
  }

  // Auto-hide after 5 seconds
  setTimeout(() => {
    msgEl.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => {
      if (msgEl.parentNode) {
        msgEl.remove();
      }
    }, 300);
  }, 5000);
}


