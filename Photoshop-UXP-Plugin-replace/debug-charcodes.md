# Debug: char code của Shift+Enter trong Photoshop

## Bước 1: Chuẩn bị

1. Mở PS, tạo 1 text layer mới (paragraph text — kéo box, không click point).
2. Gõ:
   ```
   Line A
   Line B[Shift+Enter]Line C
   Line D
   ```
   → 3 paragraph, paragraph thứ 2 có soft return ở giữa.
3. Click chọn text layer đó (không double-click vào edit mode).

## Bước 2: Chạy script trong Plugin > Developer > Console

Paste đoạn này vào console UXP của plugin (Plugins > Development > Developer Tools > Console):

```js
(async () => {
  const { app, action } = require("photoshop");
  const desc = (await action.batchPlay(
    [{
      _obj: "get",
      _target: [{ _ref: "layer", _enum: "ordinal", _value: "targetEnum" }]
    }],
    { synchronousExecution: true }
  ))[0];
  const tk = desc?.textKey?.textKey ?? "";
  console.log("textKey length:", tk.length);
  console.log("textKey raw:", JSON.stringify(tk));
  const codes = [];
  for (let i = 0; i < tk.length; i++) {
    const c = tk.charCodeAt(i);
    codes.push(`${i}: ${c} (0x${c.toString(16)}) ${c < 32 ? "<CTRL>" : tk[i]}`);
  }
  console.log(codes.join("\n"));
  console.log("paragraphStyleRange count:", desc?.textKey?.paragraphStyleRange?.length);
  console.log("paragraphStyleRange:", JSON.stringify(desc?.textKey?.paragraphStyleRange?.map(p => ({ from: p.from, to: p.to })), null, 2));
})();
```

## Bước 3: Đọc output

Tìm các ký tự `<CTRL>` (char code < 32). Sẽ thấy 1 trong các pattern:

- **Cả Enter lẫn Shift+Enter dùng cùng 1 char (vd cả 2 đều `13` / `0x0D`)** → PS phân biệt qua `paragraphStyleRange.from/to` chứ không qua char khác nhau → soft return không phải concept ở descriptor level.
- **Enter = `13` (`\r`), Shift+Enter = `3` (`` ETX)** → cổ điển, PS internal soft-return character.
- **Enter = `13`, Shift+Enter = `10` (`\n` LF)** → modern.
- **Enter = `13`, Shift+Enter = `11` (`\v` VT)** → ít gặp, InDesign style.

Báo lại kết quả thấy được — tôi sẽ implement convert đúng ký tự đó.
