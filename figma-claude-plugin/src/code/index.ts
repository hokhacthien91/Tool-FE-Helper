import { serializeSelection } from './serializer';
import { executeActions, DesignAction } from './executor';
import { getDesignTokens } from './tokens';
import { popUndo, getUndoCount, getLastUndoDescription } from './undo';

figma.showUI(__html__, { width: 420, height: 650, title: 'Claude Design Assistant' });

// Screenshot capture helper
async function captureScreenshot(node: SceneNode): Promise<string | null> {
  try {
    var bytes = await node.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: 1 },
    });
    // Convert Uint8Array to base64 in plugin sandbox
    var binary = '';
    for (var idx = 0; idx < bytes.length; idx++) {
      binary += String.fromCharCode(bytes[idx]);
    }
    // Use figma.base64Encode if available, otherwise manual encoding
    var base64: string;
    if (typeof (figma as any).base64Encode === 'function') {
      base64 = (figma as any).base64Encode(bytes);
    } else {
      // Manual base64 encoding for Uint8Array
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      var result = '';
      var b: number;
      for (var j = 0; j < binary.length; j += 3) {
        b = (binary.charCodeAt(j) & 0xFF) << 16;
        if (j + 1 < binary.length) b |= (binary.charCodeAt(j + 1) & 0xFF) << 8;
        if (j + 2 < binary.length) b |= binary.charCodeAt(j + 2) & 0xFF;
        result += chars.charAt((b >> 18) & 0x3F);
        result += chars.charAt((b >> 12) & 0x3F);
        result += (j + 1 < binary.length) ? chars.charAt((b >> 6) & 0x3F) : '=';
        result += (j + 2 < binary.length) ? chars.charAt(b & 0x3F) : '=';
      }
      base64 = result;
    }
    return base64;
  } catch (err) {
    console.error('Screenshot capture failed:', err);
    return null;
  }
}

async function sendScreenshotToUI(node: SceneNode) {
  var base64 = await captureScreenshot(node);
  if (base64) {
    figma.ui.postMessage({ type: 'screenshot-data', data: base64 });
  }
}

// Selection change handler
figma.on('selectionchange', function () {
  sendSelectionToUI();
});

function sendSelectionToUI() {
  var selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'selection', data: null });
    figma.ui.postMessage({ type: 'screenshot-data', data: null });
    return;
  }
  var serialized = serializeSelection();
  figma.ui.postMessage({ type: 'selection', data: serialized });

  // Auto-capture screenshot of first selected node
  sendScreenshotToUI(selection[0]);
}

// Send initial data
sendSelectionToUI();

// Send design tokens on init
(function () {
  var tokens = getDesignTokens();
  figma.ui.postMessage({ type: 'design-tokens', data: tokens });
})();

// Load saved chat history
(async function () {
  var savedHistory = await figma.clientStorage.getAsync('chatHistory');
  if (savedHistory) {
    figma.ui.postMessage({ type: 'load-history', data: savedHistory });
  }
})();

// Message handler
figma.ui.onmessage = async function (msg: { type: string;[key: string]: any }) {
  switch (msg.type) {
    case 'get-selection': {
      sendSelectionToUI();
      break;
    }

    case 'get-tokens': {
      var tokens = getDesignTokens();
      figma.ui.postMessage({ type: 'design-tokens', data: tokens });
      break;
    }

    case 'execute-actions': {
      var actions: DesignAction[] = msg.actions;
      figma.ui.postMessage({ type: 'executing', count: actions.length });

      try {
        var results = await executeActions(actions);
        var successCount = 0;
        var failCount = 0;
        for (var i = 0; i < results.length; i++) {
          if (results[i].success) successCount++;
          else failCount++;
        }

        figma.ui.postMessage({
          type: 'execution-complete',
          results: results,
          summary: successCount + ' succeeded, ' + failCount + ' failed',
          canUndo: getUndoCount() > 0,
        });

        sendSelectionToUI();

        // Capture screenshot of result for AI review
        var currentSelection = figma.currentPage.selection;
        if (currentSelection.length > 0) {
          var postScreenshot = await captureScreenshot(currentSelection[0]);
          if (postScreenshot) {
            figma.ui.postMessage({ type: 'post-apply-screenshot', data: postScreenshot });
          }
        }
      } catch (err) {
        figma.ui.postMessage({
          type: 'execution-error',
          error: err instanceof Error ? err.message : String(err),
        });
      }
      break;
    }

    case 'undo': {
      var result = await popUndo();
      if (result) {
        figma.ui.postMessage({
          type: 'undo-complete',
          removed: result.removed,
          description: result.description,
          canUndo: getUndoCount() > 0,
        });
        figma.notify('Undo: removed ' + result.removed + ' node(s)');
        sendSelectionToUI();
      } else {
        figma.ui.postMessage({ type: 'undo-complete', removed: 0, canUndo: false });
        figma.notify('Nothing to undo');
      }
      break;
    }

    case 'save-history': {
      var history = msg.data;
      var trimmed = Array.isArray(history) ? history.slice(-50) : [];
      await figma.clientStorage.setAsync('chatHistory', trimmed);
      break;
    }

    case 'clear-history': {
      await figma.clientStorage.deleteAsync('chatHistory');
      break;
    }

    case 'capture-screenshot': {
      var sel = figma.currentPage.selection;
      if (sel.length > 0) {
        sendScreenshotToUI(sel[0]);
      }
      break;
    }

    case 'notify': {
      figma.notify(msg.message, { timeout: msg.timeout || 3000 });
      break;
    }

    case 'close': {
      figma.closePlugin();
      break;
    }
  }
};
