# Claude Design Assistant — Figma Plugin

Figma plugin tích hợp Claude AI để tạo, chỉnh sửa design và tạo variant qua chat.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure API key

Copy `.env.example` to `.env` and add your Anthropic API key:

```bash
cp .env.example .env
```

Edit `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Build plugin

```bash
npm run build
```

### 4. Start backend server

```bash
npm run backend:dev
```

Backend runs at `http://localhost:3001`.

### 5. Load plugin in Figma

1. Open Figma Desktop
2. Go to **Plugins > Development > Import plugin from manifest...**
3. Select `manifest.json` from this project folder
4. Run the plugin from **Plugins > Development > Claude Design Assistant**

## Development

```bash
# Watch mode — auto-rebuild on changes
npm run dev

# Backend with auto-reload
npm run backend:dev
```

## Usage

1. Select a layer in Figma
2. Open the plugin
3. Type a prompt (e.g., "Create 5 variants: dark, light, minimal, gradient, accent color")
4. Claude generates action instructions
5. Click **Apply Changes** to execute

### Quick Actions
- **Dark Variant** — Creates a dark theme copy
- **Light Variant** — Creates a light theme copy
- **5 Variants** — Creates 5 different variants at once

## Architecture

```
Plugin UI (iframe) ──fetch──> Backend (Express:3001) ──API──> Claude
      │                                                          │
      │ postMessage                                              │
      ▼                                                          │
Plugin Code (code.js) ◄─── JSON actions ────────────────────────┘
      │
      ▼
  Figma API (create, clone, modify nodes)
```

## Supported Actions

| Action | Description |
|---|---|
| `clone` | Clone a node with new name and position |
| `modifyFills` | Change background/fill colors |
| `modifyText` | Change text content, font, color |
| `modifyLayout` | Change auto layout, spacing, padding, size |
| `setVisibility` | Show/hide elements |
| `findAndModify` | Find children by name and modify |
