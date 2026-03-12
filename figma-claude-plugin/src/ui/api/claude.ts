const BACKEND_URL = 'http://localhost:3001';

interface ChatRequest {
  prompt: string;
  context: any;
  history: Array<{ role: string; content: string }>;
  screenshot?: string | null;
}

interface ChatResponse {
  message: string;
  actions?: any[];
}

interface ReviewRequest {
  screenshot: string;
  context: any;
}

interface ReviewResponse {
  message: string;
  score: number | null;
  issues: string[];
  actions: any[];
}

// Non-streaming chat
export async function sendChat(request: ChatRequest): Promise<ChatResponse> {
  var response = await fetch(BACKEND_URL + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    var errorText = await response.text();
    throw new Error('Backend error: ' + response.status + ' - ' + errorText);
  }

  var data = await response.json();

  // Safety net: if message still looks like JSON, try to extract the message field
  if (data.message && typeof data.message === 'string') {
    var msg = data.message.trim();
    if (msg.charAt(0) === '{') {
      try {
        var parsed = JSON.parse(msg);
        if (parsed && typeof parsed.message === 'string') {
          data.message = parsed.message;
          if (Array.isArray(parsed.actions) && parsed.actions.length > 0) {
            data.actions = parsed.actions;
          }
        }
      } catch (e) {
        // not JSON, keep as-is
      }
    }
  }

  return data;
}

// Streaming chat
export async function sendChatStream(
  request: ChatRequest,
  onChunk: (text: string) => void,
  onDone: (response: ChatResponse) => void,
  onError: (error: string) => void
): Promise<void> {
  const response = await fetch(`${BACKEND_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error: ${response.status} - ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data) continue;

      try {
        const parsed = JSON.parse(data);

        switch (parsed.type) {
          case 'chunk':
            onChunk(parsed.text);
            break;
          case 'done':
            onDone({
              message: parsed.message,
              actions: parsed.actions,
            });
            break;
          case 'error':
            onError(parsed.error);
            break;
        }
      } catch {
        // Skip malformed SSE data
      }
    }
  }
}

// Post-apply design review
export async function reviewDesign(request: ReviewRequest): Promise<ReviewResponse> {
  var response = await fetch(BACKEND_URL + '/api/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    var errorText = await response.text();
    throw new Error('Backend error: ' + response.status + ' - ' + errorText);
  }

  var data = await response.json();
  return {
    message: data.message || '',
    score: data.score || null,
    issues: Array.isArray(data.issues) ? data.issues : [],
    actions: Array.isArray(data.actions) ? data.actions : [],
  };
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BACKEND_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
