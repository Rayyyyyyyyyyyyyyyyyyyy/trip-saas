import { describe, expect, it } from "vitest";

describe("unit test harness", () => {
  it("runs pure JavaScript checks in Node", () => {
    expect(["source", "draft", "canonical"].at(-1)).toBe("canonical");
  });
});
