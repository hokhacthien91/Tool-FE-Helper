# API — Plugin message payloads

This document lists the UI ↔ plugin message types and example payload shapes used by the plugin.

Incoming messages (UI → plugin)

- `checkDuplicates`
  - payload: { type: 'checkDuplicates', data: <parsedJsonArray>, prefix?: string, createVariables?: boolean }

- `generate`
  - payload: { type: 'generate', data: <parsedJsonArray>, createVariables?: boolean, prefix?: string, duplicateAction?: 'skip'|'overwrite' }

- `generateFromFigma`
  - payload: { type: 'generateFromFigma' }

- `importTokens`
  - payload: { type: 'importTokens', tokenFiles: { <filename>: <json> }, createVariables?: boolean, generateLayout?: boolean, prefix?: string, duplicateAction?: 'skip'|'overwrite' }

- `importTokensWithAction`
  - payload: { type: 'importTokensWithAction', tokenFiles: {...}, createVariables?: boolean, generateLayout?: boolean, prefix?: string, duplicateAction?: 'skip'|'overwrite' }

- `importTokensWithSelections`
  - payload: { type: 'importTokensWithSelections', tokenFiles: {...}, createVariables?: boolean, generateLayout?: boolean, prefix?: string, selections?: {...} }

- `generateWithSelections`
  - payload: { type: 'generateWithSelections', data: <parsedJsonArray>, createVariables?: boolean, prefix?: string, selections?: {...} }

- `exportTokens`
  - payload: { type: 'exportTokens', tokenTypes: string[], projectName?: string }

Outgoing messages (plugin → UI)

- `duplicatesFound`
  - payload: { type: 'duplicatesFound', duplicates: { colors:[], spacing:[], textStyles:[], borders:[], breakpoints:[] }, action: <string>, ... }

- `noDuplicates`
  - payload: { type: 'noDuplicates' }

- `status`
  - payload: { type: 'status', message: string, error?: boolean }

- `tokensExported`
  - payload: { type: 'tokensExported', tokens: <json>, projectName?: string }

Notes:
- The plugin expects `data` for generate flows to be an array where the first element typically contains a `.values` object (see `code.js` parsing).
- Parsers and helpers accept several token shapes; if you integrate a custom token source, validate it with the plugin's `parseAllTokens` logic.
