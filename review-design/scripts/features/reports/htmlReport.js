import { escapeHtml } from "../../utils/html.js";

export function generateHTMLReport({ reportData, getTypeDisplayName }) {
  const safeReport = reportData || {};
  const issues = safeReport.issues || [];
  const tokens = safeReport.tokens || null;
  const timestamp = safeReport.timestamp || Date.now();
  const date = new Date(timestamp).toLocaleString("vi-VN");
  const pageName = "Design Review"; // Could get from Figma API if needed

  const getTypeLabel = (type) => {
    try {
      return typeof getTypeDisplayName === "function" ? getTypeDisplayName(type) : String(type || "");
    } catch (e) {
      return String(type || "");
    }
  };

  let html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Design Review Report - ${date}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #1d1d1f;
      background: #f5f5f7;
      padding: 40px 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      padding: 40px;
    }
    .header {
      border-bottom: 2px solid #e5e5e7;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      color: #1d1d1f;
      margin-bottom: 8px;
    }
    .header .meta {
      color: #86868b;
      font-size: 14px;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #1d1d1f;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e5e7;
    }
    .export-filter-group {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .export-filter-btn {
      padding: 4px 10px;
      font-size: 12px;
      border-radius: 999px;
      border: 1px solid #e5e7eb;
      background: #f9fafb;
      cursor: pointer;
    }
    .export-filter-btn.active {
      background: #111827;
      color: #fff;
      border-color: #111827;
    }
    .stats {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .stat-card {
      padding: 16px 20px;
      border-radius: 8px;
      background: #f5f5f7;
      min-width: 120px;
    }
    .stat-card.error { background: #fee; color: #c33; }
    .stat-card.warn { background: #fff4e6; color: #d97706; }
    .stat-card .value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .stat-card .label {
      font-size: 12px;
      text-transform: uppercase;
      opacity: 0.8;
    }
    .issue-group {
      margin-bottom: 24px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 16px;
      background: #fff;
    }
    .issue-group-header {
      font-size: 16px;
      font-weight: 600;
      color: #1d1d1f;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .issue-group-toggle {
      border: none;
      background: #f3f4f6;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .issue-group-content {
      margin-top: 12px;
    }
    .issue-group.collapsed .issue-group-content {
      display: none;
    }
    .issue {
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 6px;
      border-left: 4px solid;
    }
    .issue.error {
      background: #fef2f2;
      border-left-color: #ef4444;
    }
    .issue.warn {
      background: #fffbeb;
      border-left-color: #f59e0b;
    }
    .issue-type {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .issue-message {
      font-size: 14px;
      margin-bottom: 4px;
    }
    .issue-node {
      font-size: 12px;
      color: #86868b;
      font-family: monospace;
      margin-top: 4px;
    }
    .token-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 12px;
    }
    .token-item {
      padding: 12px;
      background: #fafafa;
      border-radius: 6px;
      border: 1px solid #e5e5e7;
    }
    .token-value {
      font-family: monospace;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .token-color-preview {
      display: inline-block;
      width: 24px;
      height: 24px;
      border-radius: 4px;
      border: 1px solid #d1d1d6;
      vertical-align: middle;
      margin-right: 8px;
    }
    .token-color-type {
      display: inline-block;
      font-size: 10px;
      padding: 2px 6px;
      background: #667eea;
      color: white;
      border-radius: 4px;
      margin-left: 6px;
    }
    .token-node-count {
      font-size: 11px;
      color: #86868b;
      margin-top: 4px;
    }
    .token-empty-message {
      padding: 12px;
      font-size: 12px;
      color: #9ca3af;
      font-style: italic;
    }
    @media print {
      body { padding: 20px; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Design Review Report</h1>
      <div class="meta">Generated: ${date} | Page: ${pageName}</div>
    </div>`;

  if (issues && issues.length > 0) {
    const stats = {
      error: issues.filter((i) => i.severity === "error").length,
      warn: issues.filter((i) => i.severity === "warn").length,
      total: issues.length
    };

    const grouped = issues.reduce((acc, i) => {
      acc[i.type] = acc[i.type] || [];
      acc[i.type].push(i);
      return acc;
    }, {});

    html += `
    <div class="section">
      <h2 class="section-title">📊 Summary</h2>
      <div class="stats">
        ${
          stats.error > 0
            ? `<div class="stat-card error"><div class="value">${stats.error}</div><div class="label">Errors</div></div>`
            : ""
        }
        ${
          stats.warn > 0
            ? `<div class="stat-card warn"><div class="value">${stats.warn}</div><div class="label">Warnings</div></div>`
            : ""
        }
        <div class="stat-card"><div class="value">${stats.total}</div><div class="label">Total Issues</div></div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">🔍 Issues</h2>
      <div class="export-filter-group">
        <button class="export-filter-btn active" data-severity="all">All</button>
        <button class="export-filter-btn" data-severity="error">Errors</button>
        <button class="export-filter-btn" data-severity="warn">Warnings</button>
      </div>`;

    for (const [type, typeIssues] of Object.entries(grouped)) {
      const typeLabel = escapeHtml(getTypeLabel(type));
      html += `
      <div class="issue-group collapsed" data-type="${type}" data-label="${typeLabel}">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${typeLabel} (${typeIssues.length})</span>
        </div>
        <div class="issue-group-content">`;

      typeIssues.forEach((issue) => {
        html += `
          <div class="issue ${issue.severity}">
            <div class="issue-type">${String(issue.severity || "").toUpperCase()}</div>
            <div class="issue-message">${escapeHtml(issue.message)}</div>
            ${issue.nodeName ? `<div class="issue-node">Node: ${escapeHtml(issue.nodeName)}</div>` : ""}
          </div>`;
      });

      html += `
        </div>
      </div>`;
    }

    html += `
    </div>`;
  }

  if (tokens) {
    html += `
    <div class="section">
      <h2 class="section-title">🎨 Design Tokens</h2>`;

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
      html += `
      <div class="issue-group collapsed">
        <div class="issue-group-header">
          <button class="issue-group-toggle" type="button">+</button>
          <span>${group.label} (${group.values.length})</span>
        </div>
        <div class="issue-group-content">`;

      if (!group.values || group.values.length === 0) {
        html += `
          <div class="token-empty-message">No tokens in this group.</div>`;
        html += `
        </div>
      </div>`;
        continue;
      }

      html += `
          <div class="token-list">`;

      group.values.forEach((token) => {
        const tokenValue = token.value;
        const nodeCount =
          typeof token.totalNodes === "number"
            ? token.totalNodes
            : token.nodes
              ? token.nodes.length
              : 0;
        const colorType = token.colorType || "";

        if (key === "colors") {
          html += `
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background-color: ${escapeHtml(tokenValue)}"></span>
              ${escapeHtml(tokenValue)}
              ${colorType ? `<span class="token-color-type">${escapeHtml(colorType)}</span>` : ""}
            </div>
            ${nodeCount > 1 ? `<div class="token-node-count">Used in ${nodeCount} nodes</div>` : ""}
          </div>`;
        } else if (key === "gradients") {
          html += `
          <div class="token-item">
            <div class="token-value">
              <span class="token-color-preview" style="background: ${escapeHtml(tokenValue)}"></span>
              ${escapeHtml(tokenValue)}
              ${colorType ? `<span class="token-color-type">${escapeHtml(colorType)}</span>` : ""}
            </div>
            ${nodeCount > 1 ? `<div class="token-node-count">Used in ${nodeCount} nodes</div>` : ""}
          </div>`;
        } else {
          // Special note for Font Weight: include font-family breakdown
          let extraNote = "";
          if (key === "fontWeight") {
            let list = Array.isArray(token.fontFamilies) ? token.fontFamilies : null;
            if (!list) {
              const counts = {};
              const nodes = Array.isArray(token.nodes) ? token.nodes : [];
              nodes.forEach((n) => {
                const fam = n && n.fontFamily ? String(n.fontFamily) : "Unknown";
                counts[fam] = (counts[fam] || 0) + 1;
              });
              list = Object.entries(counts)
                .map(([family, count]) => ({ family, count }))
                .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));
            }
            if (Array.isArray(list) && list.length > 0) {
              const items = list.map((x) => `${escapeHtml(x.family)} (${x.count})`).join("<br/>");
              extraNote = `<div class="token-node-count" style="margin-top: 6px;">Font-family:<br/>${items}</div>`;
            }
          }
          html += `
          <div class="token-item">
            <div class="token-value">${escapeHtml(String(tokenValue))}</div>
            ${nodeCount > 1 ? `<div class="token-node-count">Used in ${nodeCount} nodes</div>` : ""}
            ${extraNote}
          </div>`;
        }
      });

      html += `
          </div>
        </div>
      </div>`;
    }

    html += `
    </div>`;
  }

  html += `
  </div>
  <script>
    (function() {
      function updateGroupState(group, content, toggleBtn) {
        const collapsed = group.classList.contains('collapsed');
        if (collapsed) {
          content.style.display = 'none';
          if (toggleBtn) toggleBtn.textContent = '+';
        } else {
          content.style.display = 'block';
          if (toggleBtn) toggleBtn.textContent = '−';
        }
      }

      function initCollapsibles() {
        document.querySelectorAll('.issue-group').forEach(group => {
          const header = group.querySelector('.issue-group-header');
          const content = group.querySelector('.issue-group-content');
          const toggleBtn = group.querySelector('.issue-group-toggle');
          if (!content || !header) return;

          const toggle = () => {
            group.classList.toggle('collapsed');
            updateGroupState(group, content, toggleBtn);
          };

          if (toggleBtn) {
            toggleBtn.addEventListener('click', e => {
              e.stopPropagation();
              toggle();
            });
          }

          header.addEventListener('click', e => {
            if (toggleBtn && (e.target === toggleBtn || toggleBtn.contains(e.target))) {
              return;
            }
            toggle();
          });

          updateGroupState(group, content, toggleBtn);
        });
      }

      function applySeverityFilter(filter) {
        const buttons = document.querySelectorAll('.export-filter-btn');
        buttons.forEach(btn => {
          const val = btn.getAttribute('data-severity') || 'all';
          btn.classList.toggle('active', val === filter);
        });

        document.querySelectorAll('.issue-group').forEach(group => {
          const issues = group.querySelectorAll('.issue');
          const label = group.getAttribute('data-label') || '';
          let visibleCount = 0;

          issues.forEach(issue => {
            const isError = issue.classList.contains('error');
            const isWarn = issue.classList.contains('warn');
            let show = false;
            if (filter === 'all') show = true;
            else if (filter === 'error') show = isError;
            else if (filter === 'warn') show = isWarn;
            issue.style.display = show ? '' : 'none';
            if (show) visibleCount++;
          });

          const headerCountSpan = group.querySelector('.issue-group-header span:last-child');
          if (headerCountSpan && label) {
            headerCountSpan.textContent = label + ' (' + visibleCount + ')';
          }
        });
      }

      function initExportFilters() {
        const buttons = document.querySelectorAll('.export-filter-btn');
        if (!buttons.length) return;
        let current = 'all';

        buttons.forEach(btn => {
          btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-severity') || 'all';
            current = val;
            applySeverityFilter(current);
          });
        });

        // Initial apply
        applySeverityFilter(current);
      }

      function initExportUI() {
        initCollapsibles();
        initExportFilters();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initExportUI);
      } else {
        initExportUI();
      }
    })();
  <\/script>
</body>
</html>`;

  return html;
}


