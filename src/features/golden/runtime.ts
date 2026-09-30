import { days, trip } from "../../tripData";
import type { GoldenDay, GoldenEvent } from "../../tripData";

export interface GoldenRuntime {
  date: string | null;
  minutes: number | null;
  phase: "before" | "during" | "after" | "unavailable";
}

export type GoldenTripStatus =
  | { kind: "unavailable" }
  | { kind: "completed" }
  | {
      kind: "countdown";
      daysToGo: number;
      nextEvent: { title: string; detail: string };
    };

export function getTokyoRuntime(now: Date = new Date()): GoldenRuntime {
  try {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
      return { date: null, minutes: null, phase: "unavailable" };
    }
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(now)
        .filter((part) => part.type !== "literal")
        .map((part) => [part.type, part.value]),
    );
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const minutes = Number(parts.hour) * 60 + Number(parts.minute);
    const phase =
      date < days[0]!.date
        ? "before"
        : date > days.at(-1)!.date
          ? "after"
          : "during";

    return { date, minutes, phase };
  } catch {
    return { date: null, minutes: null, phase: "unavailable" };
  }
}

export function getGoldenTripStatus(runtime: GoldenRuntime): GoldenTripStatus {
  if (runtime.phase === "unavailable") return { kind: "unavailable" };
  if (runtime.phase === "after") return { kind: "completed" };

  const start = new Date(`${days[0]!.date}T00:00:00+09:00`);
  const today = new Date(`${runtime.date}T00:00:00+09:00`);
  const nextFlight = trip.flights[0]!;

  return {
    kind: "countdown",
    daysToGo: Math.max(
      0,
      Math.ceil((start.getTime() - today.getTime()) / 86400000),
    ),
    nextEvent: {
      title: `${nextFlight.code} · ${nextFlight.date}`,
      detail: nextFlight.route,
    },
  };
}

export function getGoldenTodayState(
  day: GoldenDay,
  runtime: GoldenRuntime,
): {
  supported: boolean;
  current: GoldenEvent | null | undefined;
  next: GoldenEvent | null | undefined;
} {
  if (day.date !== "2026-09-12") {
    return { supported: false, current: null, next: null };
  }

  const titledEvents = day.events.filter((event) => event.title);
  const minutes = runtime.minutes ?? 0;
  if (minutes < 10 * 60 + 30) {
    return { supported: true, current: null, next: titledEvents[0] };
  }
  if (minutes < 19 * 60 + 30) {
    return {
      supported: true,
      current: titledEvents[1],
      next: titledEvents[2],
    };
  }

  return { supported: true, current: titledEvents[2], next: null };
}
