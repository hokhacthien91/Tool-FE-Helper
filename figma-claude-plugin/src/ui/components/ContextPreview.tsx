import React from 'react';
import { SerializedNode } from '../types';

interface Props {
  selection: SerializedNode[] | null;
}

function NodeBadge({ node }: { node: SerializedNode }) {
  const typeColors: Record<string, string> = {
    FRAME: '#9747FF',
    TEXT: '#24CB43',
    RECTANGLE: '#F24822',
    COMPONENT: '#1BC47D',
    INSTANCE: '#8B5CF6',
    GROUP: '#FF8C00',
  };

  const color = typeColors[node.type] || '#999';

  return (
    <div className="context-node">
      <span className="context-node__type" style={{ backgroundColor: color }}>
        {node.type}
      </span>
      <span className="context-node__name">{node.name}</span>
      <span className="context-node__size">
        {node.width}×{node.height}
      </span>
    </div>
  );
}

export function ContextPreview({ selection }: Props) {
  if (!selection || selection.length === 0) {
    return (
      <div className="context-preview context-preview--empty">
        <p>Select a layer to start 2</p>
      </div>
    );
  }

  return (
    <div className="context-preview">
      <div className="context-preview__header">
        <span className="context-preview__label">Selected</span>
        <span className="context-preview__count">{selection.length}</span>
      </div>
      <div className="context-preview__nodes">
        {selection.map((node) => (
          <NodeBadge key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
