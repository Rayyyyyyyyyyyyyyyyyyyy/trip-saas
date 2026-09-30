/** A prepared provider envelope stays private to its adapter. Preparation is
 * synchronous and makes no network request. The interpreter checks its exact
 * serialized size before authorizing send. Only structured JSON crosses back. */
export type InterpretationTransport = {
  prepare(prompt: string): {
    requestBytes: number;
    estimatedInputTokens: number;
    send(request: {
      credential: string;
      signal?: AbortSignal;
    }): Promise<unknown>;
  };
};
