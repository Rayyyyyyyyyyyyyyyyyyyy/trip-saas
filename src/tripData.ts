export interface GoldenFlight {
  code: string;
  date: string;
  route: string;
}

export interface GoldenEvent {
  time?: string;
  type?: string;
  title?: string;
  meta?: string;
  status?: string;
  flexible?: boolean;
  map?: string;
  tabelog?: string;
  note?: string;
  runtime?: "now" | "next";
  transit?: string;
  tip?: string;
}

export interface GoldenPlace {
  name: string;
  map: string;
}

export interface GoldenDay {
  date: string;
  n: string;
  dow: string;
  label: string;
  title: string;
  subtitle: string;
  leaveBy?: string;
  special?: boolean;
  events: GoldenEvent[];
  optional?: GoldenPlace[];
}

export interface GoldenTodo {
  id: string;
  label: string;
  done: boolean;
}

export interface GoldenReservation {
  date: string;
  type: string;
  title: string;
  todoId: string;
  completeStatus: string;
  pendingStatus?: string;
}

export const trip: {
  title: string;
  period: string;
  hotel: string;
  flights: GoldenFlight[];
} = {
  title: "關西",
  period: "SEP 10 — SEP 15",
  hotel: "Aloft Osaka Dojima",
  flights: [
    { code: "JX822", date: "SEP 10", route: "TPE 10:15 → KIX 14:00" },
    { code: "JX821", date: "SEP 15", route: "KIX 13:25 → TPE 15:20" },
  ],
};

const placeMaps = {
  ujiRiver:
    "https://www.google.com/maps/search/?api=1&query=%E5%AE%87%E6%B2%BB%E5%B7%9D%20%E4%BA%AC%E9%83%BD",
  ujiIsland:
    "https://www.google.com/maps/search/?api=1&query=%E5%AE%87%E6%B2%BB%E5%85%AC%E5%9C%92%20%E4%B8%AD%E3%81%AE%E5%B3%B6",
  asagiri:
    "https://www.google.com/maps/search/?api=1&query=%E6%9C%9D%E9%9C%A7%E9%80%9A%20%E5%AE%87%E6%B2%BB",
  ujigami:
    "https://www.google.com/maps/search/?api=1&query=%E5%AE%87%E6%B2%BB%E4%B8%8A%E7%A5%9E%E7%A4%BE",
  byodoin:
    "https://www.google.com/maps/search/?api=1&query=%E5%B9%B3%E7%AD%89%E9%99%A2%20%E5%AE%87%E6%B2%BB",
  consola:
    "https://www.google.com/maps/search/?api=1&query=%E5%96%AB%E8%8C%B6%20%E3%82%B3%E3%83%B3%E3%82%BD%E3%83%A9%20%E5%AE%87%E6%B2%BB",
  toei: "https://www.google.com/maps/search/?api=1&query=%E6%9D%B1%E6%98%A0%E5%A4%AA%E7%A7%A6%E6%98%A0%E7%94%BB%E6%9D%91%20%E4%BA%AC%E9%83%BD",
};

export const days: GoldenDay[] = [
  {
    date: "2026-09-10",
    n: "10",
    dow: "THU",
    label: "大阪",
    title: "抵達大阪",
    subtitle: "今天的任務只有順利抵達",
    events: [
      {
        time: "10:15",
        type: "flight",
        title: "JX822 桃園起飛",
        meta: "TPE T1 → KIX T1 · 14:00 抵達",
        status: "FLIGHT",
      },
      {
        time: "16:30",
        type: "hotel",
        title: "Aloft Osaka Dojima",
        meta: "Check-in · 堂島／北新地",
        map: "Aloft Osaka Dojima Osaka",
      },
      {
        time: "午後",
        type: "work",
        title: "Remote",
        meta: "Flexible · 飯店工作",
        flexible: true,
      },
      {
        time: "晚上",
        type: "restaurant",
        title: "野口太郎ラーメン",
        meta: "貝出汁系 · 北新地 · ¥1,000–1,999",
        map: "野口太郎ラーメン 北新地本店",
        tabelog: "https://tabelog.com/osaka/A2701/A270101/27129462/",
      },
    ],
  },
  {
    date: "2026-09-11",
    n: "11",
    dow: "FRI",
    label: "藝術",
    title: "森之宮",
    subtitle: "Remote＋空間美術館",
    events: [
      {
        time: "白天",
        type: "work",
        title: "Remote",
        meta: "Flexible · 飯店工作",
        flexible: true,
      },
      { transit: "Osaka → 森之宮" },
      {
        time: "預約",
        type: "activity",
        title: "Museum of Spatial Art OSAKA",
        meta: "千田泰廣 Yasuhiro Chida · 森之宮",
        status: "RESERVED",
        map: "Museum of Spatial Art OSAKA 森之宮",
      },
      { transit: "森之宮 → 梅田" },
      {
        time: "晚上",
        type: "restaurant",
        title: "回転すし さかえ",
        meta: "阪急東通り · 晚營業 · ¥1,000–1,999",
        map: "回転すし さかえ 阪急東通り店",
        tabelog: "https://tabelog.com/osaka/A2701/A270101/27002305/",
      },
    ],
  },
  {
    date: "2026-09-12",
    n: "12",
    dow: "SAT",
    label: "宇治",
    title: "宇治",
    subtitle: "什麼都不要做太多的一天",
    leaveBy: "17:50",
    events: [
      {
        time: "睡飽",
        type: "transport",
        title: "前往宇治",
        meta: "Osaka → Uji · 不趕時間",
      },
      {
        time: "午後",
        type: "free_time",
        title: "喫茶 コンソラ",
        meta: "宇治川 · Coffee · Free time",
        note: "今天就是來發呆，不設定離開時間。",
        flexible: true,
        runtime: "now",
        map: placeMaps.consola,
      },
      { transit: "約 58 min", tip: "建議 17:50 前離開宇治" },
      {
        time: "19:30",
        type: "restaurant",
        title: "清次郎 北新地店",
        meta: "Yakiniku · All-you-can-eat",
        status: "RESERVED",
        runtime: "next",
        map: "炭火焼肉 清次郎 北新地店",
        tabelog: "https://tabelog.com/osaka/A2701/A270101/27017667/",
      },
    ],
    optional: [
      { name: "宇治川", map: placeMaps.ujiRiver },
      { name: "宇治中之島", map: placeMaps.ujiIsland },
      { name: "朝霧通", map: placeMaps.asagiri },
      { name: "宇治上神社", map: placeMaps.ujigami },
      { name: "平等院", map: placeMaps.byodoin },
    ],
  },
  {
    date: "2026-09-13",
    n: "13",
    dow: "SUN",
    label: "太秦",
    title: "東映太秦映画村",
    subtitle: "怪々YOKAI祭・百鬼夜行",
    events: [
      {
        time: "睡飽",
        type: "transport",
        title: "前往太秦",
        meta: "Osaka → Uzumasa · 不用太早出門",
      },
      {
        time: "午後",
        type: "free_time",
        title: "東映太秦映画村",
        meta: "怪々YOKAI祭 · 園區自由活動",
        flexible: true,
        runtime: "now",
        map: placeMaps.toei,
      },
      {
        time: "16:30",
        type: "activity",
        title: "東映太秦映画村 導覽",
        meta: "已預約",
        status: "RESERVED",
        runtime: "next",
        map: placeMaps.toei,
      },
      {
        time: "17:30",
        type: "activity",
        title: "百鬼夜行",
        meta: "怪々YOKAI祭",
        map: placeMaps.toei,
      },
      {
        time: "19:30",
        type: "activity",
        title: "うずまさ百鬼夜行",
        meta: "Night show",
        note: "隔天還有 USJ，看完就回大阪。",
        map: placeMaps.toei,
      },
    ],
  },
  {
    date: "2026-09-14",
    n: "14",
    dow: "MON",
    label: "USJ",
    title: "Universal Studios Japan",
    subtitle: "今天沒有其他行程",
    special: true,
    events: [
      {
        time: "ALL DAY",
        type: "activity",
        title: "Universal Studios Japan",
        meta: "Halloween · 園區內自由活動",
        status: "TICKET READY",
        map: "Universal Studios Japan",
      },
    ],
  },
  {
    date: "2026-09-15",
    n: "15",
    dow: "TUE",
    label: "回家",
    title: "回家",
    subtitle: "不要對大阪產生任何觀光野心",
    events: [
      {
        time: "10:00",
        type: "transport",
        title: "離開大阪市區",
        meta: "Check-out · 直接前往關西機場",
      },
      { transit: "Osaka → KIX T1" },
      {
        time: "13:25",
        type: "flight",
        title: "JX821 關西起飛",
        meta: "KIX T1 → TPE T1 · 15:20 抵達",
        status: "FLIGHT",
      },
    ],
  },
];

export const reservations: GoldenReservation[] = [
  {
    date: "SEP 11",
    type: "activity",
    title: "Museum of Spatial Art",
    todoId: "museum",
    completeStatus: "Reserved",
  },
  {
    date: "SEP 12 · 19:30",
    type: "restaurant",
    title: "清次郎 北新地店",
    todoId: "seijiro",
    completeStatus: "Reserved",
  },
  {
    date: "SEP 13 · 16:30",
    type: "activity",
    title: "東映太秦映画村 導覽",
    todoId: "toei-tour",
    completeStatus: "Reserved",
  },
  {
    date: "SEP 14",
    type: "activity",
    title: "Universal Studios Japan",
    todoId: "usj-ticket",
    completeStatus: "Ticket ready",
  },
  {
    date: "SEP 10—15",
    type: "hotel",
    title: "Aloft Osaka Dojima",
    todoId: "hotel",
    completeStatus: "Confirmed",
  },
  {
    date: "SEP 10 / 15",
    type: "flight",
    title: "JX822 · JX821",
    todoId: "flights",
    completeStatus: "Confirmed",
  },
];

export const initialTodos: GoldenTodo[] = [
  { id: "hotel", label: "住宿：Aloft Osaka Dojima", done: true },
  { id: "museum", label: "9/11 森之宮空間美術館", done: true },
  { id: "seijiro", label: "9/12 19:30 清次郎燒肉", done: true },
  { id: "toei-tour", label: "9/13 16:30 東映太秦映画村導覽", done: true },
  { id: "usj-ticket", label: "USJ 門票／事前票券", done: false },
  { id: "flights", label: "機票：JX822 / JX821", done: true },
];
