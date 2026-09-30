# Trip Runtime — Response Page Research

> **Status: Current research evidence.** 本文件記錄既有 `Source` 轉成 Result / Response Page 後，有效的 presentation pattern，以及被保留、降級或壓扁的 semantic；不取代 Input Research、`Presentation Projection` 或 Result UI contract。Domain terms 見 [`CONTEXT.md`](../CONTEXT.md)，文件權威關係見 [`spec/00_README.md`](../spec/00_README.md)。

## 摘要

- 目前有 1 組 Response Reference Pair：`Busan.xlsx` → Busan mobile Web。
- 有效 baseline 包含 sticky day navigation、窄時間欄、day theme、secondary notes、badges 與 appendix。
- Static webification 的主要 semantic loss 是 Alternative、Conditional、hard deadline 與 internal timetable 被壓成一般文字。
- Pattern 必須先經過 Skyline / Visual Direction 與 Golden Screens，才能進入 Result UI Spec。

## 1. Research Goal

Input Research 回答：

> 使用者原始 itinerary 到底長什麼樣？

Response Page Research 回答：

> 已有人把 itinerary 轉成旅行 Web 時，他們認為哪些資訊值得呈現？又犧牲了哪些 semantic？

兩條 research track 分開：

```text
Input Research
→ Source semantics

Response Page Research
→ Result representation
```

Trip Runtime 最終要串起：

```text
Source
→ Canonical Trip Data
→ Runtime-useful Result
```

## 2. Reference Inventory

### Response Reference Pair #001 — Busan

#### Source

```text
Busan.xlsx
```

7 天釜山自由行。

主要欄位：

```text
日期
門票
時間
地點
備註
圖示
```

Source 具有：

- Day theme
- exact / daypart / open-ended time
- Pass / reservation metadata
- transit
- arrival buffer / hard deadline
- alternatives
- operating hours
- contextual instruction
- event cost
- internal venue schedule
- tax-refund procedure

#### Result

[Busan mobile Web](https://bbmddt.github.io/busan-travel/)

Repository：

[bbmddt/busan-travel](https://github.com/bbmddt/busan-travel)

Result 主要結構：

```text
Trip Header
↓
Sticky Day Navigation
↓
Day Card
├─ Date / Theme
├─ Time
├─ Place
├─ Pass / Reservation Tag
└─ Note

Appendix
└─ Reference Images
```

## 3. Source → Result Mapping

### 3.1 Preserve Intent, Not Layout

Source 是 Spreadsheet table。

Result 沒有直接把表格縮成手機版，而是重新組成 Day-based Web。

這是正向 evidence：

> **Source Layout ≠ Result Layout**

但好的轉換應做到：

> **Source Meaning ≈ Result Meaning**

這與 Trip Runtime 的既有產品原則一致。

---

### 3.2 Day Theme 被保留

Source date cell 同時包含：

```text
8/24
機張
Skyline Luge
膠囊列車
海岸列車
廣安里
Yacht Holic
```

Result 將它濃縮成 Day theme。

這個 pattern 值得保留：

> Day 不一定只是日期容器，也可能有使用者定義的 geography / intent。

---

### 3.3 Pass / Reservation 被提升為 Badge

Source 的「門票」欄位，例如：

```text
釜山Pass
官網購票
需預約
預約
```

Result 將它獨立成 tag，而不是埋在 note。

這是好 pattern。

但未來 Trip Runtime 應保留 semantic distinction：

```text
resource eligibility
reservation status
purchase method
discount
```

而不是全部只顯示成裝飾性 badge。

---

### 3.4 Reference Images 放到 Appendix

Result 將：

- Sealife map
- Skyline Luge image
- Songjeong timetable

集中到附錄。

這是一個重要 pattern：

```text
Supporting Data
≠
Timeline Event
```

但：

```text
Supporting Data
≠
Discard
```

它可以保留在 secondary surface。

這直接對應 Input Research 的 Preserve layer。

---

## 4. 值得帶進 Trip Runtime 的 Pattern

### P1 — Sticky Day Navigation

手機上快速跨日切換非常有效。

適合：

- Overview → Day
- Day-to-Day navigation

不代表最終 Today View 也要使用完全相同形式。

---

### P2 — Time Column + Main Content

窄時間欄搭配主要內容：

```text
TIME | PLACE / ACTIVITY
     | note
```

資訊密度高，而且比 Spreadsheet 更適合手機。

---

### P3 — Day Theme

可以幫使用者快速辨認：

```text
今天在哪一區
今天主要做什麼
```

但 theme 應由 Canonical Day Data 提供，Renderer 不自行從 raw source 猜。

---

### P4 — Secondary Note Typography

備註有價值，但不應搶走：

```text
Time
Place
Reservation
```

的主要視覺層級。

---

### P5 — Appendix / Supporting Reference

Map、場地圖、時刻表、操作圖可以有 secondary surface。

這比「每張 Event Card 都塞圖」更符合 Trip Runtime 的 restrained utility direction。

---

## 5. Baseline Result 的 Semantic Loss

這份 Result 很適合作為 baseline，因為它漂亮且實用，但仍主要是：

> **Static itinerary webification**

而不是 Runtime semantic renderer。

---

### 5.1 Alternatives 被 Flatten

Source：

```text
晚餐：
A
or B
or 回民宿休息
```

Result 仍可能變成一串 place text。

Trip Runtime 應保留：

```text
Meal Intent
├─ Option A
├─ Option B
└─ Rest / Skip option
```

---

### 5.2 Hard Deadline 埋在 Note

Source：

```text
16:30 膠囊列車
最晚 16:00 要到青沙浦
```

Result 仍把 `16:00` 放在 note。

Runtime renderer 可以提升成：

```text
NEXT
16:30 膠囊列車

ARRIVE BY
16:00 青沙浦
```

這是 Trip Runtime 相對 static Web 的核心差異之一。

---

### 5.3 Conditional Transport 被 Flatten

Source：

```text
海岸列車
如果上午已搭到，可選擇不搭
```

Result 仍主要靠 note 表達。

Canonical 應知道：

```text
optional / conditional transport
```

Renderer 才有機會在 runtime 正確弱化它。

---

### 5.4 Parent Activity 的 Internal Schedule 被埋在 Note

Source：

```text
10:00–12:30 Sealife
```

內含：

```text
10:30 水獺
11:00 人魚
11:30 企鵝
12:00 鯊魚
```

Static Result 將它們保留在 note 是合理 baseline。

但未來若證明旅行途中有價值，Runtime 可以把：

> activity internal schedule

在當下 context 中適度浮出。

目前不代表要做通用 venue-program engine。

---

## 6. 最重要的產品判斷

這份 Result 已經證明：

```text
Spreadsheet
→ Human understanding
→ Structured Web
```

可以得到比原始 Spreadsheet 更適合手機的介面。

但 Trip Runtime 不能只證明：

> 我們也能把 Excel 變漂亮。

真正需要超越 baseline 的地方是：

```text
Static Web
→ Runtime-aware Web
```

核心差異仍是：

```text
NOW
NEXT
LEAVE BY
Reservation
Directions
Contextual instruction
```

以及：

> 不把 Flexible / Alternative / Conditional semantic 壓扁。

---

## 7. Pair Research 的新價值

只有 Source 時，我們問：

> 它在表達什麼？

有 Source + Result Pair 時，可以多問：

```text
1. 哪些資訊被提升？
2. 哪些資訊被降級？
3. 哪些 semantic 被 flatten？
4. 哪些 supporting data 被保留？
5. 哪些 UI pattern 真正適合手機？
6. 哪些問題只有 Runtime 才能解？
```

因此 paired data 是不同於一般 input sample 的 evidence。

---

## 8. Research Rule

未來若找到：

```text
Original Itinerary
+
Existing Result Web / App / PDF
```

則：

- Original Itinerary 仍計入 `02_INPUT_RESEARCH.md`
- Result 另外計入本文件
- 不增加一個假的「Input Sample 編號」給 Result
- 以 `Response Reference Pair #NNN` 編號

目前：

```text
Input Samples: 25
Response Reference Pairs: 1
```

---

### 8.1 Research → Skyline → Spec Boundary

本文件收集的是：

> **Result representation evidence**

不是：

> **直接可複製的 UI 規格。**

例如 Busan Result 的 sticky day navigation、time column、badge、appendix 都是候選 pattern；它們需要進入更高一層的 visual synthesis，而不是看到就直接 hardcode。

目前 UI decision flow：

```text
Response Page Research
↓
UI Skyline / Visual Direction
↓
Golden Screens
↓
06_RESULT_UI_SPEC refinement / freeze
↓
Component / Template implementation
```

因此：

```text
Research pattern
≠
final component rule
```

同時，Result UI 不依 source format 分家。

Response Page Research 要觀察的是：

> **哪種 presentation 能最好承接旅行 semantic 與 runtime priority。**

不是：

> Spreadsheet 應該長成哪種 Spreadsheet UI、PDF 應該長成哪種 PDF UI。

最終仍是：

```text
Canonical semantic
→ source-agnostic presentation system
```

---

## 9. Current Conclusion

Response Reference Pair #001 的最大價值不是視覺風格。

而是提供了一個實際 baseline：

> **把 planning artifact 轉成 mobile-friendly Web，已經有明確價值。**

Trip Runtime 下一步需要證明的則是：

> **Canonical semantic + Runtime context 能不能比 static webification 更少讓使用者回頭找原始文件。**
