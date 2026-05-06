import { PutObjectCommand } from "@aws-sdk/client-s3";
import { DocumentStorage } from "../../application/Ports";
import { s3Client } from "../aws/clients";

export class S3DocumentStorage implements DocumentStorage {
  constructor(private readonly bucketName: string) {}

  async putDocument(input: {
    trackingId: string;
    fileName: string;
    contentBase64: string;
    contentType: string;
  }): Promise<{ bucket: string; key: string }> {
    const key = `${input.trackingId}/${sanitizeFileName(input.fileName)}`;
    const body = Buffer.from(input.contentBase64, "base64");

    await s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: input.contentType,
        ServerSideEncryption: "AES256",
        Metadata: {
          trackingId: input.trackingId
        }
      })
    );

    return { bucket: this.bucketName, key };
  }
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}
