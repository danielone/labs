import { z } from "zod";

const envSchema = z.object({
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
});

export type BuildInfo = {
  environment: "local" | "preview" | "production";
  commit: string | null;
};

export function getBuildInfo(): BuildInfo {
  const env = envSchema.parse({
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
  });

  return {
    environment:
      env.VERCEL_ENV === "production"
        ? "production"
        : env.VERCEL_ENV === "preview"
          ? "preview"
          : "local",
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };
}
