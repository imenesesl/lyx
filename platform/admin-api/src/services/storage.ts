import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config.js";
import { Readable } from "node:stream";

let s3Client: S3Client;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: config.aws.region });
  }
  return s3Client;
}

export async function ensureBucket(): Promise<void> {
  const bucket = config.storage.bucket;
  const s3 = getS3Client();
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucket}/*`,
        },
      ],
    };
    await s3.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(policy),
      })
    );
    console.log(`[lyx-admin] Created S3 bucket "${bucket}" with public-read policy`);
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
  const s3 = getS3Client();
  await s3.send(
    new PutObjectCommand({
      Bucket: config.storage.bucket,
      Key: objectName,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return getPublicUrl(objectName);
}

export async function uploadStream(
  objectName: string,
  stream: Readable,
  size: number,
  contentType: string
): Promise<string> {
  const buffer = await streamToBuffer(stream);
  return uploadFile(objectName, buffer, contentType);
}

export function getPublicUrl(objectName: string): string {
  return `/storage/${objectName}`;
}

export async function deletePrefix(prefix: string): Promise<void> {
  const s3 = getS3Client();
  const listed = await s3.send(
    new ListObjectsV2Command({
      Bucket: config.storage.bucket,
      Prefix: prefix,
    })
  );
  if (listed.Contents && listed.Contents.length > 0) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: config.storage.bucket,
        Delete: {
          Objects: listed.Contents.map((o) => ({ Key: o.Key! })),
        },
      })
    );
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await getS3Client().send(
      new HeadBucketCommand({ Bucket: config.storage.bucket })
    );
    return true;
  } catch {
    return false;
  }
}
