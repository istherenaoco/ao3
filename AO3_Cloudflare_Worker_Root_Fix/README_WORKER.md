# AO3 Cloudflare Worker — GitHub root layout

IMPORTANT: Put these items directly at the ROOT of your GitHub repository. Do NOT upload the containing project folder as a nested folder.

Expected repository root:
- wrangler.jsonc
- package.json
- src/index.js
- src/shared.js
- public/index.html
- public/ao3.html

The Wrangler config explicitly serves static assets from `./public` and routes `/api/*` through the Worker. The compatibility date is set to `2026-10-01` so it is not a future date for the deployment log shown.

## Deploy note
If your Cloudflare build root is already set to `AO3_Cloudflare_Worker_Root_Fix`, replace the contents of that folder with these files and keep that Root directory setting. The key fix from the prior failed deployment is `compatibility_date: "2026-10-01"`.

## Cloudflare Workers Builds
- Repository: your AO3 GitHub repo
- Production branch: `main`
- Root directory: leave blank (because `wrangler.jsonc` is at the repo root)
- Build command: `exit 0` (or leave blank if your dashboard allows it)
- Deploy command: `npx wrangler deploy`

If your repo currently contains only a folder such as `AO3_Cloudflare_Pages_Ready/`, Wrangler will run from the repository root and won't find this project's `wrangler.jsonc` or `public/`. Upload the CONTENTS of this ZIP to the repository root, not the enclosing folder.

Keep API keys out of GitHub. Configure `GROQ_API_KEY`, `AZURE_TRANSLATOR_KEY`, and `AZURE_TRANSLATOR_REGION` under the existing Worker’s Settings > Variables & Secrets. Gemini is currently managed by the browser app settings.

After deployment, test: https://YOUR-WORKER.workers.dev/api/status
