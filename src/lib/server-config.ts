import { z } from "zod";

/**
 * Server-only settings.
 * The browser must never see backendBaseUrl or key paths.
 */
const serverConfigSchema = z.object({
  backendBaseUrl: z.string().url(),
  loginPublicKeyPath: z.string().min(1),
  responsePrivateKeyPath: z.string().min(1),
  nodeEnvironment: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type ServerConfig = z.infer<typeof serverConfigSchema>;

let cachedConfig: ServerConfig | null = null;

/** Read and validate server env once per process. */
export function getServerConfig(): ServerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = serverConfigSchema.safeParse({
    backendBaseUrl: process.env.BACKEND_URL,
    loginPublicKeyPath: process.env.LOGIN_PUBLIC_KEY_PATH,
    responsePrivateKeyPath: process.env.RESPONSE_PRIVATE_KEY_PATH,
    nodeEnvironment: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    throw new Error(
      `Invalid server config: ${JSON.stringify(fieldErrors)}. ` +
        `Set BACKEND_URL, LOGIN_PUBLIC_KEY_PATH, and RESPONSE_PRIVATE_KEY_PATH in .env`,
    );
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}
