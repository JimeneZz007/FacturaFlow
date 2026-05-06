import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getJobStatus, isApiMode, uploadInvoice } from "./api";
import { getDemoJobStatus, uploadDemoInvoice } from "./demoFlow";
import { FlowEvent, InvoiceView, JobStatus, JobStatusResponse, Scenario, ValidationView } from "./types";

const scenarioLabels: Record<Scenario, string> = {
  approved: "Factura aprobada",
  requires_review: "Baja confianza",
  math_error: "Error matemático"
};

const expectedEvents = [
  "DOCUMENT_INGESTED",
  "AI_EXTRACTION_STARTED",
  "AI_EXTRACTION_COMPLETED",
  "VALIDATION_COMPLETED",
  "INVOICE_APPROVED",
  "INVOICE_REQUIRES_REVIEW",
  "STORED"
];

export function App() {
  const apiMode = isApiMode();
  const [scenario, setScenario] = useState<Scenario>("approved");
  const [file, setFile] = useState<File | undefined>();
  const [trackingId, setTrackingId] = useState("");
  const [ingestLatencyMs, setIngestLatencyMs] = useState<number | undefined>();
  const [job, setJob] = useState<JobStatusResponse | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const poller = useRef<number | undefined>(undefined);

  const status = job?.status ?? (trackingId ? "QUEUED" : "IDLE");
  const isFinal = status === "APPROVED" || status === "REQUIRES_REVIEW" || status === "FAILED";

  useEffect(() => {
    if (!trackingId || isFinal) {
      if (poller.current) {
        window.clearInterval(poller.current);
      }
      return;
    }

    poller.current = window.setInterval(() => {
      void refreshStatus(trackingId);
    }, 2000);

    return () => {
      if (poller.current) {
        window.clearInterval(poller.current);
      }
    };
  }, [trackingId, isFinal]);

  const finalTone = useMemo(() => {
    if (status === "APPROVED") return "approved";
    if (status === "REQUIRES_REVIEW") return "review";
    if (status === "FAILED") return "failed";
    return "active";
  }, [status]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setJob(undefined);
    setTrackingId("");
    setIngestLatencyMs(undefined);

    const startedAt = performance.now();
    try {
      const result = apiMode
        ? await uploadInvoice({ file, scenario })
        : await uploadDemoInvoice({ scenario });
      setIngestLatencyMs(Math.round(performance.now() - startedAt));
      setTrackingId(result.trackingId);
      await refreshStatus(result.trackingId);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "No fue posible procesar la factura");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function refreshStatus(nextTrackingId: string) {
    try {
      const nextJob = apiMode
        ? await getJobStatus(nextTrackingId)
        : await getDemoJobStatus(nextTrackingId);
      setJob(nextJob);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "No fue posible consultar el estado");
    }
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="Resumen de FacturaFlow">
        <div>
          <h1>FacturaFlow MVP</h1>
          <p>ingesta &rarr; IA mock &rarr; validación matemática &rarr; almacenamiento</p>
        </div>
        <span className={`mode-pill ${apiMode ? "api" : "demo"}`}>
          {apiMode ? "API real" : "Demo local"}
        </span>
      </section>

      <section className="workspace">
        <form className="panel upload-panel" onSubmit={submit}>
          <div className="panel-heading">
            <h2>Procesar factura</h2>
            <p>Sube un PDF o usa la factura demo para ejecutar el flujo asíncrono.</p>
          </div>

          <label className="field">
            <span>Factura PDF</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={(event) => setFile(event.currentTarget.files?.[0])}
            />
          </label>

          <fieldset className="scenario-group">
            <legend>Escenario</legend>
            {Object.entries(scenarioLabels).map(([value, label]) => (
              <label className="scenario-option" key={value}>
                <input
                  type="radio"
                  name="scenario"
                  value={value}
                  checked={scenario === value}
                  onChange={() => setScenario(value as Scenario)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Enviando..." : "Procesar factura"}
          </button>

          {error && <p className="error-text">{error}</p>}
        </form>

        <section className={`panel status-panel ${finalTone}`}>
          <div className="panel-heading">
            <h2>Estado del procesamiento</h2>
            <p>La ingesta responde rápido; el resto avanza por colas y consumidores.</p>
          </div>

          <div className="status-grid">
            <Metric label="trackingId" value={trackingId || "Aun no enviado"} />
            <Metric label="Estado actual" value={status} />
            <Metric
              label="Tiempo de ingesta"
              value={ingestLatencyMs === undefined ? "Sin medición" : `${ingestLatencyMs} ms`}
            />
          </div>

          <div className={`final-state ${finalTone}`}>
            <span className="final-label">{finalStateCopy(status)}</span>
            {status !== "IDLE" && <code>{status}</code>}
          </div>
        </section>
      </section>

      <section className="grid">
        <Timeline events={job?.events ?? []} />
        <ExtractedData invoice={job?.invoice} />
        <ValidationCard validation={job?.validation} invoice={job?.invoice} />
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Timeline({ events }: { events: FlowEvent[] }) {
  const visibleEvents = expectedEvents.filter((eventType) => {
    if (eventType === "INVOICE_APPROVED") {
      return events.some((event) => event.eventType === eventType) || !events.some((event) => event.eventType === "INVOICE_REQUIRES_REVIEW");
    }
    if (eventType === "INVOICE_REQUIRES_REVIEW") {
      return events.some((event) => event.eventType === eventType);
    }
    return true;
  });

  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <h2>Timeline de eventos</h2>
        <p>Eventos emitidos por el flujo asíncrono.</p>
      </div>
      <ol className="timeline">
        {visibleEvents.map((eventType) => {
          const event = events.find((item) => item.eventType === eventType);
          return (
            <li className={event ? "done" : "pending"} key={eventType}>
              <span className="timeline-dot" />
              <div>
                <strong>{eventType}</strong>
                <span>{event ? formatTime(event.createdAt) : "pendiente"}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ExtractedData({ invoice }: { invoice?: InvoiceView }) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Datos extraidos</h2>
        <p>Respuesta normalizada de la IA mock.</p>
      </div>
      <dl className="data-list">
        <Data label="invoiceId" value={invoice?.invoiceId} />
        <Data label="issueDate" value={invoice?.issueDate} />
        <Data label="supplier.name" value={invoice?.supplier.name} />
        <Data label="supplier.taxId" value={invoice?.supplier.taxId} />
        <Data label="subtotal" value={invoice?.financial.subtotal} />
        <Data label="taxRate" value={invoice ? `${invoice.financial.taxRate}%` : undefined} />
        <Data label="taxAmount" value={invoice?.financial.taxAmount} />
        <Data label="total" value={invoice?.financial.total} />
        <Data label="confidence" value={invoice ? invoice.confidence.toFixed(2) : undefined} />
      </dl>
    </section>
  );
}

function ValidationCard({
  validation,
  invoice
}: {
  validation?: ValidationView;
  invoice?: InvoiceView;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>Validación matemática</h2>
        <p>Comparación exacta usando centavos enteros en backend.</p>
      </div>
      <div className="math-box">
        <span>subtotal + taxAmount</span>
        <strong>{validation?.subtotalPlusTaxAmount ?? "pendiente"}</strong>
      </div>
      <div className="math-box">
        <span>total</span>
        <strong>{validation?.total ?? "pendiente"}</strong>
      </div>
      <div className={`comparison ${validation?.isValid ? "ok" : "warn"}`}>
        {validation ? (validation.isValid ? "Coincide" : "No coincide") : "Esperando validación"}
      </div>
      {invoice?.validationReasons.length ? (
        <p className="reason-text">{invoice.validationReasons.join(", ")}</p>
      ) : null}
    </section>
  );
}

function Data({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value ?? "pendiente"}</dd>
    </div>
  );
}

function finalStateCopy(status: JobStatus): string {
  if (status === "APPROVED") return "APPROVED";
  if (status === "REQUIRES_REVIEW") return "Requiere revisión";
  if (status === "FAILED") return "FAILED";
  if (status === "PROCESSING") return "Procesando en background";
  if (status === "QUEUED") return "En cola";
  return "Listo para iniciar";
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}
