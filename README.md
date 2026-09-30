# Trip Runtime / 關西 Golden Viewer

這個 repository 同時承載兩個彼此隔離的產品範圍：

- 2026/09/10–09/15 大阪、宇治、太秦真實旅程的手機優先 Golden Viewer。
- 正在實作中的 Trip Runtime V0：把一份既有 Markdown 行程轉成可檢查、可確認、可在本機呈現的 `CanonicalTrip`。

Trip Runtime 不是 AI 行程規劃器。它保留來源意圖，讓程式抽取結構、Gemini 解讀語意、驗證器檢查結果、使用者在 Review 確認真實內容，再由 source-agnostic Result UI 呈現。

## 目前狀態

- Clean start 先開 Home，不會自動啟用大阪範例。
- Home 已提供 Markdown 檔案／貼上文字、瀏覽器本機 Gemini key 控制、Canonical JSON import、資料清除與明確 Golden sample action。
- Source Adapter、provider-neutral Gemini adapter、schemas、deterministic validators、IndexedDB persistence、workflow reducer 與 Golden compatibility tests 已存在。
- Evidence-first Review、transactional confirmation、generalized Overview／Day、light-only newspaper tokens 與部分 mobile/desktop browser coverage 已具備；完整產品驗收尚未通過。
- 已執行 exact `gemini-3.5-flash` 的歷史與 2026/09/08 live 比較：歷史 low 未通過本機 gate、medium/high 可進 Review但有忠實度缺失；最新 low 仍未通過 Review gate，medium timeout，high 回傳 503。依 2026/09/08 官方模型研究，exact stable `gemini-3.8-flash` 已取代它成為下一個驗收候選；Production default 與最終 benchmark acceptance 仍未通過。
- `complete-faithful-markdown-journey` 已在本機修正並驗證未知日期確認、未分 Day 資料呈現、Canonical 日期／時間驗證、最小來源追溯與實際入口 CSP。live benchmark、正式模型啟用、hosted header 與旅行中效用仍是獨立未通過的 gate；三個舊 change 的分數只代表歷史 checkout。
- Golden Viewer 的靜態發布目標是 Netlify；Hosted Delivery Lite 的 Functions／Blob 發布能力仍須等 benchmark gate 通過後才能實作。

## 技術與 styling ownership

- React 19、Vite 7、strict TypeScript
- Material UI：互動元件與 accessibility behavior
- Tailwind CSS 4：靜態 layout、spacing、responsive composition、component visuals 與 design tokens 的主要 styling surface
- MUI `sx`：只補 MUI internal selectors、theme-aware component states 或 Tailwind 不適合表達的動態值；同一 CSS property 不可同時寫在 `className` 與 `sx`
- IndexedDB／Web Crypto：confirmed trip 與非明文 Gemini credential persistence

## 本機開發

```sh
npm install
npm run dev
```

本機 development 目前透過 ignored `.env.development.local` 明確啟用
`gemini-3.8-flash` 候選；這不會替 Netlify production 設定模型。

主要驗證：

```sh
npm run typecheck
npm run test:unit
npm run test:component
npm run test:browser
npm run build
```

External Markdown Benchmark #001 需要由執行環境注入 `GEMINI_API_KEY`：

```sh
npm run benchmark:external-markdown-001
```

API key 不應寫入 repository、命令參數或輸出 artifact。

## 文件入口

- [`CONTEXT.md`](./CONTEXT.md)：Trip Runtime ubiquitous language
- [`spec/00_README.md`](./spec/00_README.md)：文件權威順序與維護規則
- [`spec/01_CANONICAL_CONTEXT.md`](./spec/01_CANONICAL_CONTEXT.md)：產品 Source of Truth
- [`complete-faithful-markdown-journey/tasks.md`](./openspec/changes/complete-faithful-markdown-journey/tasks.md)：目前實作與驗收進度
- [`handoff.md`](./openspec/changes/complete-faithful-markdown-journey/handoff.md)：repo 目標、8 類 review 缺失及 8 個舊未完成項目的移交對應
- [`全文件 review`](./temp/validation/full-document-review-2026-09-07.md)：缺失、證據與閱讀範圍
- [`temp/Odata/00 我/我的最初行程表.md`](<./temp/Odata/00 我/我的最初行程表.md>)：Golden itinerary source

目前 Golden Viewer 由 `netlify.toml` 定義 Netlify 靜態 build（`npm ci && npm run build`，發布 `dist`），並由 `public/_headers` 交付 CSP。這不代表已啟用 V0.1 Hosted Delivery；Functions、Blob、publication URL 與 recovery 流程仍受 benchmark gate 限制。
