# Design QA Checker - Licensing/Freemium System

## Overview

Hệ thống freemium cho Figma plugin "Design QA Checker" sử dụng **Figma native Payments API** (`figma.payments`). Không cần backend, database, hay Stripe riêng — Figma xử lý toàn bộ billing.

## Status (2026-03-27)

- **ENABLE_PRO_GATING = false** (đang tắt, mọi user có full quyền)
- Plugin chưa publish lên Figma Community
- Chưa có numeric ID từ Figma (đang dùng string `"design-qa-checker"`)
- Chưa có Figma seller account
- Figma checkout dialog hiện được nhưng "Buy now" chưa hoạt động vì chưa publish
- Chưa có icon 128x128, cover 1920x960, screenshots

## Cách bật/tắt

File: `scripts/features/licensing.js` dòng 6:
```js
const ENABLE_PRO_GATING = true;   // bật freemium
const ENABLE_PRO_GATING = false;  // tắt → full access cho mọi user
```

Khi `false`: ẩn nút FREE/Upgrade ở header, bỏ gate tất cả features, bỏ giới hạn issues, ẩn PRO badges.

## Free vs Pro features

| Feature | Free | Pro |
|---------|------|-----|
| Scan 17 issue types | Yes | Yes |
| Xem issues | 5 issues/type cho 4 loại advanced | Unlimited |
| Fix từng issue | Yes | Yes |
| **Fix All Now (batch)** | Blocked | Yes |
| **Export Report HTML** | Blocked | Yes |
| **Use tokens (fill scales)** | Blocked | Yes |
| **Import/Export Settings** | Blocked | Yes |

4 loại issue bị giới hạn cho free: typography-style, typography-check, color-variable, component.

## Pricing (planned)

- Monthly: $5/month
- Yearly: $36/year ($3/month, -40%)

## Architecture

```
code.js (Figma sandbox)
  ├── checkPaymentStatus() → figma.payments.status.type === "PAID"
  ├── postMessage("payment-status", { isPro }) → UI
  └── case "initiate-checkout" → figma.payments.initiateCheckoutAsync()

scripts/features/licensing.js (UI)
  ├── ENABLE_PRO_GATING flag
  ├── gateFeature() → return true (allowed) or requestCheckout() + return false
  ├── limitIssuesForFree() → truncate issues for free users
  ├── updateProBadges() → show/hide PRO badges and header status
  └── initLicensing() → setup header button + initial state

scripts/main.js
  ├── import licensing functions
  ├── gateFeature() calls on: Fix All, Export, Use tokens, Import/Export Settings
  ├── limitIssuesForFree() on issue rendering
  └── listen "payment-status" message → setPaymentStatus()
```

## Files

| File | Role |
|------|------|
| `scripts/features/licensing.js` | Core licensing logic, ENABLE_PRO_GATING flag |
| `styles/components/_licensing.scss` | Styles: PRO badge, header status btn, upgrade notice |
| `code.js` (top) | checkPaymentStatus(), setTimeout on startup |
| `code.js` (switch) | "initiate-checkout", "check-payment-status" cases |
| `manifest.json` | `"permissions": ["payments"]` |
| `ui.html` | Header status button, PRO badge spans on gated buttons |
| `scripts/main.js` | Import licensing, gate feature calls, payment-status listener |

## Steps to publish

1. Tạo plugin listing tại figma.com/developers → lấy numeric ID
2. Cập nhật `manifest.json` id thành numeric ID
3. Apply Figma seller account
4. Tạo icon 128x128, cover 1920x960, screenshots
5. Set `ENABLE_PRO_GATING = true`
6. Build → `npm run build`
7. Set pricing ($5/month, $36/year) trong Figma publish dialog
8. Submit for review (5-10 ngày)

> **Note:** Plugin cần publish trước khi Figma checkout hoạt động. Trong dev mode, "Buy now" không click được.
