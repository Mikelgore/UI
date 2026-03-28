# Technician Operations Portal UI

A flexible technician-facing web console for integrating tools (ServiceNow, Splunk, and custom APIs) and building adjustable troubleshooting dashboards.

## Bring it to life in 5 minutes

1. **Start the UI locally**
   ```bash
   python3 -m http.server 4173
   ```
2. Open **http://localhost:4173** in your browser.
3. In the UI, add one integration (for example `https://jsonplaceholder.typicode.com`).
4. Add a widget using:
   - Method: `GET`
   - Endpoint: `/todos?_limit=5`
5. Click **Refresh** on the widget to verify live API data appears.

If you want a ready-made demo workspace, import `sample-config.json` from the **Portal Config** panel.

## Local run

```bash
python3 -m http.server 4173
```

Open `http://localhost:4173`.

## Daily operator workflow

- Add one integration per platform (ServiceNow, Splunk, Datadog, etc.).
- Create focused widgets for common incidents (ticket backlog, error logs, service health).
- Tune refresh intervals based on urgency (`0` for manual-only refresh).
- Export the dashboard JSON and share with other technicians for consistent workflows.

## What this portal already supports

- Dynamic integration registry with optional API token per source.
- Flexible widgets supporting GET/POST, endpoint path, optional JSON body, and custom refresh interval.
- Polling lifecycle cleanup to avoid duplicate background requests.
- Better fetch/error handling with HTTP status messaging and non-JSON response fallback.
- Config portability via export/import JSON for quick workspace sharing.
- LocalStorage persistence for integrations and widget layout.

## Production hardening checklist (recommended)

For a real enterprise rollout, implement these next:

1. **Move secrets server-side**
   - Avoid storing API tokens in browser local storage.
   - Use a backend proxy with vault/secret manager integration.
2. **Add SSO and RBAC**
   - Integrate your IdP (Okta/Azure AD).
   - Gate integration editing vs. read-only dashboard access.
3. **Add audit logging**
   - Track who changed integrations/widgets and when.
4. **Template management**
   - Save role-based templates (NOC, SRE, Incident Commander).
5. **Reliability controls**
   - Add per-widget timeout, retry, and backoff policies.
6. **Observability for the portal**
   - Log frontend errors and request latency/failure rates.

## Troubleshooting

- **Widget shows fetch error**: verify base URL + endpoint combination is valid.
- **CORS errors in browser console**: route calls through a backend proxy.
- **No data after reload**: check browser storage settings and disabled local storage policies.

## Next extensions

- Secure token storage through a backend secret vault.
- Drag-and-drop layout and widget resizing.
- Team-specific dashboard templates (NOC, SRE, Incident Command).
