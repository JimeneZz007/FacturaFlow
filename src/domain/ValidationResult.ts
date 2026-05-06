import { InvoiceStatus } from "./Invoice";

export interface ValidationResult {
  status: InvoiceStatus;
  reasons: string[];
}
