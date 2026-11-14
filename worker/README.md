# Article Generator Worker

This Worker is a **local implementation scaffold only**. It has not been connected to a Cloudflare account, deployed, or tested against a live Access application. The GitHub Pages site does not gain a working secure backend until the account-specific configuration below is completed and verified.

The Worker provides `/api/generate`, `/api/admin/status`, and `/api/admin/settings`. Every route except the basic health response requires a verified Cloudflare Access JWT whose `email` matches the configured owner. The provider key is read only from the `AI_PROVIDER_API_KEY` Worker secret and is never returned to the browser. The model is restricted to `AI_MODEL` or the JSON array in `AI_ALLOWED_MODELS`. Settings saved through the admin endpoint contain only the model ID, not secrets. Requests fail closed if the secret, KV namespace, or rate-limit binding is unavailable.

## Account details still required

Before deployment, the owner must create a Cloudflare Zero Trust Access application in front of the Worker API and determine the team domain, the application's AUD tag, the exact owner email to allow, and the Worker endpoint name. The Access policy should admit only the owner. Set the GitHub Pages origin in `ALLOWED_ORIGINS`; the default assumes the public site is served from `https://zerootem.github.io`.

Create a KV namespace for `AI_SETTINGS`, then replace the placeholder namespace ID in `wrangler.toml`. The rate-limit `namespace_id` must be unique within the Cloudflare account; choose an unused integer. Cloudflare's Worker rate limiting is approximate and local to each Cloudflare location, so it is not a strict global spending cap. Configure separate provider-side billing limits and alerts.

Set `TEAM_DOMAIN`, `POLICY_AUD`, `ADMIN_EMAIL`, `ALLOWED_ORIGINS`, `AI_MODEL`, and `AI_ALLOWED_MODELS` in Wrangler configuration or the Cloudflare dashboard. Do not enter secrets into `vars`, Git, this README, or chat. Store the provider key using the Cloudflare dashboard's **Secret** type or run `npx wrangler secret put AI_PROVIDER_API_KEY` in a properly authenticated local shell. The `.gitignore` excludes `.dev.vars*` and `.env*`; never commit local secret files.

The frontend's Worker URL is a public endpoint setting, not a credential. After deploying and validating the Worker, set `VITE_WORKER_URL=https://<your-worker-domain>` in a local `.env.production.local` file or the build environment, then build. The website will leave the secure Worker option disabled when the URL is absent. The frontend does not receive a provider key.

## Cross-origin Access note

The static website and Worker are separate origins. The frontend sends JSON request bodies as `text/plain` to avoid an unnecessary JSON preflight; the Worker parses the body as JSON and still checks the exact `Origin` plus the verified Access assertion. Use only the configured website origin, and do not add wildcard CORS or bypass Access for API routes. The owner may need to authenticate by visiting the Worker origin first. Test the Access cookie and CORS behavior in Chrome on the target phone before enabling this mode, because browser third-party-cookie settings can affect a cross-origin login flow.

## Local checks and later deployment

From the repository root, run `npm test` and `npm run build`. For a local Worker session, install Wrangler as a development dependency, configure local secrets outside Git, and use `npx wrangler dev --config worker/wrangler.toml`. The live Worker is not active until the owner completes account linking, configures Access, creates the KV binding, sets the secret, deploys, and tests authenticated and unauthenticated requests.

## Security boundaries

Cloudflare Access and the Worker secure the shared provider secret from the public frontend only after they are correctly configured. This scaffold does not make the legacy per-user API-key mode safe from browser extensions, injected scripts, compromised devices, or malicious same-origin code. User-owned client-side keys are protected at rest with password-derived AES-GCM after the lock is opened, but any unlocked browser application can use those keys. Puter remains a separate user-pays cloud integration.

The application enforces an exact origin allowlist and verifies the JWT signature, issuer, audience and owner email. It caps request size and prompt length, uses a fixed upstream URL, limits models, sets a timeout, avoids logging prompts or keys, and returns generic errors. The Cloudflare Rate Limiting binding is approximate; it supplements, but does not replace, provider billing controls.
