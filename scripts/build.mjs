import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(currentFile), "..");
const srcDir = path.join(rootDir, "src");
const dataDir = path.join(srcDir, "data");
const fragmentDir = path.join(srcDir, "fragments");
const publicDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");

const navItems = [
  { href: "/projects/", label: "Projects" },
  { href: "/writing/", label: "Writing" },
  { href: "/bookshelf/", label: "Books" },
  { href: "/collections/", label: "Collections" },
];

const bookshelfNotes = [
  {
    eyebrow: "Active shelf",
    title: "What stays close.",
    description: "A short list of books that still matter.",
  },
  {
    eyebrow: "Next",
    title: "Notes and passages.",
    description: "This page stays small until the material earns it.",
  },
];

const collectionNotes = [
  {
    eyebrow: "Collected",
    title: "Useful references.",
    description: "Objects, layouts, systems, and fragments worth keeping sorted.",
  },
  {
    eyebrow: "Rule",
    title: "Keep the signal.",
    description: "If a collection teaches nothing, it does not belong.",
  },
];

if (isDirectRun()) {
  await buildSite();
}

export async function buildSite() {
  const site = await readJson("site.json");
  const [projects, writing] = await Promise.all([
    loadEntries("projects.json"),
    loadEntries("writing.json"),
  ]);

  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(distDir, { recursive: true });
  await copyPublicAssets();
  await copyStyles();

  const pages = [
    renderPage({
      output: "index.html",
      html: renderDocument({
        site,
        pathName: "/",
        title: `${site.name} | ${site.tagline}`,
        description: site.description,
        bodyClass: "home-page",
        content: renderHomePage(site),
      }),
    }),
    renderPage({
      output: "projects/index.html",
      html: renderDocument({
        site,
        pathName: "/projects/",
        title: `Projects | ${site.name}`,
        description: "Projects by Shayan Rabbi.",
        content: renderCollectionPage({
          eyebrow: "Projects",
          title: "Projects.",
          lede: "Selected work.",
          countLabel: `${projects.length} ${pluralize(projects.length, "item")}`,
          cards: projects.map((entry) => renderEntryCard(entry, "project")),
        }),
      }),
    }),
    renderPage({
      output: "writing/index.html",
      html: renderDocument({
        site,
        pathName: "/writing/",
        title: `Writing | ${site.name}`,
        description: "Writing by Shayan Rabbi.",
        content: renderCollectionPage({
          eyebrow: "Writing",
          title: "Writing.",
          lede: "Notes and essays.",
          countLabel: `${writing.length} ${pluralize(writing.length, "entry")}`,
          cards: writing.map((entry) => renderEntryCard(entry, "writing")),
        }),
      }),
    }),
    renderPage({
      output: "bookshelf/index.html",
      html: renderDocument({
        site,
        pathName: "/bookshelf/",
        title: `Bookshelf | ${site.name}`,
        description: "Books and notes from Shayan Rabbi.",
        content: renderSimplePage({
          eyebrow: "Bookshelf",
          title: "Bookshelf.",
          lede: "What I keep close.",
          notes: bookshelfNotes,
        }),
      }),
    }),
    renderPage({
      output: "collections/index.html",
      html: renderDocument({
        site,
        pathName: "/collections/",
        title: `Collections | ${site.name}`,
        description: "Collections by Shayan Rabbi.",
        content: renderSimplePage({
          eyebrow: "Collections",
          title: "Collections.",
          lede: "Useful references.",
          notes: collectionNotes,
        }),
      }),
    }),
    renderPage({
      output: "404.html",
      html: renderDocument({
        site,
        pathName: "/404.html",
        title: `Not found | ${site.name}`,
        description: "The page you tried to open does not exist.",
        content: renderNotFoundPage(),
      }),
    }),
  ];

  for (const entry of projects) {
    pages.push(
      renderPage({
        output: `projects/${entry.slug}/index.html`,
        html: renderDocument({
          site,
          pathName: `/projects/${entry.slug}/`,
          title: `${entry.title} | Projects | ${site.name}`,
          description: entry.description,
          content: renderDetailPage({
            eyebrow: formatStatus(entry.status),
            title: entry.title,
            description: entry.description,
            metaItems: [
              formatDate(entry.publishedAt),
              ...entry.tags,
              entry.liveUrl ? renderExternalMetaLink(entry.liveUrl, "Live") : "",
              entry.repoUrl ? renderExternalMetaLink(entry.repoUrl, "Repo") : "",
            ].filter(Boolean),
            bodyHtml: entry.bodyHtml,
          }),
        }),
      }),
    );
  }

  for (const entry of writing) {
    pages.push(
      renderPage({
        output: `writing/${entry.slug}/index.html`,
        html: renderDocument({
          site,
          pathName: `/writing/${entry.slug}/`,
          title: `${entry.title} | Writing | ${site.name}`,
          description: entry.description,
          content: renderDetailPage({
            eyebrow: entry.category,
            title: entry.title,
            description: entry.description,
            metaItems: [formatDate(entry.publishedAt), entry.readingTime],
            bodyHtml: entry.bodyHtml,
          }),
        }),
      }),
    );
  }

  await Promise.all(pages.map((page) => writePage(page.output, page.html)));

  const routePaths = [
    "/",
    "/projects/",
    "/writing/",
    "/bookshelf/",
    "/collections/",
    ...projects.map((entry) => `/projects/${entry.slug}/`),
    ...writing.map((entry) => `/writing/${entry.slug}/`),
  ];

  await writePage("robots.txt", renderRobots(site));
  await writePage("sitemap.xml", renderSitemap(site, routePaths));

  console.log(`Built ${pages.length + 2} files into ${distDir}`);
}

async function readJson(fileName) {
  const filePath = path.join(dataDir, fileName);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function loadEntries(fileName) {
  const entries = await readJson(fileName);
  const hydrated = await Promise.all(
    entries.map(async (entry) => ({
      ...entry,
      bodyHtml: await fs.readFile(path.join(fragmentDir, entry.bodyFile), "utf8"),
    })),
  );

  return hydrated.sort(
    (left, right) => new Date(right.publishedAt).valueOf() - new Date(left.publishedAt).valueOf(),
  );
}

async function copyPublicAssets() {
  await fs.cp(publicDir, distDir, { recursive: true, force: true });
}

async function copyStyles() {
  const distStylesDir = path.join(distDir, "assets");
  await fs.mkdir(distStylesDir, { recursive: true });
  await fs.copyFile(path.join(srcDir, "styles", "site.css"), path.join(distStylesDir, "site.css"));
}

async function writePage(relativePath, html) {
  const targetPath = path.join(distDir, relativePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, html, "utf8");
}

function renderPage(page) {
  return page;
}

function renderDocument({ site, pathName, title, description, content, bodyClass = "" }) {
  const canonical = new URL(pathName, site.url).toString();
  const footer = pathName === "/" ? "" : renderFooter(site);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#ddd5c9" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,700&family=Public+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="/assets/site.css" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body class="${escapeHtml(bodyClass)}">
    <div class="site-shell">
      ${renderHeader(site, pathName)}
      <main class="site-main">
        ${content}
      </main>
      ${footer}
    </div>
  </body>
</html>`;
}

function renderHeader(site, pathName) {
  const currentPath = normalizePath(pathName);

  return `<header class="site-header">
    <div class="container header-row">
      <a class="brand-home" href="/" aria-label="${escapeHtml(site.name)} home">SR</a>
      <nav class="site-nav" aria-label="Primary">
        ${navItems
          .map((item) => {
            const isActive = normalizePath(item.href) === currentPath;
            const current = isActive ? ' aria-current="page"' : "";
            return `<a class="site-nav__link" href="${item.href}"${current}>${escapeHtml(item.label)}</a>`;
          })
          .join("")}
      </nav>
    </div>
  </header>`;
}

function renderFooter(site) {
  return `<footer class="site-footer">
    <div class="container footer-row">
      <p>${escapeHtml(site.footerNote)}</p>
      <div class="footer-links">
        <a href="${escapeHtml(site.githubUrl)}" target="_blank" rel="noreferrer">GitHub</a>
        <a href="${escapeHtml(site.sourceUrl)}" target="_blank" rel="noreferrer">Source</a>
      </div>
    </div>
  </footer>`;
}

function renderHomePage(site) {
  return `<section class="home-hero container">
    <a class="home-lockup" href="/projects/" aria-label="Open projects">
      <div class="home-lockup__row">
        <span class="home-lockup__line" aria-hidden="true"></span>
        <h1 class="home-name">${renderStackedName(site.name)}</h1>
      </div>
      <p class="home-tagline">${escapeHtml(site.homeTagline)}</p>
    </a>
  </section>`;
}

function renderCollectionPage({ eyebrow, title, lede, countLabel, cards }) {
  return `<section class="page-intro container">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1 class="page-title">${escapeHtml(title)}</h1>
    <p class="page-lede">${escapeHtml(lede)}</p>
    <div class="page-intro__meta">
      <span class="meta-pill">${escapeHtml(countLabel)}</span>
    </div>
  </section>
  <section class="page-section container">
    <div class="card-grid">
      ${cards.join("")}
    </div>
  </section>`;
}

function renderSimplePage({ eyebrow, title, lede, notes }) {
  return `<section class="page-intro container">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1 class="page-title">${escapeHtml(title)}</h1>
    <p class="page-lede">${escapeHtml(lede)}</p>
  </section>
  <section class="page-section container">
    <div class="note-grid">
      ${notes.map((note) => renderNoteCard(note)).join("")}
    </div>
  </section>`;
}

function renderDetailPage({ eyebrow, title, description, metaItems, bodyHtml }) {
  return `<section class="page-intro container page-intro--detail">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1 class="page-title">${escapeHtml(title)}</h1>
    <p class="page-lede">${escapeHtml(description)}</p>
    <div class="meta-row">
      ${metaItems.map((item) => `<span class="meta-pill">${item}</span>`).join("")}
    </div>
  </section>
  <article class="article-shell container">
    <div class="article surface">
      ${bodyHtml}
    </div>
  </article>`;
}

function renderNotFoundPage() {
  return `<section class="page-intro container">
    <p class="eyebrow">404</p>
    <h1 class="page-title">Not found.</h1>
    <p class="page-lede">That page is not here.</p>
    <div class="action-row">
      <a class="button" href="/">Home</a>
      <a class="button button--secondary" href="/projects/">Projects</a>
    </div>
  </section>`;
}

function renderEntryCard(entry, type) {
  const href = type === "project" ? `/projects/${entry.slug}/` : `/writing/${entry.slug}/`;
  const context = type === "project" ? formatStatus(entry.status) : entry.category;
  const support = type === "project" ? entry.tags.join(" / ") : entry.readingTime;

  return `<article class="card surface">
    <div class="card__topline">
      <span class="meta-pill">${escapeHtml(formatDate(entry.publishedAt))}</span>
      <span class="card__date">${escapeHtml(context)}</span>
    </div>
    <h2 class="card__title"><a href="${href}">${escapeHtml(entry.title)}</a></h2>
    <p class="card__description">${escapeHtml(entry.description)}</p>
    <p class="card__support">${escapeHtml(support)}</p>
  </article>`;
}

function renderNoteCard(note) {
  return `<article class="note-card surface">
    <p class="eyebrow">${escapeHtml(note.eyebrow)}</p>
    <h2>${escapeHtml(note.title)}</h2>
    <p>${escapeHtml(note.description)}</p>
  </article>`;
}

function renderExternalMetaLink(href, label) {
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function renderStackedName(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `<span>${escapeHtml(part)}</span>`)
    .join("");
}

function renderRobots(site) {
  return `User-agent: *
Allow: /

Sitemap: ${site.url}/sitemap.xml
`;
}

function renderSitemap(site, paths) {
  const urls = paths
    .map((route) => `  <url><loc>${escapeHtml(new URL(route, site.url).toString())}</loc></url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatStatus(value) {
  const labels = {
    live: "Live",
    building: "Building",
    archive: "Archive",
  };

  return labels[value] ?? value;
}

function pluralize(count, singular) {
  return count === 1 ? singular : `${singular}s`;
}

function normalizePath(value) {
  if (!value || value === "/") {
    return "/";
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isDirectRun() {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === currentFile;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
