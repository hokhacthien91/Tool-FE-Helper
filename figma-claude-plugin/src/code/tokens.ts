// Read local Figma design tokens (paint styles, text styles, variables)

export interface DesignTokens {
  paintStyles: Array<{
    name: string;
    color: string;
  }>;
  textStyles: Array<{
    name: string;
    fontSize: number;
    fontFamily: string;
    fontStyle: string;
    lineHeight: string;
  }>;
  variables: Array<{
    name: string;
    collection: string;
    type: string;
    value: string;
  }>;
}

function rgbToHex(r: number, g: number, b: number): string {
  var toHex = function (n: number) {
    return Math.round(n * 255).toString(16).padStart(2, '0');
  };
  return '#' + toHex(r) + toHex(g) + toHex(b);
}

export function getDesignTokens(): DesignTokens {
  var tokens: DesignTokens = {
    paintStyles: [],
    textStyles: [],
    variables: [],
  };

  // Get local paint styles
  try {
    var paintStyles = figma.getLocalPaintStyles();
    for (var i = 0; i < paintStyles.length; i++) {
      var ps = paintStyles[i];
      var paints = ps.paints;
      if (paints.length > 0 && paints[0].type === 'SOLID') {
        var solid = paints[0] as SolidPaint;
        tokens.paintStyles.push({
          name: ps.name,
          color: rgbToHex(solid.color.r, solid.color.g, solid.color.b),
        });
      }
    }
  } catch (e) {
    console.warn('[Tokens] Could not read paint styles:', e);
  }

  // Get local text styles
  try {
    var textStyles = figma.getLocalTextStyles();
    for (var j = 0; j < textStyles.length; j++) {
      var ts = textStyles[j];
      var lh = ts.lineHeight;
      var lineHeightStr = 'auto';
      if (lh && typeof lh === 'object' && 'value' in lh) {
        lineHeightStr = String((lh as { value: number; unit: string }).value) +
          ((lh as { value: number; unit: string }).unit === 'PERCENT' ? '%' : 'px');
      }
      tokens.textStyles.push({
        name: ts.name,
        fontSize: ts.fontSize,
        fontFamily: ts.fontName.family,
        fontStyle: ts.fontName.style,
        lineHeight: lineHeightStr,
      });
    }
  } catch (e) {
    console.warn('[Tokens] Could not read text styles:', e);
  }

  // Get local variables (colors, numbers)
  try {
    var collections = figma.variables.getLocalVariableCollections();
    for (var c = 0; c < collections.length; c++) {
      var collection = collections[c];
      var variableIds = collection.variableIds;
      // Get default mode
      var defaultModeId = collection.defaultModeId;

      for (var v = 0; v < variableIds.length; v++) {
        var variable = figma.variables.getVariableById(variableIds[v]);
        if (!variable) continue;

        var modeValue = variable.valuesByMode[defaultModeId];
        var valueStr = '';

        if (variable.resolvedType === 'COLOR' && modeValue && typeof modeValue === 'object' && 'r' in modeValue) {
          var cv = modeValue as { r: number; g: number; b: number; a?: number };
          valueStr = rgbToHex(cv.r, cv.g, cv.b);
        } else if (variable.resolvedType === 'FLOAT' && typeof modeValue === 'number') {
          valueStr = String(modeValue);
        } else if (variable.resolvedType === 'STRING' && typeof modeValue === 'string') {
          valueStr = modeValue;
        } else {
          continue;
        }

        tokens.variables.push({
          name: variable.name,
          collection: collection.name,
          type: variable.resolvedType,
          value: valueStr,
        });
      }
    }
  } catch (e) {
    console.warn('[Tokens] Could not read variables:', e);
  }

  return tokens;
}
