import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createTripTheme,
  tripTypography,
  tripVisualTokens,
} from "../../src/app/tripTheme";

describe("September 2026 newspaper visual contract", () => {
  it("exports the frozen light-paper roles without a dark token branch", () => {
    expect(tripVisualTokens).toEqual({
      paper: "#ffffff",
      sunk: "#f5f4f1",
      ink: "#121212",
      muted: "#5a5a5a",
      faint: "#8c8c8c",
      hairline: "rgba(0,0,0,.17)",
      anchor: "#b8491f",
      ready: "#0d6f63",
      alternative: "#b03f4a",
      attention: "#7d6a10",
      movement: "#1a3a4a",
    });
    expect("dark" in tripVisualTokens).toBe(false);
  });

  it("projects the editorial typography and rectangular control defaults into MUI", () => {
    const theme = createTripTheme();

    expect(theme.palette).toMatchObject({
      mode: "light",
      background: {
        default: tripVisualTokens.paper,
        paper: tripVisualTokens.paper,
      },
      text: {
        primary: tripVisualTokens.ink,
        secondary: tripVisualTokens.muted,
      },
      divider: tripVisualTokens.hairline,
    });
    expect(theme.shape.borderRadius).toBe(0);
    expect(theme.typography.fontFamily).toBe(tripTypography.editorial);
    expect(theme.typography.button?.fontFamily).toBe(tripTypography.utility);
    expect(theme.components?.MuiButton?.styleOverrides?.root).toMatchObject({
      minHeight: 44,
      borderRadius: 0,
      textTransform: "none",
    });
    expect(
      theme.components?.MuiOutlinedInput?.styleOverrides?.root,
    ).toMatchObject({ borderRadius: 0 });
  });

  it("maps canonical Tailwind roles and local font packages without a remote import", () => {
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");

    for (const role of [
      "trip-paper",
      "trip-sunk",
      "trip-ink",
      "trip-muted",
      "trip-faint",
      "trip-hairline",
      "trip-anchor",
      "trip-ready",
      "trip-alternative",
      "trip-attention",
      "trip-movement",
    ]) {
      expect(css).toContain(`--color-${role}:`);
    }
    expect(css).toContain('--font-editorial: "Noto Serif TC"');
    expect(css).toMatch(/--font-utility:\s*"Noto Sans TC"/);
    expect(css).toContain("--font-source: ui-monospace");
    expect(css).not.toMatch(/https:\/\/fonts\.(googleapis|gstatic)\.com/);
  });
});
