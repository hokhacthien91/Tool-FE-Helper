import React from 'react';
import { QuickAction } from '../types';

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Dark Variant',
    prompt:
      'Create a dark theme variant of the selected element. Use dark background (#1a1a2e) and white text.',
    icon: '🌙',
  },
  {
    label: 'Light Variant',
    prompt:
      'Create a light theme variant of the selected element. Use white background and dark text.',
    icon: '☀️',
  },
  {
    label: '5 Variants',
    prompt:
      'Create 5 different variants of the selected element: 1) Dark theme, 2) Light theme, 3) Minimal, 4) Accent color, 5) Warm tone. Customize colors for each variant.',
    icon: '✨',
  },
  {
    label: 'Swap Colors',
    prompt:
      'Swap the background and text colors of the selected element (invert the color scheme).',
    icon: '🔄',
  },
  {
    label: 'Responsive Set',
    prompt:
      'Create 3 responsive variants: Desktop (1440px wide), Tablet (768px wide), Mobile (375px wide). Adjust layout and spacing for each.',
    icon: '📱',
  },
  {
    label: 'Create Card',
    prompt:
      'Create a new card component with: a container frame (auto layout vertical, 16px padding, 12px corner radius, white background), a heading text "Card Title" (Inter Bold 18px), and a description text "Card description goes here" (Inter Regular 14px, #666).',
    icon: '🃏',
  },
];

interface Props {
  onSelectAction: (prompt: string) => void;
  disabled?: boolean;
}

export function QuickActions({ onSelectAction, disabled }: Props) {
  return (
    <div className="quick-actions">
      <div className="quick-actions__label">Quick Actions</div>
      <div className="quick-actions__list">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            className="quick-actions__btn"
            onClick={() => onSelectAction(action.prompt)}
            disabled={disabled}
            title={action.prompt}
          >
            <span className="quick-actions__icon">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
