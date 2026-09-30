# Trip Runtime — Real-world Itinerary Input Research

> **Status: Current research evidence.** 本文件記錄真實 `Source`、跨樣本結論與 semantic decision evidence；不定義 `CanonicalTrip` schema、`Semantic Interpreter` implementation 或產品範圍。Domain terms 見 [`CONTEXT.md`](../CONTEXT.md)，文件權威關係見 [`spec/00_README.md`](../spec/00_README.md)。

## 摘要

- 已分析 26 組正式樣本；樣本數不等於獨立使用者數。
- Markdown V0 的主要外部驗證 fixture 是 Sample #23（External Markdown Benchmark #001）。
- Sample #24 同時構成 Input Research evidence 與 Response Reference Pair #001 的來源側。
- 目前結論是「接近 semantic saturation，但尚未宣告達成」。
- 跨格式差異主要屬於 extraction / reconstruction；Canonical 與 Result UI 不應依來源格式分家。

## 1. Research Goal

研究策略是先觀察使用者實際使用的 itinerary，再決定解析方式。收樣時不要求使用者：

- 改成 Markdown
- 統一欄位
- 補齊時間
- 清掉私人 shorthand
- 整理 layout

目標是保留「使用者本人真的在看的版本」，並觀察 semantic saturation，而不是只累積 sample 數量。

當新 sample 幾乎不再產生新的 semantic case，才適合開始定 Canonical Model。

## 2. Sample Inventory

目前已分析 **26 組正式樣本**。

| # | Source | 旅行 / 主題 | Archetype | 最重要的新 case |
|---|---|---|---|---|
| 1 | Google Sheets | 2026 清州 | Row timeline | date inheritance、midnight rollover、transport alternatives、source conflict |
| 2 | Canva | Osaka | Visual Day Plan | anchor vs candidate、approximate time、layout semantics |
| 3 | JPG 長圖 | 四國 | Infographic | day accommodation、activity sub-route、daypart、reference block |
| 4 | JPEG | Bangkok | Weekly calendar | participant timeline、personal shorthand、unresolved place |
| 5 | PDF | 2025 東京 | Research-heavy doc | itinerary + research + photo/map reference |
| 6 | PDF | 2026 大阪 | Research-heavy doc | cancelled/reserved/purchased、conditional、fallback |
| 7 | Visual document | 熊本／阿蘇／高千穗 | Overview + execution table | reconciliation、participant subgroup、leave-by、environment timing |
| 8 | Mind map | 廣州／深圳 | Tree | ancestor context、semantic parent node、mixed node fields |
| 9 | Mind map | America | Tree + trip phases | city segment、cost subtree、road-trip phase |
| 10 | Mind map | 沙巴 | Tree + prep | preparation subtree、branch alternatives、reference subtree |
| 11 | Plain text | Seoul | Ultra-light skeleton | day theme、area cluster、opaque commitment、intentional low-detail |
| 12 | XLSX | 韓國／濟州 | Calendar grid workbook | participant subset、place DB、payer allocation、template vs trip content |
| 13 | XLSX | 釜山 | Structured row timeline workbook | stateful Pass、arrival buffer、hotel transition、sheet semantic |
| 14 | XLSX | 澎湖 | Calendar grid workbook | split/merge、tentative section、rough placeholder、pending decision |
| 15 | Plain text | 名古屋 → 金澤 → 大阪 | Recommendation-heavy draft | commitment ≠ detail、cross-day dependency、generic unresolved place、cross-year |
| 16 | Plain text | 上海 → 蘇州 → 杭州 → 紹興 | Relative-day skeleton | D1-only day、no absolute date、implicit city transition、daypart-only |
| 17 | Mobile Notes | 沖繩 | Narrative + embedded place research | day intent + choice set、route-relative stop、open start、relational unresolved place |
| 18 | Screenshot / Spreadsheet | 日本多城市行程 | Mixed calendar grid | daypart container + exact time、day geography header、separate lodging row、unresolved meal slot |
| 19 | XLSX | 2017 自我放逐-日本 | Long-haul operational workbook | derived/formula data、counterfactual fare comparison、multi-day resource economics、phase hierarchy |
| 20 | Mobile Notes / Screenshot | 宜蘭・羅東 | Dense time-block itinerary | source day ≠ calendar date、24:00 cross-midnight、meal block + candidates、emoji weak markup |
| 21 | XLSX | JP0107 | Trip workbook + operational playbook | contextual operational instruction、digital workflow、explicit intra-workbook reference、option-specific downstream action |
| 22 | XLSX | 名古屋 | Trip workbook + execution knowledge base | runtime-deferred decision、reference freshness、time-sensitive instruction、contextual knowledge base |
| 23 | Markdown | 韓國・首爾 | Markdown-native day itinerary | Markdown syntax ≠ semantic truth、mixed time notation、address-first place、missing relative image assets |
| 24 | XLSX | 2026 釜山 | Structured execution table | in-event internal timetable、booking release rule、open-ended time、paired source→result evidence |
| 25 | PDF | 九州之旅 | Ordered-stop itinerary + execution reference | sequence ordinal ≠ exact schedule、resource return prerequisite、hard deadline、candidate train schedules、embedded timetable / route image |
| 26 | PDF | 仙台・松島・藏王 | Whole-trip mobility comparison | shared itinerary backbone、transport-specific execution variants、baseline-time exception、availability verification、conditional group-tour fallback |

> Sample 數量不等於獨立使用者數。後續若研究「人的排行程習慣」，需另外標記 participant / author identity，而不能把每趟旅行都算一個獨立人。

### Sample #24 的雙重研究角色

Sample #24 的原始來源是：

```text
Busan.xlsx
```

同一份旅行另外存在已人工轉換的 Web Result：

```text
https://bbmddt.github.io/busan-travel/
```

因此：

```text
Sample #24
= Input Research evidence

Response Reference Pair #001
= Source → Result comparison evidence
```

Input semantics 仍記錄在本文件。

Result / Response Page 的研究另見：

[`04_RESPONSE_PAGE_RESEARCH.md`](./04_RESPONSE_PAGE_RESEARCH.md)

避免把：

```text
Source understanding
```

與：

```text
Result UI / Runtime rendering
```

混在同一條 research track。

### Parser Benchmark

#### External Markdown Benchmark #001 — Sample #23

Sample #23 是目前第一份：

> **由陌生使用者直接提供、未為 Trip Runtime 整理過的原生 Markdown itinerary。**

因此它同時有兩個角色：

```text
Sample #23
= Real-world research corpus

External Markdown Benchmark #001
= V0 Markdown parser validation fixture
```

它適合驗證：

- Markdown structural extraction
- mixed time normalization
- inline route sequence
- free time preservation
- alternatives
- cross-midnight flight
- incomplete structured data
- relative image references
- conservative Place parsing

### Boundary Case（不計入正式 Sample）

#### Google My Maps / KMZ

曾收到一份 Google My Maps source。

目前只確認：

- Source 是 spatial-first
- Place 可能原生就有 coordinates
- Layer / marker / route 可能承載 semantics
- Resolved Place 不等於 Planned Visit

但 My Maps / KML / KMZ 目前看起來偏長尾，而且尚未取得完整可分析的 spatial payload，因此：

```text
status: boundary case
priority: low
parser support: defer
counted_in_main_corpus: false
```

它的研究價值主要是提醒：

> Canonical Model 不要假設所有 Place 都一定從文字解析而來。


## 3. Source Archetypes

目前可觀察到至少十六種，不代表最終 taxonomy。

### A. Row Timeline / Spreadsheet

```text
日期 | 時間 | 行程 | 備註
```

語意可能依賴：

- row
- column
- blank cell
- merged cell
- inherited date

---

### B. Calendar Grid

```text
       Day1   Day2   Day3
06:00
07:00
08:00
```

位置本身就是時間與日期。

但：

> 視覺上畫在精確時間格，不代表使用者真的認為它是精確時間。

Sample #14 明確寫「隨便劃大概」。

---

### C. Visual Day Plan

```text
飯店 → A → B → C → 飯店
```

下方再附：

- restaurant
- shop
- Google Maps
- opening hours
- candidates

主線與候選不能 flatten。

---

### D. Infographic

一張圖中同時放：

- trip metadata
- day
- timeline
- hotel
- reminder
- recommendation
- reference timetable
- packing

Layout role 必須另外判斷。

---

### E. Research-heavy Travel Document

同一份檔案同時是：

```text
execution plan
research backlog
place candidates
food notes
photo spots
map
transport guide
reservation links
```

不能假設「文件裡出現的 place = itinerary stop」。

---

### F. Detailed Execution Table

可能同時有：

- travel duration
- stay duration
- place
- description
- source URL
- reference image

Summary 與 Detail 可能描述同一 conceptual event。

---

### G. Mind Map / Tree

語意依賴：

- node
- parent
- children
- sibling
- branch
- ancestor context

Plain OCR 會破壞主要結構。

---

### H. Ultra-light Day Skeleton

可能只有：

```text
週二：聖水工作＋逛街
週三：首爾林工作＋朋友
```

低 detail 不代表低 quality。

對本人而言，這可能已經是完整 itinerary。


---

### I. Recommendation-heavy Draft

文字可能非常完整，包含大量景點介紹與建議，但真正 commitment 很低。

常見語氣：

```text
可以
建議
如果時間允許
可以選擇
若喜歡
視情況
```

因此：

> **資訊多 ≠ 已確定。**

---

### J. Mobile Notes Hybrid

先用 narrative 寫一天怎麼走，再補：

- 餐廳
- 地址
- URL
- 營業時間
- 候選店家

同一 conceptual itinerary 可能被人工重複兩次：

```text
敘事版
+
資料版
```

需要 reconciliation。

---

### K. Mixed Calendar Grid

Calendar Grid 上同時存在：

- Day
- Daypart
- Exact time
- City / Region header
- Lodging row
- Meal slot
- Transit
- Note

來源位置與 cell 內文字共同承載語意。


---

### L. Long-haul Operational Workbook

不是單純 itinerary sheet，而是長途旅行的人工 travel operating system。

可能同時包含：

```text
Trip overview
Regional / phase sheets
Daily execution
Transport records
Pass rules
Fare comparison
Formula-derived totals
Accommodation segments
```

特徵：

> Planning、reference、cost model、execution data 共存在同一 workbook。

---

### M. Dense Time-block Mobile Notes

手機備忘錄直接以：

```text
Day
→ exact time block
→ activity / place
→ meal candidates / reference pool
```

組成。

常見：

- exact time ranges
- emoji as weak markup
- candidate restaurants under meal blocks
- reference pools
- cross-midnight activity



---

### N. Trip Workbook + Operational Playbook

主行程之外，另有專門的操作教學，例如：

- 機場到市區怎麼走
- 如何買指定席
- 哪個月台
- 哪個售票機
- APP 怎麼操作
- 入園後才能做什麼

這不是普通 itinerary，也不是單純 research。

它更接近：

> **Contextual operational instruction**

也就是：

> 到了某個 execution context 才真正有價值的操作知識。

---

### O. Trip Workbook + Execution Knowledge Base

主 itinerary 很簡潔，但 workbook 另外維護：

- 飯店附近
- 車站地圖
- 交通步驟
- 景點攻略
- 餐廳候選
- 排隊時間
- 現場判斷規則

這種 source 不是「主行程 + 雜項」，而是：

```text
itinerary
+
contextual execution knowledge
```

其中 supporting data 不一定要進 Timeline，但可能在旅行途中非常有用。



---

### P. Markdown-native Day Itinerary

使用者直接以 Markdown 寫自己的 itinerary：

```text
# Trip title
日期
Markdown table
---
Day heading
inline sequence
links
images
bold place names
free text
```

特徵是：

> Markdown syntax 提供 structure，但不能直接當成旅行 semantic。

例如同一個 `>` 可能只是：

```text
A > B > C
```

表示旅行順序，而不是 blockquote。


---

## 4. Cross-sample Findings

以下是目前最重要的共通結論。

---

### 4.1 Event 不是唯一資料單位

真實文件至少出現：

#### Trip / Day
- trip
- trip phase
- city segment
- day
- day theme
- area cluster

#### Execution
- event
- activity
- work
- restaurant
- flight
- transit
- accommodation
- free time

#### Flexible / Decision
- optional
- candidate
- unresolved
- alternative
- conditional
- fallback
- tentative
- pending decision

#### Resource / State
- reservation
- ticket
- Pass
- activation
- validity window
- rental car
- chartered car
- hotel stay

#### Supporting knowledge
- recommendation
- research note
- map
- photo spot
- timetable
- opening hours
- preparation
- packing
- shopping
- budget / expense
- personal note

如果全部 event 化，會扭曲 source intent。

---

### 4.2 Time 不是一種欄位

已出現：

| Semantic | Example |
|---|---|
| Exact event time | `14:00 清水寺` |
| Approximate | `約 10:30 出門` |
| Daypart | `下午` |
| Event duration | `停留 1 hr` |
| Transit duration | `車程 30 min` |
| Transport schedule | `10:56–11:41` |
| Reservation time | `12:30 已預約` |
| Required arrival | `20 分鐘前到集合點` |
| Business hours | `10:00–20:00` |
| Deadline / Leave-by | `最晚 15:45 發車` |
| Relative deadline | `起飛前 48 小時` |
| Resource validity | `啟用後 48 小時` |
| Environmental timing | `05:30 滿潮` |
| Date range | `LA 12/16–12/19` |

所以：

```text
Regex 找時間 → start_time/end_time
```

不成立。

---

### 4.3 Low precision 可以是 intentional

已看到：

- 約 10:30
- 下午
- 晚上
- Some Temple
- 附近逛逛
- 工作＋朋友
- 看體力
- 不想逛就回飯店
- 時間「隨便劃大概」

因此：

> **Missing precision 不應自動被視為 parser 要補完的缺陷。**

---

### 4.4 Optional / Alternative / Conditional 不同

#### Optional
> 有體力再去春日大社。

#### Alternative
> 晚餐 A 或 B。

#### Conditional
> 火口開放就去中岳，否則去博物館。

#### Tentative
> 這整天目前只是暫定。

#### Unresolved
> Some Temple。

它們不是同一個 `optional: true` 可以概括。

---

### 4.5 Relationship 是一等資訊

已看到：

#### Transit alternative
```text
Airport → Hotel
├─ Bus A
└─ Bus B
```

#### Activity sub-route
```text
石鎚山登山
└─ 成就社 → 夜明峠 → 彌山 → 天狗岳
```

#### Participant split / merge
```text
group
├─ A subgroup
├─ B subgroup
└─ regroup
```

#### Overview / Detail
```text
Overview: 阿蘇神社
Detail: 10:40–11:40 阿蘇神社
```

#### Conditional fallback
```text
中岳火口
└─ if closed → 火山博物館
```

---

### 4.6 多人旅行不能預設 shared timeline

已看到：

- 不同人不同航班
- 部分人參加跳島
- subgroup 分流
- 最後 regroup
- preparation status 也可能依 participant 不同

因此未來 Trip Data 很可能需要：

```text
participant
participant group
event applies_to
```

但目前仍屬 semantic evidence，不是 finalized schema。

---

### 4.7 Accommodation 有多種 role

可能是：

#### Stay metadata
> 今天住 Saijo Urban Hotel。

#### Check-in event
> 19:30 飯店 check-in。

#### Transition
> Hotel A check-out → 이동 → Hotel B check-in。

不能全部當同一種 hotel card。

---

### 4.8 Resource 可能有 state

例：

> 啟用 Busan Pass 48 小時。

包含：

```text
resource
activation moment
validity duration
downstream eligibility
```

同樣：

- rental car
- charter car
- day pass
- ticket

不一定只是 event。

---

### 4.9 Source 本身可能錯

已看到：

- 清州行程混入大邱機場交通
- 車程 6 分鐘，但時間寫成 10:10–10:06
- midnight 後日期沒換
- copy-paste 候選清單
- summary/detail 看似 duplicate
- opaque shorthand

因此：

> **Source ≠ Truth**

但：

> **Parser ≠ Editor**

正確方向是標 conflict / confidence / review，而不是偷偷修。

---

### 4.10 Workbook / Document 內可能有多個 domain

例如 XLSX 內同時有：

- itinerary
- place database
- cost
- immigration
- driving reference
- packing
- shopping

甚至同一 worksheet 裡：

> timeline 下方又接 place database。

因此 extraction 至少需要：

> **section / block classification**

---


### 4.11 Information Density ≠ Itinerary Commitment

Sample #15 特別明顯：

```text
文件寫很多
≠
行程很確定
```

例如：

```text
可以去名古屋城
如果時間允許去榮
可以選擇海遊館
```

文字很完整，但本質是 recommendation / suggestion。

反過來 Sample #16：

```text
D2 蘇州：AM 拙政園+獅子林 / PM 寒山寺
```

文字極少，但 itinerary intent 非常清楚。

因此 parser 不能用資訊完整度推導 commitment / certainty。

---

### 4.12 Cross-day Dependency

Sample #15：

```text
12/29 合掌村 or 兼六園
↓
12/30 若前一天已去合掌村，則...
```

Choice 不一定只影響同一天。

可能存在：

```text
Day N decision
→ Day N+1 available options
```

---

### 4.13 Relative Day 可以沒有 Absolute Date

Sample #16 只有：

```text
D1
D2
D3
```

沒有 calendar date。

因此：

> Day ordinal 與 absolute date 應視為不同資訊。

---

### 4.14 Implicit Geographic Transition

Sample #16：

```text
D3 杭州
D4 紹興
```

source 沒寫交通。

系統可以知道 geography changed，但不能自行創造 train / departure time / transport event。

---

### 4.15 Day Intent + Entity Choice 是不同層

Sample #17：

```text
晚餐美國村
1. 88牛排
2. RIKIO
```

已確定的是：

```text
activity: dinner
area: American Village
```

未確定的是 restaurant entity。

---

### 4.16 Route-relative / Relational Place

Sample #17：

```text
前往美麗海路上可以去許田休息站
```

以及：

```text
去還車地方前面有一個海邊公園
```

Place 的意義可能來自 relationship：

- on the way to X
- before Y
- near another stop

---

### 4.17 Intentionally Open Start

Sample #17：

```text
睡到自然醒
```

不是 missing start time。

它表示 morning start intentionally unconstrained。

同一天仍可能有：

```text
14:30 還車
```

即：

> Flexible day + hard deadline 可以共存。

---

### 4.18 Same Concept May Appear as Narrative + Detail

Sample #17 同一天先寫 narrative itinerary，下面又補：

- 地址
- URL
- 營業時間
- 餐廳資料

Repeated mention 不等於 duplicate event。

需要分辨：

```text
execution occurrence
vs
supporting place detail
```

---

### 4.19 Daypart 可以只是 Layout Container

Sample #18：

```text
上午
下午
晚上
```

每個 daypart cell 內仍可能有 exact time。

所以：

> daypart row 是 source container，不一定是 event-level time precision。

---

### 4.20 Day Geography / Lodging 可以是獨立 Context Layer

Sample #18 同時有：

- Day header
- City / Region header
- 上午 / 下午 / 晚上
- 宿

因此：

```text
Day
├─ Geography
├─ Daypart
├─ Events
└─ Accommodation
```

City header 與 lodging row 都不是普通 event。

---

### 4.21 Unresolved Meal Slot

Sample #18：

```text
午餐 - ???
晚餐 - ???
```

這不是 parser failure。

它表示：

```text
meal intent: known
specific place: unresolved
```



### 4.22 Derived / Calculated Source Data

Sample #19 出現 Excel formula / 計算結果。

例如概念上：

```text
多段交通票價
→ formula SUM
→ estimated total
→ compare against PASS price
```

這表示 Source Data 不只包含：

> 使用者輸入的事實或計畫

也可能包含：

> 使用者根據某個方案推導出的結果。

因此 extraction 對 Spreadsheet 可能需要區分：

```text
raw input
formula
calculated result
```

而：

> Calculated result 不一定等於旅行中真正發生的成本。

---

### 4.23 Counterfactual / Comparison Data

Sample #19 同時保存：

```text
方案 A：自由席
方案 B：指定席
方案 C：PASS
```

這些資料可以同時存在，但實際旅行只會採取其中一部分。

因此 source 內除了：

- confirmed
- optional
- candidate

還可能存在：

> **counterfactual planning data**

也就是：

> 「如果採用這個方案，成本 / 時間會是多少」。

這類資料不能被當成多個同時發生的 events。

---

### 4.24 Multi-day Resource Economics

Sample #19 的 PASS / 票券並不是單一 event。

它可能：

- 橫跨多日
- cover 多段 transport
- 有使用條件
- 有適用範圍
- 有方案比較
- 有整體 cost impact

Sample #13 已看到 stateful Pass。

Sample #19 進一步強化：

> Trip Resource 可以有跨日 dependency 與 economics。

---

### 4.25 Trip → Phase → Day → Event Hierarchy

Sample #19 的長途旅行自然形成：

```text
Trip
↓
Region / City Phase
↓
Day
↓
Event
```

而不是只有：

```text
Trip
→ Day
→ Event
```

長途、多城市旅行特別需要 phase / segment context。

---

### 4.26 Participant Membership May Change by Phase

長途旅行中，同行者可能不是從第一天到最後一天完全相同。

也就是 participant relation 可能是：

```text
Trip participant
+
active date / phase range
```

而不只是：

> event applies_to 某 subgroup。

這是 participant-aware model 的另一層。

---

### 4.27 Source Day ≠ Calendar Date

Sample #20：

```text
DAY 2
...
24:00–06:30 星聚點
```

使用者把凌晨活動仍視為：

> Day 2 晚上的最後一攤。

因此可能需要同時保留：

```text
source_day = Day 2
actual_calendar_datetime = next date 00:00–06:30
```

Normalization 不應因 calendar rollover 就強行改變使用者的 day grouping。

---

### 4.28 `24:00` 是有效的 Source Representation

Sample #20 直接使用：

```text
24:00–06:30
```

`24:00` 在 source 裡有明確人類語意：

> 當天結束、下一天 00:00。

Parser 可以 normalize，但必須保留 source representation / source-day relation。

---

### 4.29 Meal Time Block + Candidate Entity Layer

Sample #20：

```text
午餐 13:00–14:30
├─ 小籠包
├─ 蔥油餅
├─ 紅麵線
└─ 豆花
```

這不一定表示四個 sequential events。

更接近：

```text
meal block
+
candidate / possible food stops
```

再次證明：

> Activity intent 與 concrete entities 可以是不同層級。

---

### 4.30 Personal Emoji Can Function as Weak Markup

Sample #20 中：

```text
🍽️ meal
📌 place / candidate
🔑 check-in / check-out
❌ no ticket
```

Emoji 有一致的結構用途。

但只能視為：

> **weak semantic signal**

不能全域硬編：

```text
📌 = confirmed event
```

因為同一符號也可能標 fixed place、candidate 或 reference。

---

### 4.31 Event-level Cost Annotation

Sample #20：

```text
門票 $200
停車費 $50
門票 $450 / 3小時
```

與 #12 / #19 的 trip-level cost model 不同。

這是：

> **cost attached to an execution entity**

因此費用至少可觀察到兩種 role：

```text
trip-level accounting / modeling
event-level cost annotation
```

是否產品化仍是另一個問題。

---

### 4.32 Tool Complexity ≠ Trip Intent Complexity

Sample #19 與 #20 形成很明顯的對照：

```text
#19
19-sheet / formula-heavy operational workbook

#20
single mobile note / emoji / time blocks
```

兩者都能清楚表達旅行。

因此：

> Source tooling complexity 不是 itinerary semantic complexity 的可靠 proxy。

Canonicalization 要理解的是：

> 使用者在表達什麼

而不是：

> 使用者用了多複雜的工具。



### 4.33 Contextual Operational Instruction

Sample #21 出現：

- 售票機操作
- 機場轉乘步驟
- 月台 / 出口指示
- APP 操作流程

這些資料不是 Event，也不是 Recommendation。

它們更像：

> **到了某個情境才需要浮上來的 execution instruction**

例如：

```text
NOW: 成田機場
REFERENCE:
如何搭京成線到上野
```

這可能對 Runtime 有價值，但目前不需要做成完整 procedure engine。

---

### 4.34 Digital Workflow / Procedure State

Sample #21 的 Disney App 流程出現：

```text
下載 APP
→ 綁定票券
→ 入園
→ 才能購買 DPA
→ 某些申請有時間 / 次數限制
```

這表示 reference data 也可能具有：

- prerequisite
- state
- sequence
- availability condition

但目前仍屬：

> Preserve / Reference semantic

不應因為 source 出現 workflow，就立即建立通用 workflow engine。

---

### 4.35 Explicit Intra-source Reference

Sample #21 主 itinerary 直接寫：

```text
請查閱淺草美食區
```

這代表：

```text
itinerary node
→ explicit reference
→ supporting sheet / section
```

以前很多 supporting knowledge 與 itinerary 的關係只能推測。

這次 source 本身直接提供 link / reference relation。

---

### 4.36 Option-specific Downstream Action

Sample #21：

```text
滑雪
or
採草莓
```

但如果選採草莓：

> 還需要搭計程車。

所以：

```text
choice
└─ option B
   └─ requires transport
```

Alternative 不只可以有自己的 closing time，也可以有自己的 downstream requirement。

---

### 4.37 Runtime-deferred Decision

Sample #22 的餐廳選擇明確表示：

> 到現場看排隊狀況再決定。

這不是 planning failure。

它是刻意：

```text
decision_time = runtime
```

並且每個 option 可能有：

- queue timing
- reservation rule
- cutoff
- availability

這再次支持：

> 某些決策本來就不應該在旅行前被強行確定。

---

### 4.38 Reference Freshness / Validity

Sample #22 出現：

> 某巴士中心將在 2026 年 3 月後停用 / 改站位

而 trip date 在之後。

這第一次很明確證明：

> Supporting reference 也可能過期。

因此 reference data 可能需要：

```text
source fact
validity / freshness
verification state
```

但這與 live runtime data 不完全相同。

它是：

> 靜態 source 中的資訊隨時間失效。

---

### 4.39 Research vs Runtime Instruction

過去我們把很多 non-itinerary content 統稱 Reference。

#21 / #22 之後，至少值得分開：

#### Research
旅行前用來理解 / 比較。

#### Runtime Instruction
旅行途中在某個 context 下會直接拿來執行。

#### Recommendation
候選 / 建議。

#### Background
純介紹。

這個 distinction 可能影響 Renderer 是否要在特定時間 / 地點浮出 supporting content。

---

### 4.40 Supporting Data May Be Runtime-critical

以前容易假設：

> Supporting data = 不重要 / 不 render。

但 #21 / #22 顯示有些 supporting data 可能非常 runtime-critical，例如：

- 怎麼買票
- 哪個出口
- 哪個月台
- APP 現場流程
- 必須提早抽號碼

因此正確做法不是：

```text
non-itinerary
→ ignore
```

而是：

```text
non-itinerary
→ classify role
→ preserve
→ decide runtime relevance later
```



### 4.41 Markdown AST ≠ Semantic Truth

Sample #23 出現：

```text
買 T-money > 搭機場地鐵 > 首爾車站 > 轉四號線到明洞
```

這裡的 `>` 是：

> source author 用來表示 itinerary sequence 的符號。

不是 Markdown blockquote。

同一份文件又有：

```text
>>>地鐵2號線 江南站 9號出口正前方
```

Markdown parser 可能把它解成巢狀 blockquote，但旅行語意更接近：

> 與前一個醫美地點相關的交通 / 出口提示。

因此：

```text
Markdown AST
→ structural evidence
≠
semantic truth
```

Parser 仍需要依旅行 context 理解內容。

---

### 4.42 Mixed Time Notation Within One Source

Sample #23 同一份文件混用：

```text
11:55
6:30
12點
5.30
8點
11.30
七點
```

因此 time parser 不能假設：

> 一份文件內會使用一致 notation。

需要 normalize：

- colon time
- dot time
- Arabic number + 點
- Chinese numeral + 點

同時保留 raw source value。

---

### 4.43 Partially Structured Flight Entity

Sample #23 的 Flight table 只有：

```text
去程 | 11:55 | 15:35
回程 | 23:00 | 00:35
```

缺少：

- airline
- flight number
- explicit airport pair
- row-level date

但 surrounding trip context 又提供部分 date information。

這是一個很乾淨的 case：

> **Entity type 可辨認，但 fields 不完整。**

正確處理是：

```text
parse known fields
preserve unknown fields
inherit only strongly supported context
review if necessary
```

不能因為它「看起來像台灣飛首爾」就自行補 airport / airline。

---

### 4.44 Address-first Place

Sample #23：

```text
醫美：
首爾特別市瑞草區瑞草大路77街 3
ARA TOWER 4樓
```

沒有明確 clinic name。

這表示 Place 不一定從：

```text
name
→ address
```

開始。

也可能是：

```text
address
→ unresolved entity identity
```

因此：

> Place identity incomplete 不代表 Place unusable。

這仍可在 Review / Map Resolution 階段繼續處理。

---

### 4.45 Missing Relative Asset Must Not Break Parse

Sample #23 Markdown 內有：

```text
![image.png](image.png)
![image.png](image%201.png)
```

若 upload 時只有 `.md`，relative image asset 可能不存在。

Extractor 應：

```text
detect asset reference
→ preserve path / source position
→ mark asset unavailable
→ continue parsing surrounding itinerary
```

不能讓缺一張時刻表圖片造成整份 itinerary parse failure。

---

### 4.46 Fixed Anchor + Flexible Space

Sample #23 Day 2：

```text
12:00 午餐
→ 自由活動
→ 吃點東西
→ 17:30 回房
→ 搭地鐵
→ 20:00 演唱會
```

這強化一個已反覆出現的 runtime pattern：

```text
Flexible space
↓
Hard timed anchor
```

Renderer 不應把一天內所有項目視為相同重要度。

尤其：

> Flexible / casual content 不應蓋掉真正不能錯過的 timed anchor。

目前先視為既有 semantic 的重要 relation，不新增完整 priority engine。

---

### 4.47 Free Time Can Be First-class Itinerary Content

Sample #23 多次明確寫：

```text
自由活動
下午聖水洞自由探索
晚餐：隨便吃吃
再看看要不要去梨泰院或回房間躺
```

這不是缺資料。

而是使用者明確安排：

- intentionally flexible time
- generic meal intent
- runtime-deferred alternative

再次強化：

> Low specificity 也可以是完整且有意義的 itinerary intent。

---

### 4.48 Inline Route Sequence

Sample #23 頻繁使用：

```text
A > B > C > D
```

一行內可同時包含：

- transit
- station
- destination
- meal
- free time

因此：

> 一個 Markdown paragraph / list item 不等於一個 Event。

Parser 需要先拆 semantic units，再保留 source order / relation。



### 4.49 Parent Activity + Internal Timetable

Sample #24：

```text
10:00–12:30 Sealife 水族館
```

同一個 activity 的備註內又包含：

```text
10:30 水獺餵食
11:00 人魚表演
11:30 企鵝餵食
12:00 鯊魚餵食
```

這些時間不是四個與水族館平行的 top-level events。

更接近：

```text
Parent Activity
└─ Internal Schedule / Venue Program
```

因此：

> 一段 note 中出現多個時間，不代表每個時間都應提升成 Day timeline event。

這是 Time Semantic 與 Event Hierarchy 的交叉 case。

目前決策：

```text
Core:
辨識 parent activity 不能被拆壞

Preserve:
internal timetable 本身先保留

Defer:
通用 venue-program engine
```

---

### 4.50 Booking Release Rule

Sample #24 的膠囊列車：

```text
前 4 週的週二早上 6 點訂票
```

這不是：

- event start time
- reservation time
- arrival buffer
- opening hours

而是：

> **Reservation acquisition / release rule**

也就是某項 reservation 在什麼時間點才能或應該取得。

它與既有 Relative Deadline 接近，但 role 不同。

目前先列為 Preserve semantic：

```text
Booking Release Rule
```

不在 V0 建立 reservation automation。

---

### 4.51 Open-ended Time

Sample #24：

```text
18:30~
15:30~
```

表示：

```text
start known
end intentionally unspecified
```

不能把它視為 malformed time range。

因此 Time model 至少需要允許：

```text
start = 18:30
end = null
```

並保留 source representation。

這屬於 Core time semantic，因為若 validator 把它判錯，會直接破壞合法 itinerary。

---

### 4.52 Structured Ticket / Pass Metadata Reinforced

Sample #24 使用獨立欄位記：

```text
釜山Pass
官網購票
需預約
預約
釜山Pass 8折
釜山Pass 7折
```

這再次證明：

> Ticket / Pass / Reservation 不一定藏在 prose，而可能是與 Event 平行的 structured metadata。

其中：

- resource eligibility
- reservation state
- discount / purchase method

不能全部壓成單一 boolean。

但完整折扣 / economics 模型仍維持 Preserve / Defer 邊界。

---

### 4.53 Source → Result Pair Can Expose Semantic Loss

Sample #24 同時有 source 與人工 Web Result。

例如 source：

```text
最晚 16:00 要到青沙浦
16:30 膠囊列車
```

在 static Web Result 中，`16:00` 仍埋在 note 裡。

又例如：

```text
晚餐 A
or
晚餐 B
or
回民宿休息
```

Result 仍可被 flatten 成單一 display string。

這提供新的研究方式：

> 不只問 parser 有沒有理解 source，也可以觀察「轉成 Result 後哪些 semantic 被壓扁」。

完整 Result evidence 記錄於：

```text
04_RESPONSE_PAGE_RESEARCH.md
```

---

### 4.54 Resource Return Deadline Can Carry a Prerequisite

Sample #25 的租車資訊同時出現：

```text
20:00 前完成還車
還車前需先加滿油
```

這不是單純的 rental-car end time。它同時包含：

```text
resource return deadline
+
pre-return prerequisite
```

因此 Resource lifecycle 可能具有：

- pickup / activation
- usage window
- return deadline
- prerequisite before return

這類 prerequisite 若被忽略，可能直接造成 runtime execution failure，因此需要至少被辨識並保留；是否建立完整 resource workflow engine 仍屬後續決策。

---

### 4.55 Sequence Ordinal ≠ Exact Schedule

Sample #25 大量使用：

```text
第一站
第二站
第三站
```

這些 ordinal 明確提供：

> **relative execution order**

但不提供：

> **exact time schedule**

因此 parser 可以保留 stop order，不能因為「第一站 / 第二站」就自行推導缺失的出發或抵達時間。

同一份 source 也出現候選新幹線車次，例如多個 departure windows；這些是 choice set / transport reference，不代表所有車次都已 confirmed。

---

### 4.56 Embedded Timetable / Route Diagram Can Be Execution Reference

Sample #25 的 PDF 把部分交通資訊直接放在內嵌圖表中，例如：

- station-to-station route diagram
- departure timetable
- transfer / travel-time reference

這些內容不是裝飾圖片。它們可能是旅行途中直接要看的：

> **runtime-useful execution reference**

因此 PDF extraction 若只取得 text layer / OCR text，可能遺失：

- image 與 surrounding itinerary 的 relation
- timetable 的 row / column semantics
- route topology
- candidate departure structure

目前這仍主要是 PDF extraction evidence，不代表 PDF 必須提前進 V0 roadmap。

---

### 4.57 Whole-trip Variants Can Share One Semantic Backbone

Sample #26 不是兩趟獨立旅行。它先聲明：

```text
兩個版本吃的店、景點、順序完全一樣，
差別只在週一、二、四、五怎麼移動。
```

接著分成「租車版」與「不租車版」，但共用航班、飯店、餐食、主要景點與 Day 順序。差異集中在：

- 機場與飯店之間的移動
- 松島、狐狸村的 transport execution
- 租還車、停車、雪胎與 ETC prerequisites
- 部分出發時間與可順路加入的停靠點

因此 source-level duplication 不代表 Canonical 應複製成兩趟 Trip。它更接近：

```text
shared itinerary backbone
+
whole-trip mobility alternative
+
option-specific events / instructions
```

這強化既有 Alternative 與 option-specific downstream action；它沒有建立新的 Result family，也不提前授權 PDF intake。

---

### 4.58 Baseline Schedule Can Have Named Exceptions

Sample #26 以「每天 10:00 出飯店」作為共同基準，但不租車版狐狸村 Day 明載：

```text
09:30 出飯店（這天例外，早半小時）
```

基準時間是 reusable plan constraint，不是可以無條件覆寫每一天的 event time。Parser / Review 必須保留：

- general baseline
- explicit Day-specific override
- override reason（配合新幹線與 10:15 巴士）

這強化 contextual operational instruction 與 exception precedence；不能把兩個時間視為衝突後任選其一。

---

### 4.59 Availability Claims Can Require Runtime Verification

Sample #26 對狐狸村交通與 KKday 替代案同時保留不確定性：

```text
巴士運行日每月不同，出發前一週確認
最少 12 人成團，出發前 5 天才確認
網頁目前只開放到 9 月底，10 月再查 12/3
```

這些不是已確認 reservation，也不是 Day event time。它們是：

```text
candidate plan
+
freshness-bounded reference
+
future verification action
+
fallback transport
```

這強化 Sample #21–#22 的 runtime-deferred decision、reference freshness 與 option-specific action，未產生新的 Core semantic 類型。


## 5. Source-specific Extraction Implications

### Markdown

保留：

- raw source text
- headings
- paragraphs
- list
- table
- checkbox
- links
- image / asset references
- emphasis
- source order
- source position

不要先壓成 plain text。

同時注意：

> **Markdown syntax 只是 structural signal，不是旅行 semantic。**

例如：

```text
A > B > C
```

可能是 itinerary sequence，而：

```text
>>>交通提示
```

也未必代表真正的引用層級。

另外：

- relative image asset 缺失不可讓整份 parse fail
- time notation 可能在同一份文件內混用
- 一個 paragraph 可能包含多個 semantic units
- Markdown table 可能只提供 partially structured entity

---


### Spreadsheet

保留：

- workbook
- sheet name
- row / column
- merged cells
- blank cells
- raw/effective cell value
- formula
- calculated result
- formatting hints
- hyperlinks
- embedded images

至少區分：

1. Row timeline
2. Calendar grid
3. Mixed calendar grid
4. Multi-sheet operational workbook
5. Reference / modeling sheet

特別注意：

> formula result 可能是 derived / counterfactual planning data，不一定是 execution fact。

---

### Operational / Knowledge Sheets

若 workbook 中存在：

- 購票教學
- 交通說明
- APP 操作
- 車站地圖
- 飯店附近
- 景點攻略

Extractor 應保留：

- sheet name
- source structure
- step order
- headings
- explicit references
- links
- validity / date-sensitive statements if present

但 parser 不應立刻把這些轉成 timeline events。

---

### Mobile Notes / Plain Text

不能只依：

- line break
- exact time
- emoji

直接產生 events。

應辨識：

- day headers
- time blocks
- candidate pools
- reference sections
- nearby-text relations
- source-day grouping
- personal notation conventions

尤其 cross-midnight 時：

> source day 與 calendar date 需分開考慮。

---

### PDF / Canva / Image

Plain OCR 不足。

要保留可能有用的：

- text block
- coordinates
- visual grouping
- section boundaries
- caption
- image/reference relation

特別是 PDF 中的 embedded timetable / route diagram 可能是 runtime-useful execution reference。Extractor 應保留 visual asset、所在 page / block、與 surrounding itinerary 的關係；不能只抽 text layer 後丟棄圖表結構。

---

### Mind Map

優先拿原始 editable source。

若只能圖片：

> 要做 tree reconstruction，不是 OCR 後把文字排成一列。

---

## 6. Observed Semantic Inventory

> 這裡只是候選語意集合，不是 schema。

```text
Trip
Trip Phase
City Segment
Day
Day Ordinal
Absolute Date
Source Day
Day Theme
Day Geography
Area Cluster
Sequence Ordinal

Event
Activity
Work
Restaurant
Free Time
Transit
Flight
Accommodation

Place
Area
Candidate Place
Unresolved Place
Address-first Place
Relational Place
Route-relative Place

Participant
Participant Group

Time
Duration
Time Precision
Deadline
Arrival Buffer
Cross-midnight
Open-ended Time
Source Time Representation

Optional
Alternative
Condition
Fallback
Tentative
Unresolved
Recommendation / Suggestion
Commitment Level
Open Start
Cross-day Dependency

Reservation
Purchase
Ticket
Pass
Resource
Activation
Validity
Resource Coverage
Resource Return Prerequisite
Resource Cost Model

Note
Personal Note
Recommendation
Reference
Research
Runtime Instruction
Operational Procedure
Background
Map
Photo Spot
Opening Hours
Reference Freshness
Embedded Timetable / Route Reference

Preparation
Packing
Shopping
Budget
Expense
Event Cost Annotation

Derived Value
Formula
Counterfactual Scenario
Comparison Option

Explicit Intra-source Reference
Procedure Prerequisite
Runtime-deferred Decision
Option-specific Downstream Action
Activity Internal Schedule
Booking Release Rule

Source Asset Reference
Missing Source Asset
Source Provenance
Confidence
Review State
```

---

### 6.1 Cross-format Synthesis — Source Heterogeneity Is Primarily an Extraction Problem

26 組 sample 顯示，不同 source format 的最大差異首先出現在：

> **如何可靠取得內容與結構訊號。**

例如：

```text
Markdown
→ heading / table / sequence / link / source order

Spreadsheet
→ row / column / merged cell / blank cell / formula / formatting relation

PDF / Canva / Image
→ text block / coordinates / visual grouping / embedded diagram relation

Mind Map
→ node / parent / child / branch
```

這些 source-specific 訊號不能在 extraction 一開始就被壓成純文字，因為 layout / hierarchy / relation 本身可能承載旅行語意。

但在進入 semantic understanding 後，各格式反覆收斂到相近的旅行概念，例如：

```text
Day
Event / Activity
Time
Place
Free Time
Optional
Alternative
Reservation
Resource
Reference
Deadline
...
```

因此目前 research 支持一個新的架構 synthesis：

> **Source format 應主要影響 extraction / reconstruction strategy，而不是 Result UI family。**

也就是：

```text
Different Sources
↓
Different Source Adapters
↓
Unified semantic understanding
↓
CanonicalTrip
↓
Same Result UI system
```

這不是新的 Canonical semantic，也不是要在本文件定義 Renderer spec；它只是 26 份 source evidence 對 architecture boundary 的共同指向。

對新格式的第一個問題應是：

> **這個 source 有哪些內容與結構訊號必須保留，才能不扭曲使用者原意？**

而不是：

> **這個格式要不要做一套新的旅行頁面？**

---

## 7. What This Research Has Changed

一開始問題像：

> 如何把旅行文件 parse 成 JSON？

目前更準確：

> **如何從高度異質、混有 planning、research、reference、uncertainty、branch 與 personal shorthand 的旅行文件中，保守辨認使用者真正的旅行意圖，再轉成不扭曲原意的 Canonical Trip Data？**

這也意味著：

> 不應先用 Golden Input #001 的 Markdown 形狀把 schema 定死。

目前新增的一個重要判斷是：

> **Information density 與 itinerary commitment 是兩個獨立維度。**


#21 / #22 又新增一個重要區分：

> **Itinerary Data 與 Runtime-useful Data 也不是同一集合。**

某些資料不是 Event，卻可能在旅途中非常重要，例如：

- 轉乘步驟
- 售票機操作
- 現場抽號碼規則
- App 使用流程

因此：

> Non-itinerary 不應自動等於 Ignore。


Sample #23 再補上一個 extraction 層的重要提醒：

> **Source format 的語法結構，不等於旅行語意本身。**

即使是我們目前 V0 優先支援的 Markdown，也不能只做：

```text
Markdown AST
→ deterministic field mapping
```

仍需要 semantic interpretation。

另外，近期新 sample 開始比較常新增：

- relation 細節
- certainty 細節
- context inheritance
- decision dependency

而不是每次都冒出全新的 semantic unit。

這可能是逐漸接近 semantic saturation 的訊號，但目前仍不足以宣告 saturation。

---

## 8. Semantic Saturation Tracking

每拿到一份新 sample，只記五件事：

```text
1. Source type / archetype
2. Existing cases
3. New semantic cases
4. Ambiguous / conflict cases
5. Non-itinerary content
```

### 接近 saturation 的訊號

連續多份開始只出現：

- 既有 semantic
- 既有 relation 的變體
- 沒有新的核心資料類型

才開始進：

```text
Observed Semantics
→ Canonical Model
→ Parser Strategy
→ Validation Rules
→ Review UX
```

---

## 9. 目前仍未證明

這些是 research hypothesis，不是事實：

- 26 份是否已足夠代表市場
- layout-aware extraction 是否值得成本
- mind map 是否值得 MVP support
- participant-aware model 是否要第一版就做
- budget / packing 是否應完全忽略或保留為 reference
- semantic model 能否在不爆炸的情況下維持簡潔
- Review 能否把 parser uncertainty 轉成 trust，而不是 friction

---

## 10. Semantic Decision Layer

從 22 份 sample 開始，不再採：

> 「看到新 semantic → Canonical 一定完整建模」

而是每個 semantic 進入三層之一：

```text
Core
Preserve
Defer
```

---

### 10.1 Core — V0 必須理解

如果忽略，會直接破壞 itinerary 或 runtime 行為。

目前候選：

- Trip
- Trip Phase / City Segment
- Day
- Day Ordinal / Absolute Date
- Source Day
- Event / Activity
- Flight
- Hotel / Accommodation
- Transport
- Place / Area
- Unresolved / address-first Place
- Exact / Approximate / Daypart / No-time / Open-ended time
- Cross-midnight
- Free Time / Flexible
- Optional
- Alternative
- Conditional / Fallback
- Tentative
- Reservation / Ticket status
- Transit duration
- Deadline / arrival buffer
- User-provided Leave-by constraint
- Unresolved place / unresolved meal
- Day accommodation
- Source traceability
- Confidence / Review
- Basic participant subgroup
- Overview / Detail reconciliation

判斷標準：

> 不建模它，是否會讓 Result Web 扭曲使用者原本的旅行？

---

### 10.2 Preserve — 要看懂，但 V0 不完整產品化

如果誤 event 化會出錯，但目前不需要建立專屬功能。

目前候選：

- Recommendation
- Research note
- Reference timetable
- Opening hours reference
- Place database
- Packing
- Shopping
- Budget / Expense
- Event cost annotation
- Preparation
- Runtime instruction
- Operational procedure
- Digital workflow
- Reference freshness
- Runtime-deferred decision
- Explicit intra-source reference
- Pass / resource cost modeling
- Formula / derived values
- Counterfactual comparison
- Photo spot / visual reference
- Missing / unavailable source asset reference
- Activity internal timetable
- Booking release rule

V0 可：

```text
classify
→ preserve
→ retain source trace
→ optionally expose as reference
```

不用立刻為每個 case 建專屬 schema / UI。

---

### 10.3 Defer — 明確不進 V0

目前：

- Expense accounting engine
- Formula / PASS economics engine
- Packing UI
- Shopping UI
- Recommendation engine
- General research knowledge base UI
- Digital procedure state machine
- Full conditional workflow engine
- Arbitrary note freshness verification
- Complex participant lifecycle / collaboration
- Google My Maps importer
- KML / KMZ support
- Generic workflow automation

Defer 不代表永遠不做。

只是：

> 現在不讓長尾 semantic 主導 V0 架構。

---

### 10.4 Decision Test

之後每出現新 semantic，問四個問題：

| Question | Meaning |
|---|---|
| Frequency | 在多少 sample 重複出現？ |
| Runtime impact | 是否影響 NOW / NEXT / Leave-by / Directions / Reservation？ |
| Loss if ignored | 不建模會不會扭曲原意？ |
| Complexity | 完整支援的模型 / UI 成本多高？ |

最重要的產品問題：

> **如果不支援這個 semantic，使用者旅行途中是否會被迫回去打開原始文件？**

---

### 10.5 Current Working Rule

```text
High runtime impact + high semantic loss
→ Core

Low/medium runtime impact + meaningful source intent
→ Preserve

Low runtime impact + high implementation complexity
→ Defer
```

這是目前從 Research 進入 Product Modeling 的正式切換點。

---

## 11. Current Saturation Status

目前：

```text
Formal samples: 26
Semantic saturation: approaching, not declared
```

與早期常出現全新 source archetype 或 semantic unit 相比，近期樣本主要補強 relationship、certainty、context dependency 與 supporting-data role：

- #19–#20：derived / counterfactual data、multi-day resource economics、source day 與 calendar date 的差異。
- #21–#22：runtime instruction、reference freshness、explicit reference、runtime-deferred decision。
- #23：Markdown 語法與旅行語意的邊界、mixed time、partially structured entity、address-first place、missing asset 與 inline sequence；並成為第一份外部 Markdown E2E benchmark。
- #24：parent activity / internal timetable、booking release rule、open-ended time 與 structured ticket / pass metadata。其中 open-ended time 提升為 Core，其餘多數維持 Preserve。
- #25：PDF execution reference、resource return prerequisite、sequence ordinal、candidate transport schedule 與 hard deadline。
- #26：整趟交通方案 alternative 共享一個 itinerary backbone、Day-specific baseline exception、availability verification 與 conditional group-tour fallback；只強化既有 semantic，沒有新增 Core 類型。

目前 evidence 指向：

> 核心 semantic 類型正在穩定，但 relationship model 與 supporting-data roles 尚未完全飽和。

因此仍不正式 freeze Canonical Model。#26 只強化既有 semantic；若 #27 也沒有新增 Core 類型，應評估宣告 `saturation sufficient`，停止頻繁擴張 inventory。現階段繼續收樣，並同步維護 Sample × Semantic Matrix。

---

## 12. Research Rule

> **不要因為 source 裡出現一種資料，就立刻把它變成產品 feature。**

從現在開始，Input Research 每次更新除了記 New Semantic，也要同步更新：

```text
Semantic
→ Core / Preserve / Defer
```

這讓研究文件不只累積案例，也能成為 V0 Model 的決策 evidence。

若新 sample 屬於目前 MVP 優先 source：

```text
Markdown
```

應同時判斷它是否能成為：

> **External Parser Benchmark**

讓 sample collection 開始直接反哺 E2E validation，而不是等研究完全停止後才開始測 parser。

例如看到：

- Packing
- Expense
- Shopping
- Recommendation

只代表：

> Parser / extractor 要知道它是什麼。

不代表：

> Trip Runtime 現在要做 Packing / Expense / Shopping UI。

同理，看到新的 source format 只代表：

> 需要評估新的 extraction / reconstruction strategy。

不代表：

> 需要新增 source-specific Result UI。

目前 working rule：

```text
New source format
→ inspect content + structural signals
→ extend / add Source Adapter if justified
→ same semantic pipeline
→ same Canonical / Result UI system
```
