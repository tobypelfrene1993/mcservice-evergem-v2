# MC Service Evergem

Responsive website and privacy-friendly analytics platform for MC Service Evergem.

Live website: [https://mcservice-evergem.be](https://mcservice-evergem.be)

## Tech stack

- Vite
- HTML
- CSS
- JavaScript
- Python
- SQLite
- NGINX
- systemd

## Features

- Responsive company website with dedicated service, about, contact and legal pages
- Customer review carousel with responsive multi-card layouts, autoplay, keyboard navigation and mobile swipe support
- Trustpilot links for reading and writing reviews
- WhatsApp, email, phone and Trustpilot CTA tracking
- Privacy-friendly page-view and browser-session analytics
- Public, read-only `/admin/` dashboard with aggregated statistics

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

The generated production website is written to `dist/`. This directory is intentionally excluded from Git.

## Analytics architecture

The analytics backend runs server-side using Python and SQLite. The SQLite database is stored outside the public webroot and is not part of this repository. The `/admin/` page only displays aggregated statistics and does not expose individual visitor records.

The `analytics/` directory contains the backend source and safe deployment configuration. Production credentials, databases, visitor data, logs and server secrets must never be committed to Git.

## Repository safety

- Databases and visitor data are not stored in Git.
- Production credentials and environment files are not stored in Git.
- Generated builds, dependencies, logs and backups are excluded through `.gitignore`.
- Private keys and local QA/reference assets are excluded from the public repository.
