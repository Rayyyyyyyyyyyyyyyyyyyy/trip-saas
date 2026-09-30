import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import { DeleteOutline, ExpandMore } from "@mui/icons-material";

import { EditorialMarker } from "../../components/editorial/EditorialPrimitives";
import {
  LocalDataClearError,
  type LocalDataOperations,
} from "../../persistence/localDataOperations";

type ClearScope = "all" | "trip";

export type LocalDataControlsProps = {
  onCleared: (scope: ClearScope) => void;
  operations: LocalDataOperations;
};

const scopeCopy: Record<
  ClearScope,
  { action: string; description: string; title: string }
> = {
  trip: {
    action: "清除行程資料",
    description:
      "會刪除目前行程和所有勾選紀錄，但會保留 Gemini API key。刪除後無法復原。",
    title: "確定清除行程資料？",
  },
  all: {
    action: "清除全部本機資料",
    description:
      "會刪除目前行程、所有勾選紀錄和 Gemini API key。刪除後無法復原。",
    title: "確定清除全部本機資料？",
  },
};

export function LocalDataControls({
  onCleared,
  operations,
}: LocalDataControlsProps) {
  const [pendingScope, setPendingScope] = useState<ClearScope | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmClear = async () => {
    if (!pendingScope) return;
    const scope = pendingScope;
    setClearing(true);
    setError(null);
    try {
      if (scope === "trip") await operations.clearTripData();
      else await operations.clearAllLocalData();
      setPendingScope(null);
      onCleared(scope);
    } catch (cause) {
      setError(
        cause instanceof LocalDataClearError
          ? `有些資料尚未清除：${cause.failedScopes.join("、")}。請再試一次。`
          : "本機資料尚未清除完成，原有資料可能仍在。請再試一次。",
      );
    } finally {
      setClearing(false);
    }
  };

  return (
    <>
      <Accordion className="bg-transparent">
        <AccordionSummary expandIcon={<ExpandMore />}>
          <span className="flex items-center gap-3">
            <DeleteOutline />
            <Typography className="font-utility font-bold">
              管理這台裝置的資料
            </Typography>
          </span>
        </AccordionSummary>
        <AccordionDetails>
          <div className="space-y-4">
            <Typography className="font-editorial leading-7 text-trip-muted">
              只清除行程資料時，Gemini API key
              會保留。若要把這台裝置上的資料全部移除，請選「清除全部本機資料」。
            </Typography>
            {error && (
              <EditorialMarker
                className="py-2 font-editorial leading-7"
                role="alert"
                tone="attention"
              >
                {error}
              </EditorialMarker>
            )}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="min-h-11"
                variant="outlined"
                color="warning"
                onClick={() => setPendingScope("trip")}
              >
                清除行程資料
              </Button>
              <Button
                className="min-h-11"
                variant="outlined"
                color="error"
                onClick={() => setPendingScope("all")}
              >
                清除全部本機資料
              </Button>
            </div>
          </div>
        </AccordionDetails>
      </Accordion>

      <Dialog
        open={pendingScope !== null}
        onClose={clearing ? undefined : () => setPendingScope(null)}
        aria-labelledby="local-data-clear-title"
      >
        <DialogTitle id="local-data-clear-title">
          {pendingScope ? scopeCopy[pendingScope].title : "清除本機資料"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {pendingScope ? scopeCopy[pendingScope].description : ""}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            className="min-h-11"
            disabled={clearing}
            onClick={() => setPendingScope(null)}
          >
            取消
          </Button>
          <Button
            className="min-h-11"
            color="error"
            disabled={clearing}
            variant="contained"
            onClick={() => void confirmClear()}
          >
            {clearing
              ? "正在清除…"
              : pendingScope
                ? scopeCopy[pendingScope].action
                : "確認清除"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
