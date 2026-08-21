# ElevareFit website

The active production website is the Next.js static-export project in `website/`. Vercel is the authoritative host for `www.elevarefit.com`; `.github/workflows/deploy.yml` validates builds and does not publish GitHub Pages. The `.org` domains remain attached as permanent, path-preserving redirect domains.

## Local validation

Run these commands from `website/`:

```powershell
npm install
npm run typecheck
npm test
npm run lint
npm run build
npm run seo:audit
```

## Legal versions

See `docs/legal-versioning.md`. Do not edit generated legal archives or clean-route files directly.

## Domain migration

See `docs/domain-migration-checklist.md` before deploying or changing DNS. The code is configured for `www.elevarefit.com`, but DNS, Vercel domains, Supabase Auth, search-engine tools, and external product listings require coordinated manual changes.

## Supabase migrations

Marketplace migrations require explicit target verification. See `docs/deployment-and-migration-safety.md`. Never apply them to a linked project until the verification script confirms the intended Elevare marketplace project.

The legacy root static site is retained under `legacy-static/` for reference and is not production content.
