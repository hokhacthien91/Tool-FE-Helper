export function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  const str = String(s);
  return str.replace(/[&<>"']/g, function (m) {
    return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
  });
}


