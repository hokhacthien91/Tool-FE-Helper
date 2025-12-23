function getIssuesSummaryHTML(issues) {
  const stats = {
    error: issues.filter(i => i.severity === "error").length,
    warn: issues.filter(i => i.severity === "warn").length,
    total: issues.length
  };
  return `\n    <div class=\"section\">\n      <h2 class=\"section-title\">📊 Summary</h2>\n      <div class=\"stats\">\n        ${stats.error > 0 ? `<div class=\"stat-card error\"><div class=\"value\">${stats.error}</div><div class=\"label\">Errors</div></div>` : ''}\n        ${stats.warn > 0 ? `<div class=\"stat-card warn\"><div class=\"value\">${stats.warn}</div><div class=\"label\">Warnings</div></div>` : ''}\n        <div class=\"stat-card\"><div class=\"value\">${stats.total}</div><div class=\"label\">Total Issues</div></div>\n      </div>\n    </div>`;
}

module.exports = getIssuesSummaryHTML;

