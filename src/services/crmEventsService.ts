// Thin wrapper around src/lib/crm-events.ts so future callers depend on a stable
// service surface even if the underlying implementation moves to the backend.
export { handleCRMEvent, isConversionStage } from "@/lib/crm-events";
export type { } from "@/lib/crm-events";
