import React, { useState, useEffect, useCallback } from 'react';
import { SerializedNode, Message } from './types';
import { ContextPreview } from './components/ContextPreview';
import { ChatPanel } from './components/ChatPanel';
import { checkHealth } from './api/claude';

export function App() {
  var [selection, setSelection] = useState<SerializedNode[] | null>(null);
  var [backendOnline, setBackendOnline] = useState<boolean | null>(null);
  var [initialMessages, setInitialMessages] = useState<Message[] | undefined>(undefined);
  var [historyLoaded, setHistoryLoaded] = useState(false);
  var [designTokens, setDesignTokens] = useState<any>(null);

  useEffect(function () {
    var handler = function (event: MessageEvent) {
      var msg = event.data && event.data.pluginMessage;
      if (!msg) return;

      if (msg.type === 'selection') {
        setSelection(msg.data);
      } else if (msg.type === 'load-history') {
        if (msg.data && Array.isArray(msg.data) && msg.data.length > 0) {
          setInitialMessages(msg.data);
        }
        setHistoryLoaded(true);
      } else if (msg.type === 'design-tokens') {
        setDesignTokens(msg.data);
      }
    };

    window.addEventListener('message', handler);
    parent.postMessage({ pluginMessage: { type: 'get-selection' } }, '*');

    var timeout = setTimeout(function () { setHistoryLoaded(true); }, 500);

    return function () {
      window.removeEventListener('message', handler);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(function () {
    checkHealth().then(setBackendOnline);
  }, []);

  var handleSaveHistory = useCallback(function (messages: Message[]) {
    var cleanMessages = messages
      .filter(function (m) { return m.status === 'done'; })
      .map(function (m) {
        return {
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          actions: m.actions,
          status: 'done' as const,
        };
      });

    parent.postMessage(
      { pluginMessage: { type: 'save-history', data: cleanMessages } },
      '*'
    );
  }, []);

  if (!historyLoaded) {
    return (
      <div className="app app--loading">
        <div className="app__loader">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {backendOnline === false && (
        <div className="app__warning">
          Backend offline 2. Run: <code>npm run backend:dev</code>
        </div>
      )}
      <ContextPreview selection={selection} />
      <ChatPanel
        selection={selection}
        designTokens={designTokens}
        onSaveHistory={handleSaveHistory}
        initialMessages={initialMessages}
      />
    </div>
  );
}
