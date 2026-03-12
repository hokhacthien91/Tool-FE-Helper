export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  actions?: any[];
  status?: 'sending' | 'streaming' | 'done' | 'error';
}

export interface SerializedNode {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  opacity?: number;
  fills?: Array<{ type: string; color?: string; opacity?: number }>;
  characters?: string;
  fontSize?: number;
  layoutMode?: string;
  children?: SerializedNode[];
}

export interface QuickAction {
  label: string;
  prompt: string;
  icon: string;
}
