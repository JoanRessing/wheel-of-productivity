# Wheel of Productivity

A playful roulette wheel web app to help you decide which task to do next. Add tasks with optional parameters, spin the wheel, and let fate choose your chore.

Key points
- Static site (no backend) built with TypeScript and vanilla HTML/CSS.
- Session-only persistence via cookies (data clears when the browser session ends).
- Accessible UI with keyboard support and ARIA live announcements.
- Ready for GitHub Pages hosting.

Preview
- Open public/index.html in your browser to try the app locally. The repository also contains prebuilt JavaScript in public/js so you can run without a toolchain.

Local development
- Edit TypeScript in src/ and HTML/CSS in public/.
- If you have Node.js installed, you can rebuild the JS output:
  1) npm ci
  2) npm run build
  This compiles TypeScript from src/ to public/js.

Hosting on GitHub Pages
- The repository includes a GitHub Actions workflow that builds and deploys the site from the main branch.
  1) Push to GitHub.
  2) In your repository settings, enable GitHub Pages and choose "GitHub Actions" for the source (if not auto-enabled).
  3) The workflow compiles TypeScript and publishes the public/ directory.

Data and privacy
- Tasks are stored only in session cookies. Cookies are session-only (no expiration set) and cleared when the session ends.
- No analytics or tracking.

Planned enhancements
- Filters by time/location/deadline at spin time.
- Optional per-task weights.
- Export/import tasks.
- PWA support.
