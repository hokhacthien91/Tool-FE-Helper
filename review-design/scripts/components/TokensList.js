function getTokensHTML(tokens, escapeHtml) {
  let html = `\n    <div class=\"section\">\n      <h2 class=\"section-title\">🎨 Design Tokens</h2>`;
  const tokenGroups = {
    colors: { label: "Colors", values: tokens.colors || [] },
    gradients: { label: "Gradients", values: tokens.gradients || [] },
    borderRadius: { label: "Border Radius", values: tokens.borderRadius || [] },
    fontWeight: { label: "Font Weight", values: tokens.fontWeight || [] },
    lineHeight: { label: "Line Height (%)", values: tokens.lineHeight || [] },
    fontSize: { label: "Font Size", values: tokens.fontSize || [] },
    fontFamily: { label: "Font Family", values: tokens.fontFamily || [] }
  };
  for (const [key, group] of Object.entries(tokenGroups)) {
    html += `\n      <div class=\"issue-group collapsed\">\n        <div class=\"issue-group-header\">\n          <button class=\"issue-group-toggle\" type=\"button\">+</button>\n          <span>${group.label} (${group.values.length})</span>\n        </div>\n        <div class=\"issue-group-content\">`;
    if (!group.values || group.values.length === 0) {
      html += `\n          <div class=\"token-empty-message\">No tokens in this group.</div>`;
      html += `\n        </div>\n      </div>`;
      continue;
    }
    html += `\n          <div class=\"token-list\">`;
    group.values.forEach(token => {
      const tokenValue = token.value;
      const nodeCount = (typeof token.totalNodes === "number") ? token.totalNodes : (token.nodes ? token.nodes.length : 0);
      const colorType = token.colorType || "";
      if (key === "colors") {
        html += `\n          <div class=\"token-item\">\n            <div class=\"token-value\">\n              <span class=\"token-color-preview\" style=\"background-color: ${escapeHtml(tokenValue)}\"></span>\n              ${escapeHtml(tokenValue)}\n              ${colorType ? `<span class=\"token-color-type\">${escapeHtml(colorType)}</span>` : ''}\n            </div>\n            ${nodeCount > 1 ? `<div class=\"token-node-count\">Used in ${nodeCount} nodes</div>` : ''}\n          </div>`;
      } else if (key === "gradients") {
        html += `\n          <div class=\"token-item\">\n            <div class=\"token-value\">\n              <span class=\"token-color-preview\" style=\"background: ${escapeHtml(tokenValue)}\"></span>\n              ${escapeHtml(tokenValue)}\n              ${colorType ? `<span class=\"token-color-type\">${escapeHtml(colorType)}</span>` : ''}\n            </div>\n            ${nodeCount > 1 ? `<div class=\"token-node-count\">Used in ${nodeCount} nodes</div>` : ''}\n          </div>`;
      } else {
        let extraNote = "";
        if (key === "fontWeight") {
          let list = Array.isArray(token.fontFamilies) ? token.fontFamilies : null;
          if (!list) {
            const counts = {};
            const nodes = Array.isArray(token.nodes) ? token.nodes : [];
            nodes.forEach(n => {
              const fam = (n && n.fontFamily) ? String(n.fontFamily) : "Unknown";
              counts[fam] = (counts[fam] || 0) + 1;
            });
            list = Object.entries(counts).map(([family, count]) => ({ family, count })).sort((a, b) => (b.count - a.count) || a.family.localeCompare(b.family));
          }
          if (Array.isArray(list) && list.length > 0) {
            const items = list.map(x => `${escapeHtml(x.family)} (${x.count})`).join("<br/>");
            extraNote = `<div class=\"token-node-count\" style=\"margin-top: 6px;\">Font-family:<br/>${items}</div>`;
          }
        }
        html += `\n          <div class=\"token-item\">\n            <div class=\"token-value\">${escapeHtml(String(tokenValue))}</div>\n            ${nodeCount > 1 ? `<div class=\"token-node-count\">Used in ${nodeCount} nodes</div>` : ''}\n            ${extraNote}\n          </div>`;
      }
    });
    html += `\n          </div>\n        </div>\n      </div>`;
  }
  html += `\n    </div>`;
  return html;
}

module.exports = getTokensHTML;

