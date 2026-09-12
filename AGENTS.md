Project: Wheel of Productivity

Summary
- A playful, static web app that lets users add tasks and spin a roulette wheel to choose the next task. Optional attributes per task include: time estimate, location (indoor/outdoor/any), and deadline.

Scope and Constraints
- Frontend-only. No server or database.
- TypeScript + vanilla HTML/CSS/DOM, compiled to ESM JavaScript.
- Persistence: localStorage for non-sensitive task data. Data should remain after closing/reopening the page until the user clears tasks or browser data.
- Must be easily hostable on static hosts (GitHub Pages by default).
- Accessibility: keyboard operable, screen-reader-friendly with ARIA live announcements, supports reduced motion.

Non-goals (initial release)
- No login, analytics, or remote storage.
- No frameworks/bundlers (keep tsc-only). No CSS frameworks.

Tech choices
- TypeScript strict mode; ESM modules.
- Canvas-based wheel rendering.
- localStorage-based task persistence; keep stored data compact and non-sensitive.

Conventions
- Source in /src; compiled output in /public/js; static assets in /public.
- Use semantic HTML, minimal ARIA where necessary.
- Keep functions small and pure where practical; no global mutable state outside a single app instance.
- Prefer explicit types; avoid any.

Run and build
- Open /public/index.html in a browser to use.
- With Node.js: npm ci; npm run build to compile TypeScript.

Security and privacy
- Store only non-sensitive task data in localStorage. No PII required.
- No third-party scripts.

Decision log
- 2026-09-12: Chosen TypeScript without bundler for maximum portability; deploy via GitHub Pages workflow.
- 2026-09-12: Switched from session cookies to localStorage because tasks should persist after closing/reopening the app.

Glossary
- Task: An item the user may want to complete.
- Wheel: Visual roulette that randomly selects a task.
- localStorage: Browser storage used for persistent, device-local task data.
