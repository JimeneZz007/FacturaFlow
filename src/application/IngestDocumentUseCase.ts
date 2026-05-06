import { randomUUID } from "node:crypto";
import {
  AuditLogRepository,
  DocumentStorage,
  IngestDocumentCommand,
  JobRepository,
  ProcessingQueue
} from "./Ports";

export class IngestDocumentUseCase {
  constructor(
    private readonly storage: DocumentStorage,
    private readonly jobs: JobRepository,
    private readonly queue: ProcessingQueue,
    private readonly audit: AuditLogRepository
  ) {}

  async execute(command: IngestDocumentCommand): Promise<{ trackingId: string }> {
    const trackingId = randomUUID();
    const now = new Date().toISOString();
    const document = await this.storage.putDocument({ trackingId, ...command });

    await this.jobs.create({
      trackingId,
      status: "QUEUED",
      country: command.country,
      documentBucket: document.bucket,
      documentKey: document.key,
      fixture: command.fixture,
      createdAt: now,
      updatedAt: now
    });

    await this.audit.append({
      trackingId,
      eventType: "DOCUMENT_INGESTED",
      details: {
        bucket: document.bucket,
        key: document.key,
        country: command.country
      }
    });

    await this.queue.send({
      trackingId,
      bucket: document.bucket,
      key: document.key,
      country: command.country,
      fixture: command.fixture
    });

    return { trackingId };
  }
}
