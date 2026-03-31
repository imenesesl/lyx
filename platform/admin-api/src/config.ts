const INSECURE_DEFAULTS = [
  "change-me-in-production",
  "secret",
  "password",
  "123456",
];

const jwtSecret = process.env.JWT_SECRET ?? "change-me-in-production";

if (
  process.env.NODE_ENV === "production" &&
  INSECURE_DEFAULTS.includes(jwtSecret)
) {
  console.error(
    "[FATAL] JWT_SECRET is set to an insecure default. Set a strong secret before running in production."
  );
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  get mongoUri(): string {
    const uri = process.env.MONGO_URI ?? "";
    if (!uri) {
      throw new Error(
        "MONGO_URI is not set. Provide a MongoDB Atlas connection string."
      );
    }
    return uri;
  },
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwt: {
    secret: jwtSecret,
    expiresIn: "7d",
  },
  storage: {
    bucket: process.env.S3_BUCKET ?? "lyx-bundles",
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? "*",
  },
  aws: {
    region: process.env.AWS_REGION ?? "us-west-2",
  },
};
