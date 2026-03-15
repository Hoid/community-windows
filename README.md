# Community Windows

Community Windows is an open standard and toolset for fediverse instances to voluntarily publish a curated, self-described profile of their community.

This project is a work in progress, but it works and could be improved by anyone who has ideas on how to do so! If you have thoughts, please feel free to use the Issues section above or message me directly on Bluesky (which is in on my profile here).

Rather than relying on third-party scraping or indexing, instance admins use a simple admin interface to craft a snapshot of what their community is about; its culture, tone, topic focus, and other qualitative signals. This gets served at a standardized `/.well-known/community-window` endpoint on their instance. A default display interface renders this information as an attractive, human-readable landing page, while the underlying JSON format allows aggregators and discovery tools to build opt-in fediverse directories. The goal is to help with the fediverse's discoverability problem without compromising the community autonomy and privacy that make the fediverse worth joining in the first place.

This repository is split into two projects:

- `window-file`: Python/FastAPI service (with `uv`) that serves the canonical `/.well-known/community-window` JSON and a local admin UI.
- `window-ui`: Separate JavaScript storefront SPA that fetches and renders a Community Window endpoint.

## Run window-file

```bash
cd window-file
make build
make validate-schema
make dev
```

If you want to run the app without `--reload`, you can use this instead:

```bash
make serve
```

Then open:

- `http://127.0.0.1:8000/.well-known/community-window`
- `http://127.0.0.1:8000/admin`


## Run storefront window-ui

```bash
cd window-ui
npm install
cp .env.example .env
npm run dev
```

The storefront defaults to `/.well-known/community-window`. Set `VITE_WINDOW_ENDPOINT` in `.env` to point at another instance.

## Tests

```bash
cd window-file
make test
```

Frontend smoke checks:

```bash
cd window-file/admin-ui && npm run smoke
cd window-ui && npm run smoke
```
