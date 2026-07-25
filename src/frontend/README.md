# React + TypeScript + Vite

Frontend for the CF Budget Apps Script web app. Lint/format from the repo root via Ultracite (Biome):

```bash
npm run check   # from repo root
npm run fix
cd src/frontend && npm run lint   # proxies to root ultracite check for src/frontend
```

## Scripts

- `npm run dev` — Vite development server
- `npm run build` — type-check and build into the repository root (Apps Script HTML artifact)
- `npm run lint` — Ultracite check scoped to `src/frontend`
- `npm run preview` — Vite preview of the production build

## Plugins

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react)
- [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) — inlines the build for Apps Script HTML Service
