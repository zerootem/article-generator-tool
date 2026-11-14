# Official platform references used for this scaffold

- Cloudflare documents Worker Secrets as encrypted text bindings accessed by Worker code through `env`; secrets should not be stored as plaintext `vars` or committed to Git. Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Cloudflare Access documents the `Cf-Access-Jwt-Assertion` header, signing-key endpoint, issuer and audience checks, and a Workers example using `jose` with a remote JWKS. Validate JWTs: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/
- Cloudflare documents that Worker Rate Limiting bindings are approximate and local to each Cloudflare location, and may allow requests above the configured limit while counters update. Rate Limiting: https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
- Cloudflare KV supports `get(key, type?)`, where `type` may be `json`; KV reads may return stale values after writes in another location. Read key-value pairs: https://developers.cloudflare.com/kv/api/read-key-value-pairs/
- GitHub REST API allows a Pages administrator to choose `build_type: workflow` when publishing through a custom GitHub Actions workflow. Pages API: https://docs.github.com/en/rest/pages/pages

The account-specific setup and cross-origin Access behavior still need to be tested in the owner's Cloudflare account and mobile browser. The references do not imply that this Worker has been deployed or that its security configuration is active.
