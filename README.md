# ElevareFit website

The active production website is the Next.js static-export project in `website/`. Vercel is the authoritative host for `www.elevarefit.org`; `.github/workflows/deploy.yml` validates builds and does not publish GitHub Pages.

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

## Supabase migrations

Marketplace migrations require explicit target verification. See `docs/deployment-and-migration-safety.md`. Never apply them to a linked project until the verification script confirms the intended Elevare marketplace project.

The legacy root static site is retained under `legacy-static/` for reference and is not production content.
