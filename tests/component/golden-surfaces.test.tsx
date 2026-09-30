import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GoldenEventCard } from "../../src/features/golden/GoldenEventCard";
import { GoldenReservations } from "../../src/features/golden/GoldenReservations";

describe("Golden newspaper surfaces", () => {
  it("presents checklist readiness as editorial rows while keeping reservation state synchronized", async () => {
    localStorage.clear();
    const user = userEvent.setup();
    render(<GoldenReservations />);

    const checklist = screen.getByRole("region", { name: "出發前準備" });
    expect(checklist).toHaveClass("border-t", "border-trip-hairline");

    const usj = screen.getByRole("checkbox", {
      name: "USJ 門票／事前票券",
    });
    expect(usj).not.toBeChecked();
    expect(screen.getByText("Action needed", { exact: true })).toBeVisible();

    await user.click(usj);
    expect(usj).toBeChecked();
    expect(screen.getByText("Ticket ready", { exact: true })).toBeVisible();
  });

  it("keeps exact Golden external actions safe on the editorial event surface", () => {
    render(
      <GoldenEventCard
        event={{
          map: "https://example.com/exact-map",
          tabelog: "https://tabelog.com/exact-record/",
          time: "19:30",
          title: "Exact dinner",
          type: "restaurant",
        }}
      />,
    );

    const article = screen.getByRole("article");
    expect(article).toHaveClass("border-l-4");
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });
});
