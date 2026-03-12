import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { SYSTEM_PROMPT, REVIEW_PROMPT } from './system-prompt';

dotenv.config();

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Health check
app.get('/health', (_req, res) => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  res.json({ status: 'ok', apiKeyConfigured: hasKey });
});

// Non-streaming chat endpoint (kept for compatibility)
app.post('/api/chat', async (req, res) => {
  try {
    const { prompt, context, history, screenshot } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const messages = buildMessages(history, prompt, context, screenshot);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ error: 'No text response from Claude' });
    }

    console.log('[Chat] Screenshot included:', !!screenshot);
    console.log('[Chat] Raw response (first 500):', textContent.text.substring(0, 500));

    const parsed = parseClaudeResponse(textContent.text);

    console.log('[Chat] Actions count:', parsed.actions.length);
    if (parsed.actions.length > 0) {
      console.log('[Chat] Action types:', parsed.actions.map((a: any) => a.type));
    }

    res.json({
      message: parsed.message || textContent.text,
      actions: parsed.actions || [],
    });
  } catch (err) {
    console.error('[Chat Error]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Streaming chat endpoint
app.post('/api/chat/stream', async (req, res) => {
  try {
    const { prompt, context, history, screenshot } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const messages = buildMessages(history, prompt, context, screenshot);

    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages,
    });

    let fullText = '';

    stream.on('text', (text) => {
      fullText += text;
      // Send each chunk as SSE event
      res.write(`data: ${JSON.stringify({ type: 'chunk', text })}\n\n`);
    });

    stream.on('end', () => {
      // Parse the complete response and send final event with actions
      const parsed = parseClaudeResponse(fullText);
      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          message: parsed.message || fullText,
          actions: parsed.actions || [],
        })}\n\n`
      );
      res.end();
    });

    stream.on('error', (err) => {
      const errorMsg = err instanceof Error ? err.message : 'Stream error';
      res.write(`data: ${JSON.stringify({ type: 'error', error: errorMsg })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      stream.abort();
    });
  } catch (err) {
    console.error('[Stream Error]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
});

// Review endpoint — post-apply design review
app.post('/api/review', async (req, res) => {
  try {
    const { screenshot, context } = req.body;

    if (!screenshot) {
      return res.status(400).json({ error: 'Missing screenshot' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    }

    const content: Anthropic.ContentBlockParam[] = [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: screenshot },
      },
      {
        type: 'text',
        text: `## Design Context\n\`\`\`json\n${JSON.stringify(context, null, 2)}\n\`\`\`\n\nPlease review this design result and provide feedback.`,
      },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: REVIEW_PROMPT,
      messages: [{ role: 'user', content }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ error: 'No text response from Claude' });
    }

    const parsed = parseClaudeResponse(textContent.text);

    res.json({
      message: parsed.message || textContent.text,
      score: parsed.score ?? null,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      actions: parsed.actions || [],
    });
  } catch (err) {
    console.error('[Review Error]', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// Helper: build messages array
function buildMessages(
  history: any[] | undefined,
  prompt: string,
  context: any,
  screenshot?: string
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  if (history && Array.isArray(history)) {
    for (const h of history) {
      if (h.role === 'user' || h.role === 'assistant') {
        messages.push({ role: h.role, content: h.content });
      }
    }
  }

  const textPart = `## Current Figma Selection Context
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

## User Request
${prompt}`;

  // Build multimodal content when screenshot is available
  if (screenshot) {
    const content: Anthropic.ContentBlockParam[] = [
      {
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data: screenshot },
      },
      { type: 'text', text: textPart },
    ];
    messages.push({ role: 'user', content });
  } else {
    messages.push({ role: 'user', content: textPart });
  }

  return messages;
}

// Helper: parse Claude's JSON response — robust extraction
// Returns all parsed fields (message, actions, score, issues, etc.)
function parseClaudeResponse(text: string): Record<string, any> & { message: string; actions: any[] } {
  const raw = text.trim();

  function normalize(obj: any): Record<string, any> & { message: string; actions: any[] } {
    return {
      ...obj,
      message: typeof obj.message === 'string' ? obj.message : '',
      actions: Array.isArray(obj.actions) ? obj.actions : [],
    };
  }

  // Attempt 1: direct parse
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj.message === 'string') {
      return normalize(obj);
    }
  } catch {}

  // Attempt 2: strip markdown code fences (```json ... ```)
  try {
    const stripped = raw.replace(/^[\s\S]*?```(?:json)?\s*\n?/i, '').replace(/\n?\s*```[\s\S]*$/, '');
    const obj = JSON.parse(stripped);
    if (obj && typeof obj.message === 'string') {
      return normalize(obj);
    }
  } catch {}

  // Attempt 3: find first { ... last } in the text
  try {
    const firstBrace = raw.indexOf('{');
    const lastBrace = raw.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonStr = raw.substring(firstBrace, lastBrace + 1);
      const obj = JSON.parse(jsonStr);
      if (obj && typeof obj.message === 'string') {
        return normalize(obj);
      }
    }
  } catch {}

  // Fallback: return the text as-is but do NOT include raw JSON
  console.warn('[parseClaudeResponse] Could not parse JSON, returning raw text');
  console.warn('[parseClaudeResponse] First 200 chars:', raw.substring(0, 200));
  return { message: raw, actions: [] };
}

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
  console.log(`API Key configured: ${!!process.env.ANTHROPIC_API_KEY}`);
});
