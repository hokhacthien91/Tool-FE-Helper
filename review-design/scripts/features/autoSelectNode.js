export function setupAutoSelectNodeFromIssueClick() {
  // Auto jump to the node when user clicks an action button inside an issue item.
  // Use capture phase so it runs before other onclick handlers that may stop propagation.
  function autoSelectNodeFromIssueClick(e) {
    try {
      const btn = e.target && e.target.closest ? e.target.closest("button") : null;
      if (!btn) return;
      const issueEl = btn.closest ? btn.closest(".issue") : null;
      if (!issueEl) return;
      // Only run for buttons in the issue action area (avoid selecting when clicking in other places)
      const inActions = btn.closest && btn.closest(".issue-actions");
      if (!inActions) return;

      const issueId = btn.getAttribute("data-id") || issueEl.getAttribute("data-issue-id");
      if (!issueId) return;

      parent.postMessage({ pluginMessage: { type: "select-node", id: issueId } }, "*");
    } catch (err) {
      // Never block the original click behavior
      console.error("autoSelectNodeFromIssueClick error:", err);
    }
  }

  document.addEventListener("click", autoSelectNodeFromIssueClick, true);
}


