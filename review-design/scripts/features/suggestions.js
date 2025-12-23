import { getColorDistance } from "../utils/colorMath.js";

export function getSuggestedColor(issue) {
  if (!issue || !issue.message) return null;

  // Extract current color from message
  const message = issue.message || "";
  const colorMatch = message.match(/Color (#[0-9A-Fa-f]{6})/);
  const currentColor = colorMatch ? colorMatch[1].toUpperCase() : null;

  if (!currentColor) return null;

  // Get color scale from input
  const colorScaleInput = document.getElementById("color-scale");
  if (!colorScaleInput || !colorScaleInput.value.trim()) return null;

  // Parse colors from input
  const colors = colorScaleInput.value
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => c && c.startsWith("#"));

  if (colors.length === 0) return null;

  // Find closest color using color distance
  let closestColor = null;
  let minDistance = Infinity;

  colors.forEach((color) => {
    const distance = getColorDistance(currentColor, color);
    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color;
    }
  });

  // Only suggest if distance is reasonable (not too different)
  // Using a threshold: if distance > 100, don't suggest
  if (minDistance > 100) return null;

  return closestColor;
}

export function getSuggestedSpacing(issue) {
  if (!issue || !issue.message) return null;

  // Extract current value from message
  const message = issue.message || "";
  const match = message.match(/\((\d+)px\)/);
  if (!match) return null;

  const currentValue = parseInt(match[1], 10);
  if (isNaN(currentValue)) return null;

  // Get spacing scale from input
  const spacingScaleInput = document.getElementById("spacing-scale");
  if (!spacingScaleInput || !spacingScaleInput.value.trim()) return null;

  // Parse spacing values from input
  const spacingValues = spacingScaleInput.value
    .split(",")
    .map((v) => parseInt(v.trim(), 10))
    .filter((v) => !isNaN(v) && v >= 0)
    .sort((a, b) => a - b);

  if (spacingValues.length === 0) return null;

  // Find closest spacing value
  let closestValue = null;
  let minDiff = Infinity;

  spacingValues.forEach((value) => {
    const diff = Math.abs(value - currentValue);
    if (diff < minDiff) {
      minDiff = diff;
      closestValue = value;
    }
  });

  // Only suggest if difference is reasonable (within 20% or 10px, whichever is larger)
  const threshold = Math.max(currentValue * 0.2, 10);
  if (minDiff > threshold) return null;

  return closestValue;
}


