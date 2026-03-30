# TheShayanRabbi.github.io

Personal website and magazine built with Astro.

## Stack

- Astro 6
- Markdown content collections
- GitHub Pages via GitHub Actions

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Structure

- `src/layouts`: page layouts
- `src/components`: shared UI pieces
- `src/pages`: routes
- `src/content`: writing and project entries
- `src/content.config.ts`: content schemas

## Learning notes

- Astro routes are file-based. `src/pages/about/index.astro` becomes `/about`.
- Shared page chrome belongs in layouts, not in each page.
- Content collections give typed frontmatter for markdown content such as projects and essays.
