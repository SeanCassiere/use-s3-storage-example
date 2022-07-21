import dotenv from "dotenv";
import { z, ZodFormattedError } from "zod";

dotenv.config();

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]),
	PORT: z.string(),
	DATABASE_URL: z.string(),
	JWT_SECRET: z.string(),
	COOKIE_SECRET: z.string(),
});

const envData = envSchema.safeParse(process.env);

const formatErrors = (errors: ZodFormattedError<Map<string, string>, string>) =>
	Object.entries(errors)
		.map(([name, value]) => {
			if (value && "_errors" in value) return `${name}: ${value._errors.join(", ")}\n`;
		})
		.filter(Boolean);

if (!envData.success) {
	console.error("❌ Invalid environment variables:\n", ...formatErrors(envData.error.format()));
	process.exit(1);
}

export const env = envData.data;
