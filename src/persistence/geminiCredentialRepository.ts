export const GEMINI_CREDENTIAL_DATABASE_VERSION = 1;
export const DEFAULT_GEMINI_CREDENTIAL_DATABASE_NAME =
  "trip-runtime-gemini-credential";

const KEY_STORE = "key-material";
const CREDENTIAL_STORE = "credentials";
const KEY_ID = "gemini-aes-gcm-key";
const CREDENTIAL_ID = "gemini-api-key";

type CredentialRecord = {
  ciphertext: ArrayBuffer;
  id: typeof CREDENTIAL_ID;
  iv: Uint8Array;
  repositoryVersion: 1;
  updatedAt: string;
};

type KeyRecord = {
  id: typeof KEY_ID;
  key: CryptoKey;
  repositoryVersion: 1;
};

export type CredentialLoadResult =
  | { status: "empty" }
  | { status: "ready"; credential: string }
  | {
      status: "unavailable";
      reason: "incomplete_record" | "invalid_key" | "decryption_failed";
    };

export type CredentialCapabilityResult =
  | { supported: true }
  | { supported: false; reason: "api_unavailable" | "persistence_failed" };

export type GeminiCredentialRepository = {
  clear(): Promise<void>;
  load(): Promise<CredentialLoadResult>;
  probePersistence(): Promise<CredentialCapabilityResult>;
  save(credential: string): Promise<void>;
};

export type GeminiCredentialRepositoryOptions = {
  crypto?: Crypto;
  databaseName?: string;
  indexedDB?: IDBFactory;
  now?: () => Date;
};

export class GeminiCredentialRepositoryError extends Error {
  constructor(
    readonly code:
      | "capability_unavailable"
      | "credential_invalid"
      | "open_failed"
      | "write_failed",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "GeminiCredentialRepositoryError";
  }
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result), {
      once: true,
    });
    request.addEventListener(
      "error",
      () => reject(request.error ?? new Error("IndexedDB request failed.")),
      { once: true },
    );
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve(), { once: true });
    transaction.addEventListener(
      "abort",
      () =>
        reject(
          transaction.error ?? new Error("IndexedDB transaction aborted."),
        ),
      { once: true },
    );
    transaction.addEventListener(
      "error",
      () =>
        reject(transaction.error ?? new Error("IndexedDB transaction failed.")),
      { once: true },
    );
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCredentialRecord(value: unknown): value is CredentialRecord {
  return (
    isRecord(value) &&
    value.id === CREDENTIAL_ID &&
    value.repositoryVersion === GEMINI_CREDENTIAL_DATABASE_VERSION &&
    value.ciphertext instanceof ArrayBuffer &&
    value.iv instanceof Uint8Array &&
    value.iv.byteLength === 12 &&
    typeof value.updatedAt === "string"
  );
}

function isApprovedKey(value: unknown): value is CryptoKey {
  if (!(value instanceof CryptoKey)) return false;
  const algorithm = value.algorithm as AesKeyAlgorithm;
  return (
    value.type === "secret" &&
    value.extractable === false &&
    algorithm.name === "AES-GCM" &&
    algorithm.length === 256 &&
    value.usages.includes("encrypt") &&
    value.usages.includes("decrypt")
  );
}

function isKeyRecord(value: unknown): value is KeyRecord {
  return (
    isRecord(value) &&
    value.id === KEY_ID &&
    value.repositoryVersion === GEMINI_CREDENTIAL_DATABASE_VERSION &&
    isApprovedKey(value.key)
  );
}

function openDatabase(
  indexedDB: IDBFactory | undefined,
  databaseName: string,
): Promise<IDBDatabase> {
  if (!indexedDB) {
    return Promise.reject(
      new GeminiCredentialRepositoryError(
        "capability_unavailable",
        "Browser-local credential storage is unavailable.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(
        databaseName,
        GEMINI_CREDENTIAL_DATABASE_VERSION,
      );
    } catch (error) {
      reject(
        new GeminiCredentialRepositoryError(
          "open_failed",
          "Browser-local credential storage could not be opened.",
          { cause: error },
        ),
      );
      return;
    }

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(KEY_STORE)) {
        database.createObjectStore(KEY_STORE, { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains(CREDENTIAL_STORE)) {
        database.createObjectStore(CREDENTIAL_STORE, { keyPath: "id" });
      }
    });
    request.addEventListener(
      "success",
      () => {
        request.result.addEventListener("versionchange", () => {
          request.result.close();
        });
        resolve(request.result);
      },
      { once: true },
    );
    request.addEventListener(
      "error",
      () =>
        reject(
          new GeminiCredentialRepositoryError(
            "open_failed",
            "Browser-local credential storage could not be opened.",
            { cause: request.error },
          ),
        ),
      { once: true },
    );
    request.addEventListener(
      "blocked",
      () =>
        reject(
          new GeminiCredentialRepositoryError(
            "open_failed",
            "Credential storage upgrade is blocked by another tab.",
          ),
        ),
      { once: true },
    );
  });
}

async function generateKey(crypto: Crypto) {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

async function probePersistence(
  indexedDB: IDBFactory | undefined,
  crypto: Crypto | undefined,
  databaseName: string,
): Promise<CredentialCapabilityResult> {
  if (!indexedDB || !crypto?.subtle) {
    return { supported: false, reason: "api_unavailable" };
  }

  const probeDatabaseName = `${databaseName}-capability-probe`;
  let database: IDBDatabase | null = null;
  try {
    database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(probeDatabaseName, 1);
      request.addEventListener("upgradeneeded", () => {
        request.result.createObjectStore("probe");
      });
      request.addEventListener("success", () => resolve(request.result), {
        once: true,
      });
      request.addEventListener("error", () => reject(request.error), {
        once: true,
      });
    });

    const key = await generateKey(crypto);
    const write = database.transaction("probe", "readwrite");
    write.objectStore("probe").put(key, "key");
    await transactionComplete(write);

    const read = database.transaction("probe", "readonly");
    const persistedKey = await requestResult(
      read.objectStore("probe").get("key"),
    );
    await transactionComplete(read);
    if (!isApprovedKey(persistedKey)) {
      return { supported: false, reason: "persistence_failed" };
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const sentinel = new TextEncoder().encode("credential-capability-probe");
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      persistedKey,
      sentinel,
    );
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      persistedKey,
      ciphertext,
    );
    if (new TextDecoder().decode(plaintext) !== "credential-capability-probe") {
      return { supported: false, reason: "persistence_failed" };
    }

    try {
      await crypto.subtle.exportKey("raw", persistedKey);
      return { supported: false, reason: "persistence_failed" };
    } catch (error) {
      if (
        !(error instanceof DOMException) ||
        error.name !== "InvalidAccessError"
      ) {
        return { supported: false, reason: "persistence_failed" };
      }
    }

    return { supported: true };
  } catch {
    return { supported: false, reason: "persistence_failed" };
  } finally {
    database?.close();
    try {
      await requestResult(indexedDB.deleteDatabase(probeDatabaseName));
    } catch {
      // A failed probe cleanup does not make plaintext persistence acceptable.
    }
  }
}

export function createGeminiCredentialRepository(
  options: GeminiCredentialRepositoryOptions = {},
): GeminiCredentialRepository {
  const databaseName =
    options.databaseName ?? DEFAULT_GEMINI_CREDENTIAL_DATABASE_NAME;
  const indexedDB = options.indexedDB ?? globalThis.indexedDB;
  const crypto = options.crypto ?? globalThis.crypto;
  const now = options.now ?? (() => new Date());

  return {
    async probePersistence() {
      return probePersistence(indexedDB, crypto, databaseName);
    },

    async load() {
      const database = await openDatabase(indexedDB, databaseName);
      try {
        const transaction = database.transaction(
          [KEY_STORE, CREDENTIAL_STORE],
          "readonly",
        );
        const keyRequest = transaction.objectStore(KEY_STORE).get(KEY_ID);
        const credentialRequest = transaction
          .objectStore(CREDENTIAL_STORE)
          .get(CREDENTIAL_ID);
        const [keyRecord, credentialRecord] = await Promise.all([
          requestResult(keyRequest),
          requestResult(credentialRequest),
        ]);
        await transactionComplete(transaction);

        if (keyRecord === undefined && credentialRecord === undefined) {
          return { status: "empty" };
        }
        if (keyRecord === undefined || credentialRecord === undefined) {
          return { status: "unavailable", reason: "incomplete_record" };
        }
        if (!isKeyRecord(keyRecord)) {
          return { status: "unavailable", reason: "invalid_key" };
        }
        if (!isCredentialRecord(credentialRecord)) {
          return { status: "unavailable", reason: "incomplete_record" };
        }

        try {
          const plaintext = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: new Uint8Array(credentialRecord.iv) },
            keyRecord.key,
            credentialRecord.ciphertext,
          );
          return {
            status: "ready",
            credential: new TextDecoder().decode(plaintext),
          };
        } catch {
          return { status: "unavailable", reason: "decryption_failed" };
        }
      } finally {
        database.close();
      }
    },

    async save(credential) {
      if (credential.trim().length === 0) {
        throw new GeminiCredentialRepositoryError(
          "credential_invalid",
          "A non-empty Gemini credential is required.",
        );
      }

      const capability = await probePersistence(
        indexedDB,
        crypto,
        databaseName,
      );
      if (!capability.supported) {
        throw new GeminiCredentialRepositoryError(
          "capability_unavailable",
          "This browser cannot safely persist the Gemini credential.",
        );
      }

      const database = await openDatabase(indexedDB, databaseName);
      try {
        const existingTransaction = database.transaction(KEY_STORE, "readonly");
        const existingKeyRecord = await requestResult(
          existingTransaction.objectStore(KEY_STORE).get(KEY_ID),
        );
        await transactionComplete(existingTransaction);
        if (
          existingKeyRecord !== undefined &&
          !isKeyRecord(existingKeyRecord)
        ) {
          throw new GeminiCredentialRepositoryError(
            "write_failed",
            "Stored credential key material is incompatible and requires reset.",
          );
        }

        const key = isKeyRecord(existingKeyRecord)
          ? existingKeyRecord.key
          : await generateKey(crypto);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const ciphertext = await crypto.subtle.encrypt(
          { name: "AES-GCM", iv },
          key,
          new TextEncoder().encode(credential),
        );
        const transaction = database.transaction(
          [KEY_STORE, CREDENTIAL_STORE],
          "readwrite",
        );
        transaction.objectStore(KEY_STORE).put({
          id: KEY_ID,
          key,
          repositoryVersion: GEMINI_CREDENTIAL_DATABASE_VERSION,
        } satisfies KeyRecord);
        transaction.objectStore(CREDENTIAL_STORE).put({
          ciphertext,
          id: CREDENTIAL_ID,
          iv,
          repositoryVersion: GEMINI_CREDENTIAL_DATABASE_VERSION,
          updatedAt: now().toISOString(),
        } satisfies CredentialRecord);

        try {
          await transactionComplete(transaction);
        } catch (error) {
          throw new GeminiCredentialRepositoryError(
            "write_failed",
            "Gemini credential storage did not commit.",
            { cause: error },
          );
        }
      } finally {
        database.close();
      }
    },

    async clear() {
      const database = await openDatabase(indexedDB, databaseName);
      try {
        const transaction = database.transaction(
          [KEY_STORE, CREDENTIAL_STORE],
          "readwrite",
        );
        transaction.objectStore(KEY_STORE).clear();
        transaction.objectStore(CREDENTIAL_STORE).clear();
        await transactionComplete(transaction);
      } finally {
        database.close();
      }
    },
  };
}
