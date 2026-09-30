import { describe, expect, it } from "vitest";
import { days } from "../../src/tripData";
import {
  getGoldenTodayState,
  getGoldenTripStatus,
  getTokyoRuntime,
} from "../../src/features/golden/runtime";

describe("Golden Tokyo runtime", () => {
  it.each(days.map((day) => [day.date]))(
    "selects %s from real Japan time during the trip",
    (date) => {
      const runtime = getTokyoRuntime(new Date(`${date}T12:00:00+09:00`));

      expect(runtime).toMatchObject({ date, phase: "during", minutes: 720 });
    },
  );

  it("changes phase at Tokyo trip boundaries", () => {
    expect(
      getTokyoRuntime(new Date("2026-09-09T23:59:00+09:00")),
    ).toMatchObject({ date: "2026-09-09", phase: "before" });
    expect(
      getTokyoRuntime(new Date("2026-09-10T00:00:00+09:00")),
    ).toMatchObject({ date: "2026-09-10", phase: "during" });
    expect(
      getTokyoRuntime(new Date("2026-09-15T23:59:00+09:00")),
    ).toMatchObject({ date: "2026-09-15", phase: "during" });
    expect(
      getTokyoRuntime(new Date("2026-09-16T00:00:00+09:00")),
    ).toMatchObject({ date: "2026-09-16", phase: "after" });
  });

  it("shows the pre-trip countdown and first confirmed flight", () => {
    expect(
      getGoldenTripStatus({
        date: "2026-09-02",
        minutes: 9 * 60,
        phase: "before",
      }),
    ).toEqual({
      kind: "countdown",
      daysToGo: 8,
      nextEvent: {
        title: "JX822 · SEP 10",
        detail: "TPE 10:15 → KIX 14:00",
      },
    });
  });

  it("keeps post-trip status completed", () => {
    expect(
      getGoldenTripStatus({
        date: "2026-09-16",
        minutes: 0,
        phase: "after",
      }),
    ).toEqual({ kind: "completed" });
  });

  it("degrades safely when Japan time cannot be established", () => {
    const runtime = getTokyoRuntime(new Date("invalid"));

    expect(runtime).toEqual({
      date: null,
      minutes: null,
      phase: "unavailable",
    });
    expect(getGoldenTripStatus(runtime)).toEqual({ kind: "unavailable" });
  });
});

describe("Golden supported NOW/NEXT behavior", () => {
  const ujiDay = days.find((day) => day.date === "2026-09-12")!;

  it.each([
    ["before the supported window", 10 * 60 + 29, null, "前往宇治"],
    [
      "inside the supported window",
      10 * 60 + 30,
      "喫茶 コンソラ",
      "清次郎 北新地店",
    ],
    ["at the dinner anchor", 19 * 60 + 30, "清次郎 北新地店", null],
  ])("selects current and next %s", (_, minutes, currentTitle, nextTitle) => {
    const result = getGoldenTodayState(ujiDay, {
      date: ujiDay.date,
      minutes,
      phase: "during",
    });

    expect(result.supported).toBe(true);
    expect(result.current?.title ?? null).toBe(currentTitle);
    expect(result.next?.title ?? null).toBe(nextTitle);
  });

  it("does not infer NOW/NEXT on a day without enough precision", () => {
    const unsupportedDay = days.find((day) => day.date === "2026-09-13")!;

    expect(
      getGoldenTodayState(unsupportedDay, {
        date: unsupportedDay.date,
        minutes: 15 * 60,
        phase: "during",
      }),
    ).toEqual({ supported: false, current: null, next: null });
  });
});
