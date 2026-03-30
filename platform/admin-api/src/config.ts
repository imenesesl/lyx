const INSECURE_DEFAULTS = ["change-me-in-production", "secret", "password", "123456"];

const jwtSecret = process.env.JWT_SECRET ?? "change-me-in-production";

if (process.env.NODE_ENV === "production" && INSECURE_DEFAULTS.includes(jwtSecret)) {
  console.error("[FATAL] JWT_SECRET is set to an insecure default. Set a strong secret before running in production.");
  process.exit(1);
}

const minioAccessKey = process.env.MINIO_ACCESS_KEY ?? "lyxadmin";
const minioSecretKey = process.env.MINIO_SECRET_KEY ?? "lyxsecret";

const storageEndpoint = process.env.MINIO_ENDPOINT ?? "localhost";
const isS3Mode = storageEndpoint === "s3" || storageEndpoint.includes("amazonaws.com");

if (process.env.NODE_ENV === "production" && !isS3Mode && (minioAccessKey === "lyxadmin" || minioSecretKey === "lyxsecret")) {
  console.error("[FATAL] MinIO credentials are set to insecure defaults. Set strong credentials before running in production.");
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/lyx",
  nodeEnv: process.env.NODE_ENV ?? "development",
  jwt: {
    secret: jwtSecret,
    expiresIn: "7d",
  },
  minio: {
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: parseInt(process.env.MINIO_PORT ?? "9000", 10),
    accessKey: minioAccessKey,
    secretKey: minioSecretKey,
    bucket: process.env.MINIO_BUCKET ?? "lyx-bundles",
    useSSL: process.env.MINIO_USE_SSL === "true",
  },
  cors: {
    origin: process.env.CORS_ORIGIN ?? "*",
  },
  aws: {
    region: process.env.AWS_REGION ?? "us-west-2",
  },
};
