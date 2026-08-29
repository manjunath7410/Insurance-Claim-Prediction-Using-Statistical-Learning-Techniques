# Security Policy & Architectural Guardrails

---

## 1. Threat Model & Security Boundaries

| Risk Category | Threat Description | Architectural Mitigation |
| :--- | :--- | :--- |
| **Target Snooping & Data Leakage** | Contaminating pre-loss underwriting features with post-accident claims adjuster or litigation variables. | Strict feature pipeline validation; only policy attributes observable at policy inception are permitted in the inference vector. |
| **API Secret Exposure** | Leakage of Gemini or third-party API credentials to client browser bundles. | All API keys (`GEMINI_API_KEY`) are managed exclusively in Node.js server memory (`server.ts`, `src/server/config.ts`). No client-side `VITE_` prefixes are permitted. |
| **Payload Injection & Buffer Overflows** | Uploading malformed or oversized CSV files into the data layer. | Express payload body limit set to `10mb`; strict row-by-row type validation and batch record truncation (max 5,000 records). |
| **Deterministic AI Boundary Breach** | LLM hallucinating or arbitrarily altering quantitative risk scores and premium ratings. | LLM is strictly prohibited from numerical prediction. Predictions are calculated via deterministic TypeScript/Python statistical formulas; Gemini is only invoked post-prediction for natural language summarization. |
| **Non-Compliant Proxy Discrimination** | Using discriminatory variables or protected class proxies in actuarial rating. | Direct inclusion of non-actuarial variables is prevented; territorial factors are normalized by geographic traffic exposure metrics. |

---

## 2. Environment Variable Policy

* **`.env.example`**: Documents all accepted environment variables.
* **Secrets Handling**: Real secret keys are NEVER committed to version control. In Google AI Studio, secrets are injected automatically into `process.env` at container runtime.
* **Fallback Mode**: The platform automatically detects missing API keys and provides transparent deterministic actuarial rule fallbacks without crashing the application.

---

## 3. Reporting Security Vulnerabilities

To report a vulnerability or data leakage concern, please file a private issue or contact the project maintainers with a reproducible demonstration and correlation ID.
