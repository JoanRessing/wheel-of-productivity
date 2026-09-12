Project: Wheel of Productivity

Summary
- A playful, static web app that lets users add tasks and spin a roulette wheel to choose the next task. Optional attributes per task include: time estimate, location (indoor/outdoor/any), and deadline.

Scope and Constraints
- Frontend-only. No server or database.
- TypeScript + vanilla HTML/CSS/DOM, compiled to ESM JavaScript.
- Persistence: session-only via cookies. We store a compact JSON across one or more session cookies. Data should clear with the session.
- Must be easily hostable on static hosts (GitHub Pages by default).
- Accessibility: keyboard operable, screen-reader-friendly with ARIA live announcements, supports reduced motion.

Non-goals (initial release)
- No login, analytics, or remote storage.
- No frameworks/bundlers (keep tsc-only). No CSS frameworks.

Tech choices
- TypeScript strict mode; ESM modules.
- Canvas-based wheel rendering.
- Cookie chunking to stay within per-cookie limits (~4KB; use ~3800 bytes chunks).

Conventions
- Source in /src; compiled output in /public/js; static assets in /public.
- Use semantic HTML, minimal ARIA where necessary.
- Keep functions small and pure where practical; no global mutable state outside a single app instance.
- Prefer explicit types; avoid any.

Run and build
- Open /public/index.html in a browser to use.
- With Node.js: npm ci; npm run build to compile TypeScript.

Security and privacy
- Session cookies only; random, non-sensitive values. No PII required.
- No third-party scripts.

Decision log
- 2026-09-12: Chosen TypeScript without bundler for maximum portability; deploy via GitHub Pages workflow.

Glossary
- Task: An item the user may want to complete.
- Wheel: Visual roulette that randomly selects a task.
- Session cookie: A cookie without an expiration date that is cleared when the browser session ends.
