import { describe, expect, it } from "vitest";

import {
  createInitialTripWorkflowState,
  tripWorkflowReducer,
} from "../../src/app/tripWorkflow";
import { createWorkflowRequestCoordinator } from "../../src/app/tripWorkflowRequests";
import {
  validDraftInterpretationResult,
  validTextSourceInput,
} from "../fixtures/contracts/validContracts";

describe("trip workflow request coordination", () => {
  it("creates ordered identities and aborts superseded work", () => {
    const coordinator = createWorkflowRequestCoordinator({ namespace: "test" });
    const firstSession = coordinator.startSession();
    const firstRequest = coordinator.startRequest(firstSession.sessionId);
    const secondRequest = coordinator.startRequest(firstSession.sessionId);

    expect(firstSession.sessionId).toBe("session:test:1");
    expect(firstRequest.requestId).toBe("request:test:2");
    expect(secondRequest.requestId).toBe("request:test:3");
    expect(firstRequest.signal.aborted).toBe(true);
    expect(
      coordinator.isCurrent(firstSession.sessionId, firstRequest.requestId),
    ).toBe(false);
    expect(
      coordinator.isCurrent(firstSession.sessionId, secondRequest.requestId),
    ).toBe(true);

    const nextSession = coordinator.startSession();
    expect(firstSession.signal.aborted).toBe(true);
    expect(secondRequest.signal.aborted).toBe(true);
    expect(nextSession.sessionId).toBe("session:test:4");
  });

  it("aborts the current request when its session is cancelled", () => {
    const coordinator = createWorkflowRequestCoordinator({
      namespace: "cancel",
    });
    const session = coordinator.startSession();
    const request = coordinator.startRequest(session.sessionId);

    coordinator.cancelSession(session.sessionId);

    expect(session.signal.aborted).toBe(true);
    expect(request.signal.aborted).toBe(true);
    expect(coordinator.isCurrent(session.sessionId, request.requestId)).toBe(
      false,
    );
  });

  it("ignores stale reducer completions from old requests and sessions", () => {
    let state = createInitialTripWorkflowState();
    state = tripWorkflowReducer(state, {
      type: "intake_started",
      sessionId: "session:new",
      source: validTextSourceInput,
    });
    state = tripWorkflowReducer(state, {
      type: "parse_started",
      sessionId: "session:new",
      requestId: "request:new",
    });

    const unchangedByOldRequest = tripWorkflowReducer(state, {
      type: "parse_completed",
      sessionId: "session:new",
      requestId: "request:old",
      interpretation: validDraftInterpretationResult,
    });
    const unchangedByOldSession = tripWorkflowReducer(state, {
      type: "workflow_failed",
      sessionId: "session:old",
      requestId: "request:old",
      failure: { code: "STALE", message: "stale", recoverable: false },
    });

    expect(unchangedByOldRequest).toBe(state);
    expect(unchangedByOldSession).toBe(state);
    expect(state.status).toBe("parsing");
  });
});
