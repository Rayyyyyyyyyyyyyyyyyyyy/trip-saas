import { useMemo } from "react";
import { CssBaseline } from "@mui/material";
import { StyledEngineProvider, ThemeProvider } from "@mui/material/styles";

import type { CanonicalTrip } from "../domain/trip/types";
import { GOLDEN_CHECKLIST_STORAGE_KEY } from "../features/golden/checklist";
import { GoldenViewer } from "../features/golden/GoldenViewer";
import { createTripPresentation } from "../features/result/createTripPresentation";
import { ResultViewer } from "../features/result/ResultViewer";
import { goldenOsakaCanonicalTrip } from "../fixtures/golden/osakaCanonicalTrip";
import { createGeminiTripParser } from "../integrations/gemini/geminiTripParser";
import { createChecklistRepository } from "../persistence/checklistRepository";
import { createConfirmedTripRepository } from "../persistence/confirmedTripRepository";
import { createGeminiCredentialRepository } from "../persistence/geminiCredentialRepository";
import { createLocalDataOperations } from "../persistence/localDataOperations";
import { TripRuntimeStartup } from "./TripRuntimeStartup";
import { tripTheme } from "./tripTheme";

const confirmedTripRepository = createConfirmedTripRepository();
const credentialRepository = createGeminiCredentialRepository();
const checklistRepository = createChecklistRepository(localStorage, {
  compatibilityKeysByTripId: {
    [goldenOsakaCanonicalTrip.id]: [GOLDEN_CHECKLIST_STORAGE_KEY],
  },
});
const localDataOperations = createLocalDataOperations({
  checklistRepository,
  confirmedTripRepository,
  geminiCredentialRepository: credentialRepository,
});

function ConfirmedTripEntry({
  activeTrip,
  onShowHome,
  sample,
}: {
  activeTrip: CanonicalTrip;
  onShowHome: () => void;
  sample: boolean;
}) {
  if (sample) {
    return <GoldenViewer onShowHome={onShowHome} />;
  }

  return (
    <ResultViewer
      onShowHome={onShowHome}
      presentation={createTripPresentation(activeTrip)}
    />
  );
}

export function TripRuntimeApp() {
  const configuredGeminiModel = import.meta.env.VITE_GEMINI_MODEL?.trim();
  const parseTrip = useMemo(
    () =>
      configuredGeminiModel
        ? createGeminiTripParser({ model: configuredGeminiModel })
        : undefined,
    [configuredGeminiModel],
  );

  return (
    <StyledEngineProvider enableCssLayer injectFirst>
      <ThemeProvider theme={tripTheme}>
        <CssBaseline />
        <TripRuntimeStartup
          credentialRepository={credentialRepository}
          localDataOperations={localDataOperations}
          parseTrip={parseTrip}
          repository={confirmedTripRepository}
          sampleTrip={goldenOsakaCanonicalTrip}
          renderViewer={(activeTrip, controls) => (
            <ConfirmedTripEntry
              activeTrip={activeTrip}
              onShowHome={controls.onShowHome}
              sample={controls.sample}
            />
          )}
        />
      </ThemeProvider>
    </StyledEngineProvider>
  );
}
