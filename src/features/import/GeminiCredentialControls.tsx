import { useEffect, useState } from "react";
import { Button, TextField, Typography } from "@mui/material";

import { EditorialMarker } from "../../components/editorial/EditorialPrimitives";
import type { GeminiCredentialRepository } from "../../persistence/geminiCredentialRepository";

type CredentialStatus = "checking" | "empty" | "ready" | "unavailable";

export function GeminiCredentialControls({
  repository,
}: {
  repository: GeminiCredentialRepository;
}) {
  const [credential, setCredential] = useState("");
  const [status, setStatus] = useState<CredentialStatus>("checking");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    void repository
      .load()
      .then((result) => {
        if (!current) return;
        setStatus(
          result.status === "ready"
            ? "ready"
            : result.status === "empty"
              ? "empty"
              : "unavailable",
        );
        if (result.status === "unavailable") {
          setMessage("無法讀取先前儲存的 API key。請先移除，再重新設定。");
        }
      })
      .catch(() => {
        if (!current) return;
        setStatus("unavailable");
        setMessage("這個瀏覽器目前無法使用安全儲存空間。");
      });
    return () => {
      current = false;
    };
  }, [repository]);

  const save = async () => {
    if (!credential.trim()) {
      setMessage("請先輸入 Gemini API key。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const capability = await repository.probePersistence();
      if (!capability.supported) {
        setStatus("unavailable");
        setMessage(
          "這個瀏覽器無法安全加密 API key，因此不會儲存，也不會改存成明文。",
        );
        return;
      }
      await repository.save(credential.trim());
      setCredential("");
      setStatus("ready");
      setMessage("API key 已加密保存在這個瀏覽器，不會寫進行程資料。");
    } catch {
      setMessage("API key 沒有儲存成功，也沒有改存成明文。請再試一次。");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await repository.clear();
      setCredential("");
      setStatus("empty");
      setMessage("Gemini API key 已從這個瀏覽器移除。你的行程沒有變動。");
    } catch {
      setMessage("API key 尚未移除，請稍後再試一次。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Typography className="font-utility text-sm text-trip-muted">
        狀態：
        {status === "checking"
          ? "檢查中"
          : status === "ready"
            ? "已安全儲存"
            : status === "empty"
              ? "尚未設定"
              : "需要重新設定"}
      </Typography>
      <TextField
        label="Gemini API key"
        type="password"
        value={credential}
        onChange={(event) => setCredential(event.target.value)}
        autoComplete="off"
        fullWidth
        helperText="只供這個瀏覽器呼叫 Gemini，不會寫進行程資料。"
      />
      {message && (
        <EditorialMarker
          className="py-2 font-editorial leading-7"
          role={status === "unavailable" ? "alert" : "status"}
          tone={status === "unavailable" ? "attention" : "movement"}
        >
          {message}
        </EditorialMarker>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="min-h-11"
          variant="contained"
          onClick={save}
          disabled={busy || !credential.trim()}
        >
          儲存在這個瀏覽器
        </Button>
        <Button
          className="min-h-11"
          variant="outlined"
          color="warning"
          onClick={clear}
          disabled={busy || status === "checking"}
        >
          移除 API key
        </Button>
      </div>
    </div>
  );
}
