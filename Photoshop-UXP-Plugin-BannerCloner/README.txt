# Banner Cloner for Photoshop (UXP)

Ban zip nay chua mot plugin Photoshop UXP co UI, viet moi hoan toan.

## Gom cac file
- manifest.json
- index.html
- styles.css
- main.js

## Cach cai
1. Cai Adobe UXP Developer Tool
2. Add plugin tu folder nay
3. Load vao Photoshop
4. Mo panel 'Banner Cloner'

## Tinh trang
Day la ban MVP scaffold:
- nhap nhieu size
- chon preset
- tao artboard moi
- duplicate nguon
- fit vao size dich

## Luu y
Ban nay chua phai production-ready cho workflow ads phuc tap.
De dung tot cho file cua ban, nen nang cap them:
- detect source artboard dung cach
- clone toan bo layer structure
- mapping layer theo ten: logo, Headline, cta, img-2
- auto-layout theo tung size
- export hang loat PNG/JPG
