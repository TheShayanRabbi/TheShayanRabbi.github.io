# TheShayanRabbi.github.io

Personal website generated with a small Node build script and deployed to GitHub Pages.

## Stack

- npm for scripts
- JSON for structured content metadata
- HTML fragments for long-form page bodies
- One shared CSS file for layout and styling
- GitHub Pages via GitHub Actions

## Commands

```bash
npm install
npm run build
npm run dev
npm run preview
```

- `npm run dev`: watch mode with rebuilds, local server, and browser reload
- `npm run watch`: rebuild on change without starting the server
- `npm run preview`: serve the existing `dist` output without watch mode

## Structure

- `scripts/build.mjs`: generates the static site into `dist`
- `scripts/serve.mjs`: tiny local preview server for `dist`
- `src/data`: site, project, and writing metadata in JSON
- `src/fragments`: HTML fragments for project and writing bodies
- `src/styles/site.css`: shared site styling
- `public`: files copied straight into the final site

## Why this rewrite

The previous Astro setup worked, but it was more framework than this site currently needs.
This version keeps the site explicit and easy to edit:

- no framework router
- no content collection layer
- no hidden build behavior
- plain static output that is easy to inspect before deploy

## Editing flow

Most content edits happen in:

- `src/data/*.json` for titles, descriptions, dates, and metadata
- `src/fragments/**/*` for page body copy
- `src/styles/site.css` for layout and visual hierarchy

That is the whole point: fewer hiding places, fewer moving parts, less nonsense.
