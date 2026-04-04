// licensing.js — Freemium feature gating for Design QA Checker
// Uses Figma native Payments API (figma.payments)
// No custom modal — goes straight to Figma's checkout dialog.

// ── SET TO false TO DISABLE ALL PRO GATING (everyone gets full access) ──
const ENABLE_PRO_GATING = false;

// Premium feature identifiers
export const PREMIUM_FEATURES = {
  FIX_ALL: "fix-all",
  EXPORT_REPORT: "export-report",
  FILL_SCALES: "fill-scales",
  SETTINGS_IMPORT_EXPORT: "settings-import-export",
  UNLIMITED_SETTINGS: "unlimited-settings",
  UNLIMITED_HISTORY: "unlimited-history",
};

// Issue types that show limited results (5) for free users
export const LIMITED_ISSUE_TYPES = [
  "typography-style",
  "typography-check",
  "color-variable",
  "component",
];

export const FREE_ISSUE_LIMIT = 5;

// State
let _isPro = false;
let _onStatusChange = null;

export function isPro() {
  return _isPro;
}

export function setPaymentStatus(status) {
  _isPro = status === true;
  if (_onStatusChange) _onStatusChange(_isPro);
  updateProBadges();
}

export function onPaymentStatusChange(callback) {
  _onStatusChange = callback;
}

// Check if a feature requires Pro
export function requiresPro(featureId) {
  return Object.values(PREMIUM_FEATURES).includes(featureId);
}

// Gate a feature — returns true if allowed, false if blocked (triggers Figma checkout)
export function gateFeature(featureId) {
  if (!ENABLE_PRO_GATING) return true;
  if (_isPro) return true;
  if (!requiresPro(featureId)) return true;
  requestCheckout();
  return false;
}

// Limit issues for free users
export function limitIssuesForFree(issues, type) {
  if (!ENABLE_PRO_GATING || _isPro) return { issues, truncated: false, total: issues.length };
  if (!LIMITED_ISSUE_TYPES.includes(type)) return { issues, truncated: false, total: issues.length };
  if (issues.length <= FREE_ISSUE_LIMIT) return { issues, truncated: false, total: issues.length };
  return {
    issues: issues.slice(0, FREE_ISSUE_LIMIT),
    truncated: true,
    total: issues.length,
  };
}

// Update Pro badges and license status button in UI
function updateProBadges() {
  const showAsPro = !ENABLE_PRO_GATING || _isPro;
  document.querySelectorAll(".pro-badge").forEach((badge) => {
    badge.style.display = (ENABLE_PRO_GATING && !_isPro) ? "inline-flex" : "none";
  });
  document.querySelectorAll(".feature-locked").forEach((el) => {
    el.classList.toggle("unlocked", showAsPro);
  });

  // Update header license status button
  const statusBtn = document.getElementById("btn-license-status");
  if (!statusBtn) return;

  if (ENABLE_PRO_GATING) {
    const label = statusBtn.querySelector(".license-status-label");
    statusBtn.classList.toggle("is-pro", showAsPro);
    if (label) label.textContent = showAsPro ? "PRO" : "FREE";
  } else {
    statusBtn.style.display = "none";
  }
}

// Request checkout from plugin code.js
export function requestCheckout() {
  parent.postMessage(
    { pluginMessage: { type: "initiate-checkout" } },
    "*"
  );
}

// Initialize — called once from main.js
export function initLicensing() {
  // Header license status button — click to go straight to Figma checkout
  const statusBtn = document.getElementById("btn-license-status");
  if (statusBtn) {
    statusBtn.onclick = () => {
      if (!_isPro) requestCheckout();
    };
  }

  // Initial badge state
  updateProBadges();
}
