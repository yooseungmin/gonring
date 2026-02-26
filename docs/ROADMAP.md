# Roadmap

## Phase 1: Product-Ready Core

1. Introduce real LLM provider layer with retry, timeout, and tracing.
2. Add prompt/response audit logging with PII masking.
3. Implement approve/reject flow for each rewrite suggestion.

## Phase 2: HWP Reliability

1. Replace clipboard-based IO with direct HWP action APIs where available.
2. Add compatibility matrix by HWP version and Windows policy.
3. Add recovery UX for COM errors, document lock, and selection loss.

## Phase 3: Commercial Readiness

1. Installer/update pipeline with signed binaries.
2. Operational telemetry and crash reporting.
3. Security review, secrets management, and usage policy enforcement.
