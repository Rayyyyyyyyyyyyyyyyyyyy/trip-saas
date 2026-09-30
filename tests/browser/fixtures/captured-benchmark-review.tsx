import { useEffect, useMemo, useState } from "react";
import { ThemeProvider } from "@mui/material";
import { createRoot } from "react-dom/client";

import capturedArtifact from "../../../temp/validation/external-markdown-001-integrated-prompt.json";
import sourceContent from "../../fixtures/benchmarks/external-markdown-001/source.md?raw";
import { tripTheme } from "../../../src/app/tripTheme";
import { validateInterpretationFidelity } from "../../../src/domain/source/validateInterpretationFidelity";
import { validateUnifiedSourceDocument } from "../../../src/domain/source/validateUnifiedSourceDocument";
import type {
  CanonicalTrip,
  ParsedTripDraft,
  SemanticInterpretationResult,
} from "../../../src/domain/trip/types";
import { ReviewScreen } from "../../../src/features/review/ReviewScreen";
import { confirmReviewedTrip } from "../../../src/features/review/confirmReviewedTrip";
import { createReviewEvidenceProjection } from "../../../src/domain/source/reviewEvidence";
import { extractMarkdownSource } from "../../../src/features/import/markdownSourceAdapter";
import { createTripPresentation } from "../../../src/features/result/createTripPresentation";
import { ResultViewer } from "../../../src/features/result/ResultViewer";
import { createConfirmedTripRepository } from "../../../src/persistence/confirmedTripRepository";
import "../../../src/index.css";

type CapturedArtifact = {
  runs: Array<{
    execution_status: string;
    original_interpretation?: SemanticInterpretationResult;
    thinking_level: string;
  }>;
};

const databaseName = "captured-benchmark-review-recovery-v1";
const repository = createConfirmedTripRepository({ databaseName });
const sourceId = "benchmark:external-markdown-001:source";
const extracted = extractMarkdownSource({
  schema_version: "text-source-input.v1",
  source_id: sourceId,
  input_mode: "markdown_file",
  media_type: "text/markdown",
  content: sourceContent,
  display_name: "source.md",
});
const sourceGate = validateUnifiedSourceDocument(extracted, {
  source_id: sourceId,
});
if (!sourceGate.valid) throw new Error("Captured benchmark source is invalid.");

const mediumRun = (capturedArtifact as CapturedArtifact).runs.find(
  (run) =>
    run.thinking_level === "medium" &&
    run.execution_status === "succeeded" &&
    run.original_interpretation?.status === "draft",
);
if (!mediumRun?.original_interpretation?.draft)
  throw new Error("Captured medium interpretation is unavailable.");

const originalInterpretation = structuredClone(
  mediumRun.original_interpretation,
);
originalInterpretation.findings.push(
  ...validateInterpretationFidelity(
    originalInterpretation,
    sourceGate.document,
  ),
);
const originalDraft = structuredClone(originalInterpretation.draft!);
const evidence = createReviewEvidenceProjection(sourceGate.document);

type RecoveryAudit = {
  corrected_fields: string[];
  critical_corrections: string[];
  explicit_finding_resolutions: number;
  remaining_unsupported_facts: string[];
};

function auditFor(draft: ParsedTripDraft): RecoveryAudit {
  const correctedFields = draft.entities.flatMap((entity) =>
    entity.provenance.origin === "user"
      ? entity.provenance.overridden_fields.map(
          (field) => `${entity.id}.${field}`,
        )
      : [],
  );
  return {
    corrected_fields: correctedFields,
    critical_corrections: correctedFields.filter(
      (field) => field.endsWith(".title") || field.endsWith(".time.kind"),
    ),
    explicit_finding_resolutions: draft.findings.filter(
      (finding) => finding.code === "USER_RESOLVED_FINDING",
    ).length,
    remaining_unsupported_facts: originalInterpretation.findings
      .filter((finding) => !finding.blocking)
      .map((finding) => finding.code),
  };
}

function Fixture() {
  const [draft, setDraft] = useState(() => structuredClone(originalDraft));
  const [trip, setTrip] = useState<CanonicalTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<RecoveryAudit | null>(() => {
    const stored = sessionStorage.getItem("captured-benchmark-recovery-audit");
    return stored ? (JSON.parse(stored) as RecoveryAudit) : null;
  });

  useEffect(() => {
    void repository.loadActive().then((result) => {
      if (result.status === "ready") setTrip(result.trip);
      setLoading(false);
    });
    Object.assign(window, {
      clearCapturedBenchmarkRecovery: () => repository.clear(),
    });
  }, []);

  const presentation = useMemo(
    () => (trip ? createTripPresentation(trip) : null),
    [trip],
  );

  if (loading) return <main aria-label="載入中">載入中</main>;
  if (presentation) {
    return (
      <>
        <ResultViewer
          onShowHome={() => undefined}
          presentation={presentation}
        />
        {audit && (
          <pre aria-label="恢復驗收紀錄" className="sr-only">
            {JSON.stringify(audit)}
          </pre>
        )}
      </>
    );
  }

  return (
    <ReviewScreen
      adjustments={[]}
      draft={draft}
      evidence={evidence}
      errorMessage={error}
      interpretation={originalInterpretation}
      onCancel={() => undefined}
      onConfirm={() => {
        setError(null);
        void confirmReviewedTrip(draft, repository, { sourceId })
          .then((confirmed) => {
            const nextAudit = auditFor(draft);
            sessionStorage.setItem(
              "captured-benchmark-recovery-audit",
              JSON.stringify(nextAudit),
            );
            setAudit(nextAudit);
            setTrip(confirmed);
            location.reload();
          })
          .catch((cause) => {
            setError(cause instanceof Error ? cause.message : String(cause));
          });
      }}
      onDraftChange={setDraft}
      originalDraft={originalDraft}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider theme={tripTheme}>
    <Fixture />
  </ThemeProvider>,
);
