function getIssuesHTML(issues, escapeHtml, getTypeDisplayName) {
  const grouped = issues.reduce((acc, i) => {
    acc[i.type] = acc[i.type] || [];
    acc[i.type].push(i);
    return acc;
  }, {});
  let html = `\n    <div class=\"section\">\n      <h2 class=\"section-title\">🔍 Issues</h2>\n      <div class=\"export-filter-group\">\n        <button class=\"export-filter-btn active\" data-severity=\"all\">All</button>\n        <button class=\"export-filter-btn\" data-severity=\"error\">Errors</button>\n        <button class=\"export-filter-btn\" data-severity=\"warn\">Warnings</button>\n      </div>`;
  for (const [type, typeIssues] of Object.entries(grouped)) {
    const typeLabel = escapeHtml(getTypeDisplayName(type));
    html += `\n      <div class=\"issue-group collapsed\" data-type=\"${type}\" data-label=\"${typeLabel}\">\n        <div class=\"issue-group-header\">\n          <button class=\"issue-group-toggle\" type=\"button\">+</button>\n          <span>${typeLabel} (${typeIssues.length})</span>\n        </div>\n        <div class=\"issue-group-content\">`;
    typeIssues.forEach(issue => {
      html += `\n          <div class=\"issue ${issue.severity}\">\n            <div class=\"issue-type\">${issue.severity.toUpperCase()}</div>\n            <div class=\"issue-message\">${escapeHtml(issue.message)}</div>\n            ${issue.nodeName ? `<div class=\"issue-node\">Node: ${escapeHtml(issue.nodeName)}</div>` : ''}\n          </div>`;
    });
    html += `\n        </div>\n      </div>`;
  }
  html += `\n    </div>`;
  return html;
}

module.exports = getIssuesHTML;

