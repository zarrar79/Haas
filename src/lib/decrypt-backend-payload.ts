import "server-only";

import crypto from "crypto";
import fs from "fs";
import * as fernet from "fernet";

import { getServerConfig } from "@/lib/server-config";

type EncryptedBackendPayload = {
  key: string;
  data: string;
};

function isEncryptedBackendPayload(
  value: unknown,
): value is EncryptedBackendPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    "data" in value &&
    typeof (value as EncryptedBackendPayload).key === "string" &&
    typeof (value as EncryptedBackendPayload).data === "string"
  );
}

/**
 * Decrypt hybrid-encrypted Django `data` ({ key, data }).
 * If the value is not encrypted, return it unchanged.
 */
export function decryptBackendPayload<T = unknown>(value: unknown): T {
  if (!isEncryptedBackendPayload(value)) {
    return value as T;
  }

  const { responsePrivateKeyPath } = getServerConfig();
  const privateKeyPem = fs.readFileSync(responsePrivateKeyPath, "utf8");

  const fernetKey = crypto.privateDecrypt(
    {
      key: privateKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(value.key, "base64"),
  );

  const secret = new fernet.Secret(fernetKey.toString());
  const token = new fernet.Token({
    secret,
    token: value.data,
    ttl: 0,
  });

  return JSON.parse(token.decode()) as T;
}
