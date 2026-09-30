import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateCanonicalTripSchema } from "../../src/domain/trip/schemaValidators";
import { validateCanonicalTripAuthoritatively } from "../../src/domain/trip/buildCanonicalTrip";
import { goldenOsakaCanonicalTrip } from "../../src/fixtures/golden/osakaCanonicalTrip";
import { days, initialTodos, reservations, trip } from "../../src/tripData";

describe("Golden Osaka CanonicalTrip fixture", () => {
  it("is schema-valid and keeps tripData.ts as the itinerary reference", () => {
    expect(validateCanonicalTripSchema(goldenOsakaCanonicalTrip)).toEqual({
      valid: true,
      errors: [],
    });
    expect(
      validateCanonicalTripAuthoritatively(goldenOsakaCanonicalTrip),
    ).toEqual({
      valid: true,
      findings: [],
      schemaErrors: [],
    });
    expect(goldenOsakaCanonicalTrip.title).toBe(trip.title);
    expect(goldenOsakaCanonicalTrip.days.map((day) => day.date)).toEqual(
      days.map((day) => day.date),
    );
  });

  it("preserves every day event and optional place title", () => {
    const expectedTitles = days.flatMap((day) => [
      ...day.events.map((event) => event.title ?? event.transit),
      ...(day.optional ?? []).map((place) => place.name),
    ]);

    expect(
      goldenOsakaCanonicalTrip.entities.map((entity) => entity.title),
    ).toEqual(expectedTitles);
  });

  it("preserves stable checklist/reservation identities", () => {
    const canonicalTodoIds = new Set(
      goldenOsakaCanonicalTrip.entities.flatMap((entity) =>
        [
          entity.reservation?.todo_id,
          entity.ticket?.todo_id,
          entity.readiness?.todo_id,
        ].filter(Boolean),
      ),
    );

    expect(canonicalTodoIds).toEqual(
      new Set(initialTodos.map((todo) => todo.id)),
    );
    expect(canonicalTodoIds).toEqual(
      new Set(reservations.map((reservation) => reservation.todoId)),
    );
  });

  it("does not persist Golden runtime or presentation-only fields", () => {
    const serialized = JSON.stringify(goldenOsakaCanonicalTrip);

    expect(serialized).not.toContain('"runtime"');
    expect(serialized).not.toContain('"special"');
    expect(serialized).not.toContain('"dow"');
  });

  it("preserves every source-provided external URL byte for byte", () => {
    const canonicalItinerary = readFileSync(
      new URL("../../temp/Odata/00 我/我的最初行程表.md", import.meta.url),
      "utf8",
    );
    const mapReference = readFileSync(
      new URL("../../temp/trip_places_google_maps.md", import.meta.url),
      "utf8",
    );
    const documentedUrls = new Set(
      [
        ...canonicalItinerary.matchAll(/https:\/\/[^)\s]+/g),
        ...mapReference.matchAll(/https:\/\/[^)\s]+/g),
      ].map((match) => match[0]),
    );
    const canonicalMapUrls = new Set(
      goldenOsakaCanonicalTrip.entities.flatMap((entity) =>
        entity.actions
          .filter((action) => action.kind === "map")
          .map((action) => action.url),
      ),
    );
    const legacyExactUrls = new Set(
      days.flatMap((day) => [
        ...day.events.flatMap((event) =>
          [event.map, event.tabelog].filter((url): url is string =>
            Boolean(url?.startsWith("https://")),
          ),
        ),
        ...(day.optional ?? []).map((place) => place.map),
      ]),
    );
    const canonicalActionUrls = new Set(
      goldenOsakaCanonicalTrip.entities.flatMap((entity) =>
        entity.actions.map((action) => action.url),
      ),
    );

    expect([...canonicalMapUrls].every((url) => documentedUrls.has(url))).toBe(
      true,
    );
    expect(
      [...legacyExactUrls].every((url) => canonicalActionUrls.has(url)),
    ).toBe(true);
  });
});
