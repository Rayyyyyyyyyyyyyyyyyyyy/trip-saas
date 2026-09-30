# 全文件 reviewer 審查 — 2026-09-07

狀態：唯讀審查完成；以下缺失尚未修正。本報告由獨立 reviewer agent 閱讀文件、回查目前工作樹，並與 root 的獨立函式重現結果交叉確認。沒有呼叫 Gemini、存取 key、修改產品或規格、提交、推送或部署。

## 結論與優先順序

1. **P1：來源沒寫完整日期，仍無法完成確認。** Prompt 已接受未知年份，但 confirmation 還要求完整起迄日。
2. **P1：沒有 Day 歸屬的合法內容會從 Result 消失。** 忠實保留 `day_id=null` 之後，缺少可以完整呈現它的地方。
3. **P1：Canonical JSON 的最後驗證漏掉日期與時間語意。** 不存在的日期、倒置旅程範圍、無時刻的 exact time 可以通過目前 authoritative validator。
4. **P1：目前部署方式與 CSP 交付方式不一致。** Pages 工作流沒有套用 Netlify `_headers` 的步驟；現有安全測試沒有證明真正入口頁受到同一 policy 保護。
5. **P2：完整模型驗收與實際輸出→Review→Result 仍未完成。** 已知 proper-name 改字與 high thinking 的日期／daypart 推斷仍存在；既有 local tests 不能替代該驗收。
6. **P2：Benchmark 的通過定義尚未明確同步「忠實未知也可通過」。** 原始 annotation 沒有區分單純未提供資料與需要提示的歧義；舊 9/15 不能繼續作為目前成績。
7. **P2：Canonical 的來源追溯欄位比規格少。** Confirmation 丟掉 source identity/locator，只保留來源／使用者的類別標記。
8. **P2：入口文件、module README 與驗證摘要存在過時敘述。** 會把 agent 導向舊 ownership、舊模型狀態或已移除視覺系統。

前三項直接影響「來源缺資料也能忠實確認並呈現」，應優先修正，再跑使用現有實測輸出的 Review recovery。模型本身未通過原始品質 gate 的事實仍須獨立保留。

## 1. P1 — Unknown 日期不能完成確認

- 位置：[buildCanonicalTrip.ts:31](/Users/ray.shao/oosaka-trip-saas/src/domain/trip/buildCanonicalTrip.ts:31)、[confirmReviewedTrip.ts:33](/Users/ray.shao/oosaka-trip-saas/src/features/review/confirmReviewedTrip.ts:33)。
- 觸發：來源只有 `0625~0629`、D1/D2，或沒有完整年份，Gemini 忠實回傳 `trip.start_date/end_date=null`。
- 證據：root 以真實函式證明 `validateParsedTripDraft(...).valid=true`，但 builder 拋出 `CanonicalTrip requires confirmed start and end dates.`；Review 只按 blocking findings 禁用確認，因此未必提前說清楚這個額外條件。
- 影響：旅客仍被迫補來源沒有的資料，或反覆碰到 generic confirmation failure。這是舊 confirmation 前提尚未跟上使用者新決策；不是新 prompt 引入的 regression。
- 合約：使用者最新「來源沒有的不要腦補、不強迫補資料」；[Pipeline 未知值規則:300](/Users/ray.shao/oosaka-trip-saas/spec/03_PIPELINE_SPEC.md:300)。Canonical executable schema 本身已允許 nullableDate，因此 builder 是額外限制。
- 修正方向：統一 Draft、Canonical、confirmation 與 Result 的未知日期規則；用已有 Day 順序／原標籤閱讀，不推導年份。新增從 null trip dates 到確認、持久化、reload、手機／桌面 Result 的端到端案例。

## 2. P1 — 未分 Day 的 Entity 沒有完整呈現位置

- 位置：[createTripPresentation.ts:261](/Users/ray.shao/oosaka-trip-saas/src/features/result/createTripPresentation.ts:261)、[compactEntityReference:201](/Users/ray.shao/oosaka-trip-saas/src/features/result/createTripPresentation.ts:201)。
- 觸發：合法 Canonical entity 的 `day_id=null`，例如有地址但沒寫日期的醫美、餐廳、住宿或航班摘要。
- 證據：root 新增一筆有唯一 title/address marker 的 null-Day 活動；authoritative validation 通過，但整份 projection JSON 沒有該 title/address。`entitiesByDay` 建立 null 分組後，迴圈只處理正式 Day IDs。航班／住宿可能留下 Overview compact title/time，但完整地址、備註、actions 等沒有 primary rendering。
- 影響：為了忠實而不猜 Day 的資料，反而看不到；旅客仍需回頭開 Markdown。最新 medium live draft 的 flight Day 正是 null，所以不是只有假想來源才會出現。
- 合約：[Result 必須保留內容:453](/Users/ray.shao/oosaka-trip-saas/spec/07_FUNCTIONAL_SPEC.md:453)、[Pipeline placement:379](/Users/ray.shao/oosaka-trip-saas/spec/03_PIPELINE_SPEC.md:379)。現行 unique-per-Day 合約沒有完整規範 null-Day 的 primary placement，是規格與實作共同缺口。
- 修正方向：提供 source-agnostic 的「未指定日期／旅程資訊」完整呈現位置，保留所有支持的語意、關係與連結；不能靠猜 Day 或複製到每一天補洞。

## 3. P1 — Canonical authoritative validation 漏掉 calendar/time 語意

- 位置：[buildCanonicalTrip.ts:116](/Users/ray.shao/oosaka-trip-saas/src/domain/trip/buildCanonicalTrip.ts:116)、[canonicalTripImport.ts:69](/Users/ray.shao/oosaka-trip-saas/src/features/import/canonicalTripImport.ts:69)。
- 觸發：匯入 `start_date=2026-02-31`、`end_date=2026-02-01`，並含 `time.kind=exact/start=null` 的 Canonical JSON。
- 證據：root 的記憶體 JSON File 經 `importCanonicalTripFile` 到達 `repository.replaceActive`；fake repository 也重跑真 validator 並接受。validator 目前只做 schema、ID、Day references、relationships；date pattern 只能檢查字串格式。
- 影響：JSON import 與 persisted-read/write 的信任邊界比 Draft 弱，會接受錯誤旅行時間。一般 Review UI 有 draft validation，不能把這個 service 入口問題說成普通 Review 點擊必定繞過。
- 合約：[Pipeline Deterministic Validator:334](/Users/ray.shao/oosaka-trip-saas/spec/03_PIPELINE_SPEC.md:334)、[Canonical import:415](/Users/ray.shao/oosaka-trip-saas/spec/07_FUNCTIONAL_SPEC.md:415)。
- 修正方向：抽出 Draft／Canonical 共用的 calendar、range、time-shape、rollover checks，保留未知值合法性；從 JSON import 與 repository reload 跑負向回歸，不只測 Draft。

前三項的實際函式 probe 步驟與限制：[root probe 記錄](/Users/ray.shao/oosaka-trip-saas/temp/validation/reviewer-root-probes-2026-09-07.md)。沒有在真實 browser storage 寫入這些反例。

## 4. P1 — CSP 安全驗證沒有覆蓋目前部署入口

- 位置：[Pages workflow:31](/Users/ray.shao/oosaka-trip-saas/.github/workflows/pages.yml:31)、[index.html:3](/Users/ray.shao/oosaka-trip-saas/index.html:3)、[public/_headers:2](/Users/ray.shao/oosaka-trip-saas/public/_headers:2)。
- 證據：目前 workflow build/upload `dist` 到 GitHub Pages，CSP 只有 Netlify `_headers`，入口 HTML 沒有 CSP meta。Implementation notes [123](/Users/ray.shao/oosaka-trip-saas/openspec/changes/archive/2026-09-07-build-trip-runtime-v0/implementation-notes.md:123) 卻稱 current deployment 是 Netlify。
- 現有 [unit:6](/Users/ray.shao/oosaka-trip-saas/tests/unit/content-security-policy.test.ts:6) 只讀 `_headers` 字串；[browser:26](/Users/ray.shao/oosaka-trip-saas/tests/browser/credential-security-policy.spec.ts:26) 開獨立 CSP fixture。它們能驗證 policy 內容與瀏覽器行為，不能證明部署入口真的交付 policy。
- 影響：文件宣稱的 credential request 限制沒有被當前 deployment artifact-to-host 路徑證明。**本次沒有檢查 live 網站 HTTP headers，也沒有觀察到資料外洩或安全事故。**
- 修正方向：按目前實際靜態 hosting 決定可執行的 CSP 交付與驗證方式；測 production entry/artifact，而不是只測特製 fixture。這不授權提前實作 Hosted Delivery。

## 5. P2 — 已知 live fidelity / recovery 驗收仍未完成

- 最新現況來自 [整合驗證:154](/Users/ray.shao/oosaka-trip-saas/openspec/changes/archive/2026-09-07-fix-gemini-schema-failure-recovery/validation.md:154)。本 reviewer 沒有重新呼叫 Gemini。
- medium/high 已通過 schema、coverage、Reviewable Draft；兩組 alternative 已保留，`8點`／`七點` exact clocks 為 null。
- medium/high 仍改掉韓文 proper-name 字元；high 仍推 first/last flight Day 及未支持的 evening daypart。Prompt 明文禁止不等於結果已符合。
- 目前 retained live artifacts 的 human_review template 仍為 pending；有針對性人工觀察，沒有完整依新判準完成全項評分，也沒有合格 live 原始輸出後的 Review correction／authoritative confirmation／persistence／Viewer acceptance。
- [tasks:30](/Users/ray.shao/oosaka-trip-saas/openspec/changes/archive/2026-09-07-fix-gemini-schema-failure-recovery/tasks.md:30) 的 5.3 與 [tasks:55](/Users/ray.shao/oosaka-trip-saas/openspec/changes/archive/2026-09-07-fix-gemini-schema-failure-recovery/tasks.md:55) 的 8.4、shared hardening 10.5 仍 open。這是已知未完成，不能當「只差跑一次測試」或以本機 green tests 代替。
- 修正方向：先離線對現有 sanitized outputs 完整重評與回放，確認 fidelity loss 發生在哪層，再針對修改重跑授權 live gate；production default 與 Hosted Delivery 繼續 gated。

## 6. P2 — Benchmark 的「surfaced」缺少新決策下的精確定義

- 位置：[benchmark.json:56](/Users/ray.shao/oosaka-trip-saas/tests/fixtures/benchmarks/external-markdown-001/benchmark.json:56)、[liveComparisonRunner.ts:599](/Users/ray.shao/oosaka-trip-saas/tests/fixtures/benchmarks/external-markdown-001/liveComparisonRunner.ts:599)。
- 目前 15 個 ambiguity annotations 同時包含「缺年份／航空公司／clinic name」及真正選項、歧義、transport semantics。評分要求所有 `surfaced=true`，但沒有明確規範「忠實 null、原文可閱讀」何時就足以通過，何時一定需要 finding。
- 舊 9/15 人工評分把未提供 identity 沒有額外警告算成 fail。最新 fix validation 已正確標記該解釋 superseded；hardening validation [134](/Users/ray.shao/oosaka-trip-saas/openspec/changes/archive/2026-09-07-harden-source-to-render-boundaries/validation.md:134) 的 follow-up 卻仍只列 9/15。
- 影響：下一個 reviewer 或 scorer 可能再次要求補缺資料；也可能為了通過而隨意填全部 surfaced，造成模型 acceptance 無法重現。
- 修正方向：保留原始 output 和歷史評分，明文版本化評分準則／acceptance semantics；區分 faithfully preserved unknown、需要解釋的歧義、unsupported invention、semantic omission。不要只刪失敗項。Schema description 的 missing-year finding 可以保留作 non-blocking explanation，不應單獨判為違反使用者指令。

## 7. P2 — Canonical 沒有規格承諾的來源 identifier / locator

- 位置：[buildCanonicalTrip.ts:93](/Users/ray.shao/oosaka-trip-saas/src/domain/trip/buildCanonicalTrip.ts:93)；[canonical schema provenance:254](/Users/ray.shao/oosaka-trip-saas/src/domain/trip/schemas/canonical-trip.v1.schema.json:254)。
- 明確合約：[Pipeline:571](/Users/ray.shao/oosaka-trip-saas/spec/03_PIPELINE_SPEC.md:571) 要求 Canonical entities retain stable provenance identifier + locator，同時 full excerpts 只在 Review。
- 實作：builder 不保留 entity source_refs，canonical provenance 只有 `origin` 與 `overridden_fields`，也沒有 source_id/locator 欄位可容納承諾。
- 影響：確認／reload 後只知道某個欄位來自 source 或 user，無法保留規格定義的 source trace。這與禁止長期存 raw evidence 是兩回事。
- 修正方向：決定最小非內容型 provenance schema 與相容／版本規則，或明確修訂上位合約；不要偷偷把全文 evidence 持久化。

## 8. P2 — 現行文件入口與完成敘述漂移

以下是文件修正，不是把已完成工作判為未實作：

| 文件 | 現況矛盾 | 建議 |
| --- | --- | --- |
| [README:15](/Users/ray.shao/oosaka-trip-saas/README.md:15) | 說 light/dark tokens 已完成；現行 06 明確 light-only | 改成目前 newspaper system，舊 dark 驗證留歷史 |
| [README:57](/Users/ray.shao/oosaka-trip-saas/README.md:57)、05 §3 | 說 build-trip-runtime-v0 是唯一進度來源；實際有 harden / fix 子 change | 列目前 changes 與共用 gate，而不是單一過時路徑 |
| [Gemini README:10](/Users/ray.shao/oosaka-trip-saas/src/integrations/gemini/README.md:10) | 將 product schema/coverage/Reviewable gates 歸 adapter；另說 application watchdog 待新增 | 對齊 interpretTrip + application workflow 實際 ownership |
| [fix tasks:59](/Users/ray.shao/oosaka-trip-saas/openspec/changes/archive/2026-09-07-fix-gemini-schema-failure-recovery/tasks.md:59) | 說 sections 6–8 not implemented，與勾選項、後續 validation 矛盾 | 明確標為舊 baseline 或更新現況 |
| build implementation-notes 的模型、CSP、先前視覺段落 | 未清楚區分歷史，仍有「尚無授權 key」「legacy 3.7 runner」「current Netlify」 | 保留歷史但補 superseded/current pointer，不讓新 agent 重走舊路 |
| [AGENTS:5](/Users/ray.shao/oosaka-trip-saas/AGENTS.md:5)、[Maps:14](/Users/ray.shao/oosaka-trip-saas/temp/trip_places_google_maps.md:14) | 仍有奈良／生駒 itinerary 敘述，當前 human MD 與 src/tripData 已是 9/13 太秦 | 同步入口及 evidence 狀態；不要將 Maps 候選存在解讀成當天 itinerary |

特別校正：**目前 `src/tripData.ts` 的 9/13 已是太秦，並非 Viewer 還在奈良。** USJ `done=false` 符合最新 AGENTS 明文 default，雖然 source Markdown 寫已備妥，不能在此次 review 擅改成 true；可在資料文件中註明 override。

## 已讀範圍與限制

- 全文閱讀／等價 diff 閱讀 **94 份 Markdown／TXT 文件**：root instructions、CONTEXT、README、spec 九份、全部 current/active/archive OpenSpec 文件、src 模組 READMEs、tests 說明、temp 研究／source text、prototype 設計文件和 uploads 的歷史文件；包含 root 本次 probe 記錄。
- **5 份 executable JSON Schemas**、benchmark annotation 與 evaluation JSON、3 份 deployment 文件已全文讀取。
- OpenSpec delta 和 current specs 的共同段落讀 current 全文，再逐行讀 unified diff；uploads 的首爾 source 與 Odata source 經 byte equality 確認。長研究文件被工具截斷處已補讀，不把 truncated response 算讀完。
- 角色依 `spec/00_README.md` 的權威順序；user 最新決策高於歷史文件。Prototype uploads 及 archived change 不作新 scope 授權。
- **沒有重新打開全部 PDF／XLSX／JPG／PNG、沒有逐頁 render HTML prototypes，沒有逐行閱讀全部應用程式或 artifact JSON。** 這些以研究／設計摘要及已留存 validation 了解背景；完整 file inventory 個別標明未重讀狀態。程式只回查與 actionable finding 有關的邊界。
- 排除 dependencies、dist、test output、Git internals、`.agents/.codex/.claude/.idea` 工具文件與 secrets。
- 本次沒有重跑全測試、部署或 live HTTP header 檢查。之前的 299 unit／10 browser／build 成功是已有 validation evidence，不宣稱 reviewer 在此次全部重跑。

完整逐檔 inventory（含角色、閱讀方式、bytes、已讀文字的 SHA-256）：[CSV](/Users/ray.shao/oosaka-trip-saas/temp/validation/full-document-review-2026-09-07-inventory.csv)。Inventory 另含未重新開啟的 reference/data/artifact，總計 162 列。沒有修改任何既有產品、規格、測試期待或 original benchmark output。
