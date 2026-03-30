import { Client as MinioClient } from "minio";
import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";
import { Readable } from "node:stream";

function isS3Mode(): boolean {
  return config.minio.endPoint === "s3" || config.minio.endPoint.includes("amazonaws.com");
}

// --- MinIO client (local dev) ---
let minioClient: MinioClient;

function getMinioClient(): MinioClient {
  if (!minioClient) {
    minioClient = new MinioClient({
      endPoint: config.minio.endPoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
  }
  return minioClient;
}

// --- AWS S3 client (production) ---
let s3Client: S3Client;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: config.aws.region });
  }
  return s3Client;
}

export async function ensureBucket(): Promise<void> {
  const bucket = config.minio.bucket;

  if (isS3Mode()) {
    const s3 = getS3Client();
    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      const policy = {
        Version: "2012-10-17",
        Statement: [
          { Effect: "Allow", Principal: "*", Action: "s3:GetObject", Resource: `arn:aws:s3:::${bucket}/*` },
        ],
      };
      await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(policy) }));
      console.log(`[lyx-admin] Created S3 bucket "${bucket}" with public-read policy`);
    }
  } else {
    const mc = getMinioClient();
    const exists = await mc.bucketExists(bucket);
    if (!exists) {
      await mc.makeBucket(bucket);
      const policy = {
        Version: "2012-10-17",
        Statement: [
          { Effect: "Allow", Principal: { AWS: ["*"] }, Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${bucket}/*`] },
        ],
      };
      await mc.setBucketPolicy(bucket, JSON.stringify(policy));
      console.log(`[lyx-admin] Created bucket "${bucket}" with public-read policy`);
    }
  }
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function uploadFile(
  objectName: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (isS3Mode()) {
    const s3 = getS3Client();
    await s3.send(new PutObjectCommand({
      Bucket: config.minio.bucket,
      Key: objectName,
      Body: buffer,
      ContentType: contentType,
    }));
  } else {
    const mc = getMinioClient();
    const stream = Readable.from(buffer);
    await mc.putObject(config.minio.bucket, objectName, stream, buffer.length, {
      "Content-Type": contentType,
    });
  }
  return getPublicUrl(objectName);
}

export async function uploadStream(
  objectName: string,
  stream: Readable,
  size: number,
  contentType: string
): Promise<string> {
  if (isS3Mode()) {
    const buffer = await streamToBuffer(stream);
    return uploadFile(objectName, buffer, contentType);
  } else {
    const mc = getMinioClient();
    await mc.putObject(config.minio.bucket, objectName, stream, size, {
      "Content-Type": contentType,
    });
    return getPublicUrl(objectName);
  }
}

export function getPublicUrl(objectName: string): string {
  return `/storage/${objectName}`;
}

export async function deletePrefix(prefix: string): Promise<void> {
  if (isS3Mode()) {
    const s3 = getS3Client();
    const listed = await s3.send(new ListObjectsV2Command({
      Bucket: config.minio.bucket,
      Prefix: prefix,
    }));
    if (listed.Contents && listed.Contents.length > 0) {
      await s3.send(new DeleteObjectsCommand({
        Bucket: config.minio.bucket,
        Delete: { Objects: listed.Contents.map(o => ({ Key: o.Key! })) },
      }));
    }
  } else {
    const mc = getMinioClient();
    const objectsList = mc.listObjects(config.minio.bucket, prefix, true);
    const toDelete: string[] = [];
    for await (const obj of objectsList) {
      toDelete.push(obj.name);
    }
    if (toDelete.length > 0) {
      await mc.removeObjects(config.minio.bucket, toDelete);
    }
  }
}

export function getStorageClient(): MinioClient | null {
  return isS3Mode() ? null : getMinioClient();
}

export async function healthCheck(): Promise<boolean> {
  try {
    if (isS3Mode()) {
      await getS3Client().send(new HeadBucketCommand({ Bucket: config.minio.bucket }));
    } else {
      await getMinioClient().bucketExists(config.minio.bucket);
    }
    return true;
  } catch {
    return false;
  }
}
