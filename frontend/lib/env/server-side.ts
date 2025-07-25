import { z } from "zod";

const serverSideEnvSchema = z.object({
	VERCEL_ENV: z.enum(["development", "preview", "production"]),
	VERCEL_GIT_PULL_REQUEST_ID: z
		.string()
		.transform((v) => (v === "" ? undefined : v)), // Treat an empty string as undefined
	AUTH0_SECRET: z.string(),
	APP_BASE_URL: z.string(),
	AUTH0_DOMAIN: z.string(),
	AUTH0_CLIENT_ID: z.string(),
	AUTH0_CLIENT_SECRET: z.string(),
	AUTH0_AUDIENCE: z.string().optional(),
});

/**
 * Type-safe environment variables available server-side
 */
export const serverSideEnv = serverSideEnvSchema.parse({
	VERCEL_ENV: process.env.VERCEL_ENV,
	VERCEL_GIT_PULL_REQUEST_ID: process.env.VERCEL_GIT_PULL_REQUEST_ID,
	AUTH0_SECRET: process.env.AUTH0_SECRET,
	APP_BASE_URL: process.env.APP_BASE_URL,
	AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
	AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
	AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
	AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
});
