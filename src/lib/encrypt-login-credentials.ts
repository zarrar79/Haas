import "server-only";

import crypto from "crypto";
import fs from "fs";

import { getServerConfig } from "@/lib/server-config";

/**
 * Encrypt login credentials for Django /user/login/.
 * Django decrypts with private_key_client.pem.
 */
export function encryptLoginCredentials(credentials: {
  email: string;
  password: string;
}): string {
  const { loginPublicKeyPath } = getServerConfig();
  const publicKeyPem = fs.readFileSync(loginPublicKeyPath, "utf8");

  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(JSON.stringify(credentials), "utf8"),
  );

  return encrypted.toString("base64");
}
