import { useEffect, useState } from "react";
import { ThemeProvider } from "@mui/material";
import { createRoot } from "react-dom/client";
import { tripTheme } from "../../../src/app/tripTheme";
import { assessTabularDateSupport } from "../../../src/domain/source/assessTabularDateSupport";
import { validateUnifiedSourceDocument } from "../../../src/domain/source/validateUnifiedSourceDocument";
import { createReviewEvidenceProjection } from "../../../src/domain/source/reviewEvidence";
import { deriveSupportingGroups } from "../../../src/domain/trip/deriveSupportingGroups";
import type { CanonicalTrip } from "../../../src/domain/trip/types";
import { ReviewScreen } from "../../../src/features/review/ReviewScreen";
import { applyConservativeReviewAdjustments } from "../../../src/features/review/reviewAdjustment";
import { confirmReviewedTrip } from "../../../src/features/review/confirmReviewedTrip";
import { createTripPresentation } from "../../../src/features/result/createTripPresentation";
import { ResultViewer } from "../../../src/features/result/ResultViewer";
import { createConfirmedTripRepository } from "../../../src/persistence/confirmedTripRepository";
import { validTabularSourceDocument } from "../../fixtures/contracts/sourceDocuments";
import { validDraftInterpretationResult } from "../../fixtures/contracts/validContracts";
import "../../../src/index.css";

const table = structuredClone(validTabularSourceDocument);
table.evidence_units[0]!.display_value = "8/16";
table.evidence_units[1]!.display_value = "18:30~ 散步";
const gate = validateUnifiedSourceDocument(table, {
  source_id: table.source_id,
});
if (!gate.valid) throw new Error("Invalid synthetic table");
const source = gate.document;
const interpretation = structuredClone(validDraftInterpretationResult);
interpretation.source_id = source.source_id;
const original = interpretation.draft!;
original.trip.title = "Synthetic spreadsheet";
original.trip.source_refs = [source.evidence_units[0]!.id];
original.trip.start_date = original.trip.end_date = "2025-08-16";
original.days[0]!.date = "2025-08-16";
original.days[0]!.label = null;
original.days[0]!.source_refs = [...original.trip.source_refs];
original.entities[0]!.title = "散步";
original.entities[0]!.raw_label = "18:30~ 散步";
original.entities[0]!.semantic_type = "activity";
original.entities[0]!.place = {
  name: null,
  address: null,
  raw_text: null,
  url: null,
  unresolved: false,
};
original.entities[0]!.time = {
  kind: "open_ended",
  start: "18:30",
  end: null,
  daypart: null,
  raw_text: "18:30~",
  crosses_midnight: false,
};
original.entities[0]!.source_refs = [source.evidence_units[1]!.id];
const dates = assessTabularDateSupport(original, source);
interpretation.findings = dates.findings;
const adjusted = applyConservativeReviewAdjustments(
  interpretation,
  dates.dateDecisions,
);
const candidate = deriveSupportingGroups(adjusted.candidate, source);
const evidence = createReviewEvidenceProjection(source);
const repository = createConfirmedTripRepository({
  databaseName: "synthetic-tabular-date-review",
});
Object.assign(window, { readTabularConfirmed: () => repository.loadActive() });

function Fixture() {
  const [draft, setDraft] = useState(() => structuredClone(candidate));
  const [trip, setTrip] = useState<CanonicalTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void repository.loadActive().then((result) => {
      if (result.status === "ready") setTrip(result.trip);
      setLoading(false);
    });
  }, []);
  if (loading) return <main>載入中</main>;
  if (trip)
    return (
      <ResultViewer
        presentation={createTripPresentation(trip)}
        onShowHome={() => undefined}
      />
    );
  return (
    <ReviewScreen
      adjustments={adjusted.adjustments}
      draft={draft}
      evidence={evidence}
      interpretation={interpretation}
      originalDraft={original}
      errorMessage={error}
      onDraftChange={setDraft}
      onCancel={() => undefined}
      onConfirm={() => {
        void confirmReviewedTrip(draft, repository, {
          sourceId: source.source_id,
        })
          .then(setTrip)
          .catch(() => setError("確認未完成"));
      }}
    />
  );
}
createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={tripTheme}>
    <Fixture />
  </ThemeProvider>,
);
