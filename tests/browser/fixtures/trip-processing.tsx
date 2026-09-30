import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@mui/material";
import { TripRuntimeStartup } from "../../../src/app/TripRuntimeStartup";
import { tripTheme } from "../../../src/app/tripTheme";
import type { TripIntakeOptions } from "../../../src/app/useTripIntakeWorkflow";
import type { ProcessingStage } from "../../../src/app/tripProcessingRun";
import { extractMarkdownSource } from "../../../src/features/import/markdownSourceAdapter";
import type { ParseTrip } from "../../../src/app/parseTrip";
import type { GeminiCredentialRepository } from "../../../src/persistence/geminiCredentialRepository";
import {
  validCanonicalTrip,
  validDraftInterpretationResult,
  validTextSourceInput,
} from "../../fixtures/contracts/validContracts";
import "../../../src/index.css";
const stage = new URLSearchParams(location.search).get("stage") as
  ProcessingStage | "invalid_document" | "provider_timeout";
let finish: (() => void) | undefined;
const pending = () => new Promise<never>(() => {});
const late = new Promise<typeof validDraftInterpretationResult>((resolve) => {
  finish = () => resolve(validDraftInterpretationResult);
});
let providerCalls = 0;
Object.assign(window, {
  finishProcessingTest: () => finish?.(),
  processingProviderCalls: () => providerCalls,
});
const parseTrip: ParseTrip = async (request) => {
  providerCalls += 1;
  if (stage === "provider_timeout")
    throw Object.assign(new Error("raw transport diagnostic"), {
      code: "provider_timeout",
    });
  if (stage === "validating_draft") request.onStage?.("output_validation");
  return late;
};
const processing: TripIntakeOptions = {
  deadlines: { overallMs: 20_000, stageMs: { [stage]: 5_000 } },
  read:
    stage === "reading" ? pending : () => structuredClone(validTextSourceInput),
  extract:
    stage === "extracting"
      ? pending
      : stage === "invalid_document"
        ? (input) => ({ ...extractMarkdownSource(input), unknown_member: true })
        : undefined,
  validate: stage === "validating_source" ? pending : undefined,
};
const credentialRepository = {
  load: async () => ({ status: "ready", credential: "test-key" }),
  clear: async () => {},
  save: async () => {},
  probePersistence: async () => ({ supported: true }),
} as unknown as GeminiCredentialRepository;
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={tripTheme}>
    <TripRuntimeStartup
      credentialRepository={
        stage === "loading_credential"
          ? { ...credentialRepository, load: pending }
          : credentialRepository
      }
      repository={{
        clear: async () => {},
        loadActive: async () => ({ status: "ready", trip: validCanonicalTrip }),
        replaceActive: async () => {
          throw new Error("Unexpected persistence");
        },
      }}
      localDataOperations={
        {
          clearAllLocalData: async () => {},
          clearTripData: async () => {},
          clearCredential: async () => {},
        } as never
      }
      sampleTrip={validCanonicalTrip}
      parseTrip={parseTrip}
      processing={processing}
      renderViewer={(trip, controls) => (
        <main>
          <h1>{trip.title}</h1>
          <button onClick={controls.onShowHome}>測試首頁</button>
        </main>
      )}
    />
  </ThemeProvider>,
);
