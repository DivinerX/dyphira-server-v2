import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  DB_URI: z.string().url(),
  JWT_SECRET: z.string(),
  SESSION_SECRET: z.string(),
  SECRET_KEY: z.string(),
  CLIENT_BASE_URL: z.string().url(),
  API_BASE_URL: z.string().url(),
  REDIS_HOST: z.string(),
  REDIS_PASSWORD: z.string(),
  REDIS_PORT: z.coerce.number(),
  OPENAI_API_KEY: z.string(),

  TWITTER_CONSUMER_KEY: z.string(),
  TWITTER_CONSUMER_SECRET: z.string(),

  SMTP_SERVICE: z.string(),
  EMAIL_USER: z.string(),
  EMAIL_PASSWORD: z.string(),
  AWS_ACCESS_KEY: z.string(),
  AWS_SECRET_KEY: z.string(),

  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});
const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.log('Error parsing environment variables:');
  console.log(env.error.issues);
  process.exit(1);
}

export default env.data;
