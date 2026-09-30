import { Button } from "@mui/material";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

describe("component test harness", () => {
  it("renders and operates an accessible MUI control", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Open trip</Button>);
    await user.click(screen.getByRole("button", { name: "Open trip" }));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
