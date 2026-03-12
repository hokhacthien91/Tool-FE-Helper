import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, SerializedNode } from '../types';
import { MessageBubble } from './MessageBubble';
import { QuickActions } from './QuickActions';
import { sendChat, reviewDesign } from '../api/claude';

interface Props {
  selection: SerializedNode[] | null;
  designTokens?: any;
  onSaveHistory?: (messages: Message[]) => void;
  initialMessages?: Message[];
}

var messageIdCounter = 0;
function nextId() {
  return 'msg_' + (++messageIdCounter) + '_' + Date.now();
}

export function ChatPanel({ selection, designTokens, onSaveHistory, initialMessages }: Props) {
  var [messages, setMessages] = useState<Message[]>(initialMessages || []);
  var [input, setInput] = useState('');
  var [isLoading, setIsLoading] = useState(false);
  var [canUndo, setCanUndo] = useState(false);
  var [screenshot, setScreenshot] = useState<string | null>(null);
  var messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(function () {
    var el = messagesEndRef.current;
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(function () {
    if (messages.length > 0 && onSaveHistory) {
      onSaveHistory(messages);
    }
  }, [messages, onSaveHistory]);

  var addSystemMessage = useCallback(function (content: string) {
    setMessages(function (prev) {
      return prev.concat([{
        id: nextId(),
        role: 'system',
        content: content,
        timestamp: Date.now(),
        status: 'done',
      }]);
    });
  }, []);

  var handleSend = async function (prompt?: string) {
    var text = prompt || input.trim();
    if (!text || isLoading) return;

    if (!selection || selection.length === 0) {
      addSystemMessage('Please select a layer in Figma first 2.');
      return;
    }

    var userMsg: Message = {
      id: nextId(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'done',
    };

    var assistantId = nextId();
    var assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      status: 'sending',
    };

    setMessages(function (prev) { return prev.concat([userMsg, assistantMsg]); });
    setInput('');
    setIsLoading(true);

    try {
      var history = messages
        .filter(function (m) { return m.role !== 'system'; })
        .map(function (m) { return { role: m.role, content: m.content }; });

      // Include design tokens in context
      var context = {
        selection: selection,
        designTokens: designTokens || null,
      };

      var response = await sendChat({ prompt: text, context: context, history: history, screenshot: screenshot });

      setMessages(function (prev) {
        return prev.map(function (m) {
          return m.id === assistantId
            ? Object.assign({}, m, {
                content: response.message,
                actions: response.actions,
                status: 'done',
              })
            : m;
        });
      });
      setIsLoading(false);
    } catch (err) {
      var errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setMessages(function (prev) {
        return prev.map(function (m) {
          return m.id === assistantId
            ? Object.assign({}, m, { content: 'Error: ' + errorMessage, status: 'error' })
            : m;
        });
      });
      setIsLoading(false);
    }
  };

  var handleApplyActions = function (actions: any[]) {
    parent.postMessage(
      { pluginMessage: { type: 'execute-actions', actions: actions } },
      '*'
    );
    addSystemMessage('Applying ' + actions.length + ' action(s)...');
  };

  var handleUndo = function () {
    parent.postMessage({ pluginMessage: { type: 'undo' } }, '*');
  };

  var handleClearChat = function () {
    setMessages([]);
    if (onSaveHistory) onSaveHistory([]);
  };

  var handleKeyDown = function (e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Run post-apply review with screenshot
  var runReview = useCallback(async function (screenshotData: string) {
    addSystemMessage('Reviewing design result...');
    try {
      var context = {
        selection: selection,
        designTokens: designTokens || null,
      };
      var review = await reviewDesign({ screenshot: screenshotData, context: context });
      var reviewText = review.message;
      if (review.score !== null) {
        reviewText = 'Score: ' + review.score + '/10\n\n' + reviewText;
      }
      if (review.issues && review.issues.length > 0) {
        reviewText += '\n\nIssues:\n' + review.issues.map(function (i) { return '- ' + i; }).join('\n');
      }
      // Add review as assistant message (with suggested fix actions if any)
      setMessages(function (prev) {
        return prev.concat([{
          id: nextId(),
          role: 'assistant',
          content: reviewText,
          actions: review.actions && review.actions.length > 0 ? review.actions : undefined,
          timestamp: Date.now(),
          status: 'done',
        }]);
      });
    } catch (err) {
      var errorMsg = err instanceof Error ? err.message : 'Review failed';
      addSystemMessage('Review error: ' + errorMsg);
    }
  }, [selection, designTokens, addSystemMessage]);

  // Listen for execution results and screenshots
  useEffect(function () {
    var handler = function (event: MessageEvent) {
      var msg = event.data && event.data.pluginMessage;
      if (!msg) return;

      if (msg.type === 'screenshot-data') {
        setScreenshot(msg.data);
      } else if (msg.type === 'post-apply-screenshot') {
        // Auto-review after actions are applied
        if (msg.data) {
          runReview(msg.data);
        }
      } else if (msg.type === 'execution-complete') {
        // Build detailed result message
        var results = msg.results || [];
        var succeeded: string[] = [];
        var failed: string[] = [];
        for (var i = 0; i < results.length; i++) {
          var r = results[i];
          if (r.success) {
            succeeded.push(r.action + (r.nodeId ? ' (' + r.nodeId + ')' : ''));
          } else {
            failed.push(r.action + ': ' + (r.error || 'failed'));
          }
        }
        var summary = 'Done: ' + succeeded.length + ' succeeded';
        if (failed.length > 0) {
          summary += ', ' + failed.length + ' failed:\n' + failed.map(function(f) { return '  - ' + f; }).join('\n');
        }
        addSystemMessage(summary);
        if (msg.canUndo !== undefined) setCanUndo(msg.canUndo);
      } else if (msg.type === 'execution-error') {
        addSystemMessage('Error: ' + msg.error);
      } else if (msg.type === 'undo-complete') {
        if (msg.removed > 0) {
          addSystemMessage('Undo: removed ' + msg.removed + ' node(s)');
        }
        if (msg.canUndo !== undefined) setCanUndo(msg.canUndo);
      }
    };

    window.addEventListener('message', handler);
    return function () { window.removeEventListener('message', handler); };
  }, [addSystemMessage, runReview]);

  return (
    <div className="chat-panel">
      <div className="chat-panel__messages">
        {messages.length === 0 && (
          <div className="chat-panel__welcome">
            <h3>Claude Design Assistant</h3>
            <p>Select a layer and describe what you want to do.</p>
          </div>
        )}

        {messages.map(function (msg) {
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              onApplyActions={handleApplyActions}
            />
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-panel__footer">
        <QuickActions onSelectAction={handleSend} disabled={isLoading} />

        {screenshot && (
          <div className="chat-panel__screenshot-badge" title="Screenshot attached — Claude can see your design">
            Screenshot attached
          </div>
        )}

        <div className="chat-panel__input-row">
          <textarea
            className="chat-panel__input"
            value={input}
            onChange={function (e) { setInput(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder={
              selection && selection.length > 0
                ? 'Describe what you want to do...'
                : 'Select a layer first...'
            }
            disabled={isLoading}
            rows={2}
          />
          <div className="chat-panel__btn-group">
            <button
              className="chat-panel__send"
              onClick={function () { handleSend(); }}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? '...' : 'Send'}
            </button>
            {canUndo && (
              <button
                className="chat-panel__undo"
                onClick={handleUndo}
                title="Undo last actions"
              >
                Undo
              </button>
            )}
            {messages.length > 0 && (
              <button
                className="chat-panel__clear"
                onClick={handleClearChat}
                title="Clear chat"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
