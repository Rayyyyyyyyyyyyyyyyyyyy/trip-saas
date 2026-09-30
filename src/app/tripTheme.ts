import { createTheme } from "@mui/material/styles";

export const tripVisualTokens = {
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
} as const;

export const tripTypography = {
  editorial: '"Noto Serif TC", Georgia, "Times New Roman", serif',
  utility:
    '"Noto Sans TC", ui-sans-serif, system-ui, -apple-system, sans-serif',
  source: 'ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
} as const;

const cssVariables = {
  "--trip-paper": tripVisualTokens.paper,
  "--trip-sunk": tripVisualTokens.sunk,
  "--trip-ink": tripVisualTokens.ink,
  "--trip-muted": tripVisualTokens.muted,
  "--trip-faint": tripVisualTokens.faint,
  "--trip-hairline": tripVisualTokens.hairline,
  "--trip-anchor": tripVisualTokens.anchor,
  "--trip-ready": tripVisualTokens.ready,
  "--trip-alternative": tripVisualTokens.alternative,
  "--trip-attention": tripVisualTokens.attention,
  "--trip-movement": tripVisualTokens.movement,
} as const;

export function createTripTheme() {
  return createTheme({
    palette: {
      mode: "light",
      background: {
        default: tripVisualTokens.paper,
        paper: tripVisualTokens.paper,
      },
      primary: {
        main: tripVisualTokens.ink,
        contrastText: tripVisualTokens.paper,
      },
      secondary: { main: tripVisualTokens.ready },
      text: {
        primary: tripVisualTokens.ink,
        secondary: tripVisualTokens.muted,
      },
      divider: tripVisualTokens.hairline,
      success: { main: tripVisualTokens.ready },
      warning: { main: tripVisualTokens.attention },
      error: { main: tripVisualTokens.alternative },
      info: { main: tripVisualTokens.movement },
    },
    shape: { borderRadius: 0 },
    typography: {
      fontFamily: tripTypography.editorial,
      h1: {
        fontFamily: tripTypography.editorial,
        fontWeight: 900,
        letterSpacing: "-.025em",
      },
      h2: {
        fontFamily: tripTypography.editorial,
        fontWeight: 900,
        letterSpacing: "-.018em",
      },
      h3: {
        fontFamily: tripTypography.editorial,
        fontWeight: 700,
        letterSpacing: "-.01em",
      },
      button: {
        fontFamily: tripTypography.utility,
        fontWeight: 700,
        textTransform: "none",
      },
      overline: {
        fontFamily: tripTypography.utility,
        fontWeight: 700,
        letterSpacing: ".16em",
      },
      caption: { fontFamily: tripTypography.utility },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ":root": cssVariables,
          "*:focus-visible": {
            outline: `2px solid ${tripVisualTokens.ink}`,
            outlineOffset: 3,
          },
          "::selection": {
            backgroundColor: tripVisualTokens.ink,
            color: tripVisualTokens.paper,
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0, square: true },
        styleOverrides: { root: { backgroundImage: "none" } },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 0,
            fontFamily: tripTypography.utility,
            fontWeight: 700,
            textTransform: "none",
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: { minWidth: 44, minHeight: 44, borderRadius: 0 },
        },
      },
      MuiListItemButton: {
        styleOverrides: { root: { minHeight: 44, borderRadius: 0 } },
      },
      MuiCheckbox: {
        styleOverrides: { root: { minWidth: 44, minHeight: 44 } },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            fontFamily: tripTypography.utility,
            fontWeight: 700,
            fontSize: 11,
          },
          clickable: { minHeight: 44 },
        },
      },
      MuiAccordion: {
        defaultProps: { elevation: 0, disableGutters: true, square: true },
        styleOverrides: {
          root: {
            borderBottom: `1px solid ${tripVisualTokens.hairline}`,
            backgroundColor: "transparent",
            "&::before": { display: "none" },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: { root: { minHeight: 44 } },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 0,
            border: `1px solid ${tripVisualTokens.hairline}`,
            borderLeftWidth: 4,
            backgroundColor: "transparent",
            fontFamily: tripTypography.editorial,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 0,
            border: `1px solid ${tripVisualTokens.hairline}`,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 0, fontFamily: tripTypography.utility },
        },
      },
      MuiInputLabel: {
        styleOverrides: { root: { fontFamily: tripTypography.utility } },
      },
      MuiFormControlLabel: {
        styleOverrides: { label: { fontFamily: tripTypography.utility } },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            minHeight: 44,
            borderRadius: 0,
            fontFamily: tripTypography.utility,
            textTransform: "none",
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { borderRadius: 0, fontFamily: tripTypography.utility },
        },
      },
    },
  });
}

export const tripTheme = createTripTheme();
