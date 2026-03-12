import React, { useState } from 'react';

interface Props {
  actions: any[];
  onApply: (actions: any[]) => void;
  onCancel: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  clone: 'Clone node',
  modifyFills: 'Change fills',
  modifyText: 'Change text',
  modifyLayout: 'Change layout',
  setVisibility: 'Toggle visibility',
  findAndModify: 'Find & modify',
  createFrame: 'Create frame',
  createText: 'Create text',
  createRectangle: 'Create rectangle',
  createVariants: 'Create variants',
  createComponent: 'Create component',
  createInstance: 'Create instance',
  setEffects: 'Set effects',
};

function ActionItem({ action, index }: { action: any; index: number }) {
  var label = ACTION_LABELS[action.type] || action.type;
  var detail = '';

  if (action.type === 'clone' && action.newName) {
    detail = action.newName;
  } else if (action.type === 'createVariants') {
    detail = action.count + ' variants';
  } else if (action.type === 'findAndModify') {
    detail = 'target: ' + action.targetName;
  } else if (action.type === 'modifyFills' && action.fills && action.fills[0]) {
    detail = action.fills[0].color;
  } else if (action.type === 'createFrame' || action.type === 'createText') {
    detail = action.name || action.characters || '';
  } else if (action.type === 'setEffects' && action.effects) {
    detail = action.effects.map(function (e: any) { return e.type; }).join(', ');
  }

  return (
    <div className="action-item">
      <span className="action-item__index">{index + 1}</span>
      <span className="action-item__label">{label}</span>
      {detail && <span className="action-item__detail">{detail}</span>}
      {action.type === 'modifyFills' && action.fills && action.fills[0] && (
        <span
          className="action-item__color"
          style={{ backgroundColor: action.fills[0].color }}
        />
      )}
    </div>
  );
}

export function ActionPreview({ actions, onApply, onCancel }: Props) {
  return (
    <div className="action-preview">
      <div className="action-preview__header">
        <span className="action-preview__title">Preview ({actions.length} actions)</span>
      </div>
      <div className="action-preview__list">
        {actions.map(function (action, idx) {
          return <ActionItem key={idx} action={action} index={idx} />;
        })}
      </div>
      <div className="action-preview__buttons">
        <button className="action-preview__apply" onClick={function () { onApply(actions); }}>
          Apply All
        </button>
        <button className="action-preview__cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
