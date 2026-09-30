# Persistence ownership

Own separately scoped confirmed-trip, Gemini credential, and checklist repositories plus their migrations and clear operations.

## Confirmed trip boundary

`confirmedTripRepository` owns the versioned IndexedDB records for exactly one
active CanonicalTrip. Callers interact through `loadActive` and `replaceActive`;
they do not read object stores directly.

- Every write requires authoritative CanonicalTrip validation before storage.
- Replacement clears prior trip records, writes the replacement record, and
  updates the active pointer in one IndexedDB transaction. A failed transaction
  leaves the prior active trip unchanged.
- Every read validates repository metadata and the CanonicalTrip again. Missing
  or invalid records return explicit recovery states and never enter Result UI.
- Repository records contain only CanonicalTrip plus non-secret storage metadata.
  Source documents, provider responses, Review state, and credentials do not
  belong in this database.
- The repository closes connections after each operation and closes stale
  connections on a version-change request so future migrations are not blocked.

## Gemini credential boundary

`geminiCredentialRepository` owns a separate versioned IndexedDB database. It
performs the approved persistence capability probe before saving and never
downgrades to plaintext browser storage.

- The durable encryption key is a 256-bit AES-GCM `CryptoKey` with
  `extractable = false`; the API key record contains only a fresh 96-bit IV,
  ciphertext, version, and non-secret timestamp.
- Reads verify key algorithm, length, usages, and non-extractability before
  decrypting. Partial, incompatible, or undecryptable records return an explicit
  unavailable state and require an explicit reset.
- Saving key material and ciphertext is one transaction. `clear` removes both
  credential stores without touching confirmed-trip or checklist data.
- Capability probes use an isolated temporary database and verify persistence,
  reload use, decryption, and blocked export before cleanup.
- Repository errors and metadata never contain the credential plaintext.

## Clear-operation boundary

`localDataOperations` exposes three distinct destructive scopes for later UI
confirmation: trip data, credential, and all local data. Trip data combines the
confirmed-trip and trip-scoped checklist repositories but never includes the
credential. Credential clearing never includes trip data.

Because separate browser stores cannot share one transaction, each operation
uses all-settled failure accounting. A partial failure reports exactly which
scopes completed and which failed; callers must not present overall success
when any requested scope failed.

## Checklist boundary

`checklistRepository` stores versioned `todoId → boolean` state under a key
scoped by CanonicalTrip identity. It does not persist checklist labels or Result
UI status copy; those remain derived from current trip data.

Golden Osaka compatibility remains feature-owned. On first load, the Golden
adapter migrates valid `osaka-trip-todos` values into
`trip-runtime-checklist:golden%3Aosaka-2026`. After migration, scoped state is
authoritative and every load/toggle synchronizes the legacy array so existing
traveler state and older code paths remain intact. Trip/all-data clearing
removes both scoped keys and explicitly declared legacy compatibility keys.
