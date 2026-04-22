# 3D Models via CDN (Railway-friendly)

This project can load `.glb` models at runtime from a CDN/object store instead of bundling them into the app build.
This keeps Railway builds fast and avoids huge git checkouts.

## 1) Upload layout

Upload your models to these paths in your bucket/CDN:

- `models/legendary/*.glb`
- `models/mythic/*.glb`

Filenames must match the card ids used in code (e.g. `thanatos.glb`, `myth-kaidran` uses `hero-neutral-kaidran.glb` in our mapping).

## 2) Configure Railway (or any deploy)

Set an environment variable:

- `VITE_MODEL_CDN_BASE_URL` = base URL where the `models/` folder is served.

Examples:

- Cloudflare R2 + custom domain: `https://cdn.yourdomain.com`
- S3 behind CloudFront: `https://d1234abcd.cloudfront.net`

At runtime, the app will request URLs like:

- `https://.../models/legendary/thanatos.glb`
- `https://.../models/mythic/god-light-aurelia.glb`

## 3) Local dev

If `VITE_MODEL_CDN_BASE_URL` is not set, the app will fall back to `/models/...` (so you can also serve models from `public/models` in dev if you want).

