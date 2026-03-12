import React, { useState } from 'react';
import { Message } from '../types';
import { ActionPreview } from './ActionPreview';

interface Props {
  message: Message;
  onApplyActions?: (actions: any[]) => void;
}

export function MessageBubble({ message, onApplyActions }: Props) {
  var [showPreview, setShowPreview] = useState(false);
  var isStreaming = message.status === 'streaming';
  var hasActions = message.actions && message.actions.length > 0 && message.status === 'done';

  return (
    <div className={'message message--' + message.role}>
      <div className={'message__bubble' + (isStreaming ? ' streaming' : '')}>
        <div className="message__content">
          {message.content || (isStreaming ? '' : '...')}
        </div>

        {hasActions && !showPreview && (
          <div className="message__actions">
            <div className="message__actions-info">
              {message.actions!.length} action(s) ready
            </div>
            <div className="message__actions-btns">
              <button
                className="message__preview-btn"
                onClick={function () { setShowPreview(true); }}
              >
                Preview
              </button>
              <button
                className="message__apply-btn"
                onClick={function () { onApplyActions && onApplyActions(message.actions!); }}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {hasActions && showPreview && (
          <ActionPreview
            actions={message.actions!}
            onApply={function (actions) {
              setShowPreview(false);
              onApplyActions && onApplyActions(actions);
            }}
            onCancel={function () { setShowPreview(false); }}
          />
        )}

        {message.status === 'sending' && (
          <div className="message__status">
            <span className="message__spinner" />
          </div>
        )}

        {message.status === 'error' && (
          <div className="message__status message__status--error">Error</div>
        )}
      </div>
    </div>
  );
}
