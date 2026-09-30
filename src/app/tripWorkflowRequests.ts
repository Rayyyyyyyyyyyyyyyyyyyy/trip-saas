export type WorkflowSessionHandle = {
  sessionId: string;
  signal: AbortSignal;
};

export type WorkflowRequestHandle = {
  requestId: string;
  signal: AbortSignal;
};

export type WorkflowRequestCoordinator = {
  cancelSession(sessionId: string): void;
  isCurrent(sessionId: string, requestId: string): boolean;
  startRequest(sessionId: string): WorkflowRequestHandle;
  startSession(): WorkflowSessionHandle;
};

type ActiveSession = {
  controller: AbortController;
  request: { controller: AbortController; requestId: string } | null;
  sessionId: string;
};

export function createWorkflowRequestCoordinator(
  options: { namespace?: string } = {},
): WorkflowRequestCoordinator {
  const namespace = options.namespace ?? crypto.randomUUID();
  let sequence = 0;
  let active: ActiveSession | null = null;

  const nextId = (kind: "request" | "session") => {
    sequence += 1;
    return `${kind}:${namespace}:${sequence}`;
  };

  return {
    startSession() {
      active?.request?.controller.abort();
      active?.controller.abort();

      const controller = new AbortController();
      const sessionId = nextId("session");
      active = { controller, request: null, sessionId };
      return { sessionId, signal: controller.signal };
    },

    startRequest(sessionId) {
      if (active?.sessionId !== sessionId || active.controller.signal.aborted) {
        throw new Error(
          "Cannot start a request for an inactive workflow session.",
        );
      }

      active.request?.controller.abort();
      const controller = new AbortController();
      const requestId = nextId("request");
      active.request = { controller, requestId };
      active.controller.signal.addEventListener(
        "abort",
        () => controller.abort(),
        { once: true },
      );
      return { requestId, signal: controller.signal };
    },

    isCurrent(sessionId, requestId) {
      return (
        active?.sessionId === sessionId &&
        active.request?.requestId === requestId &&
        !active.controller.signal.aborted &&
        !active.request.controller.signal.aborted
      );
    },

    cancelSession(sessionId) {
      if (active?.sessionId !== sessionId) return;
      active.request?.controller.abort();
      active.controller.abort();
      active = null;
    },
  };
}
