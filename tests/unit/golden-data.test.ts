import { describe, expect, it } from "vitest";
import { days, initialTodos, reservations } from "../../src/tripData";

const expectedMapUrls = [
  "https://www.google.com/maps/search/?api=1&query=%E5%AE%87%E6%B2%BB%E5%B7%9D%20%E4%BA%AC%E9%83%BD",
  "https://www.google.com/maps/search/?api=1&query=%E5%AE%87%E6%B2%BB%E5%85%AC%E5%9C%92%20%E4%B8%AD%E3%81%AE%E5%B3%B6",
  "https://www.google.com/maps/search/?api=1&query=%E6%9C%9D%E9%9C%A7%E9%80%9A%20%E5%AE%87%E6%B2%BB",
  "https://www.google.com/maps/search/?api=1&query=%E5%AE%87%E6%B2%BB%E4%B8%8A%E7%A5%9E%E7%A4%BE",
  "https://www.google.com/maps/search/?api=1&query=%E5%B9%B3%E7%AD%89%E9%99%A2%20%E5%AE%87%E6%B2%BB",
  "https://www.google.com/maps/search/?api=1&query=%E5%96%AB%E8%8C%B6%20%E3%82%B3%E3%83%B3%E3%82%BD%E3%83%A9%20%E5%AE%87%E6%B2%BB",
  "https://www.google.com/maps/search/?api=1&query=%E6%9D%B1%E6%98%A0%E5%A4%AA%E7%A7%A6%E6%98%A0%E7%94%BB%E6%9D%91%20%E4%BA%AC%E9%83%BD",
];

const expectedTabelogUrls = [
  "https://tabelog.com/osaka/A2701/A270101/27129462/",
  "https://tabelog.com/osaka/A2701/A270101/27002305/",
  "https://tabelog.com/osaka/A2701/A270101/27017667/",
];

function collectEventValues(key: "map" | "tabelog"): string[] {
  return days.flatMap((day) =>
    day.events
      .map((event) => event[key])
      .filter((value): value is string => Boolean(value)),
  );
}

describe("Golden source-backed data", () => {
  it("preserves exact checked-in Google Maps URLs", () => {
    const eventMaps = collectEventValues("map");
    const optionalMaps = days.flatMap((day) =>
      (day.optional ?? []).map((place) => place.map),
    );
    const exactMaps = [...new Set([...eventMaps, ...optionalMaps])]
      .filter((url) => url.startsWith("https://"))
      .sort();

    expect(exactMaps).toEqual(expectedMapUrls.sort());
  });

  it("preserves exact checked-in Tabelog URLs", () => {
    expect([...new Set(collectEventValues("tabelog"))].sort()).toEqual(
      expectedTabelogUrls.sort(),
    );
  });

  it("links every reservation to a stable checklist item", () => {
    const todoIds = new Set(initialTodos.map((todo) => todo.id));

    expect(
      reservations.every((reservation) => todoIds.has(reservation.todoId)),
    ).toBe(true);
  });

  it("keeps USJ tickets unconfirmed by default", () => {
    expect(initialTodos.find((todo) => todo.id === "usj-ticket")).toMatchObject(
      {
        done: false,
      },
    );
  });
});
