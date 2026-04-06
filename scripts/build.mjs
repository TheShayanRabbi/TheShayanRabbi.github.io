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
  { href: "/bookshelf/", label: "Bookshelf" },
  { href: "/collections/", label: "Collections" },
];

const secondaryRooms = [
  {
    href: "/bookshelf/",
    eyebrow: "Bookshelf",
    title: "Books that keep proving useful.",
    description:
      "A short shelf for titles that still shape judgment, product taste, and decision-making.",
  },
  {
    href: "/collections/",
    eyebrow: "Collections",
    title: "References worth keeping sorted.",
    description:
      "Reference sets, visual cues, product examples, and fragments with an actual reason to be grouped.",
  },
];

const bookshelfNotes = [
  {
    eyebrow: "Currently active",
    title: "A working shelf, not a vanity shelf.",
    description:
      "Only books that still influence how I think about products, infrastructure, judgment, or craft belong here.",
  },
  {
    eyebrow: "What will appear",
    title: "Notes, passages, and selective recommendations.",
    description:
      "This section will stay compact until the material earns the page. A giant dump would be lazier, not better.",
  },
];

const collectionNotes = [
  {
    eyebrow: "What belongs here",
    title: "References with a reason to stay grouped.",
    description:
      "Objects, layouts, systems, and fragments only make the cut if the grouping teaches something useful.",
  },
  {
    eyebrow: "Selection rule",
    title: "Taste needs pressure.",
    description:
      "If a collection does not sharpen judgment, it is just hoarding with a cleaner label.",
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

  const featuredWork = buildFeaturedWork(projects, writing);
  const leadFeature = featuredWork[0];
  const secondaryFeatures = featuredWork.slice(1);

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
        content: renderHomePage({ site, leadFeature, secondaryFeatures }),
      }),
    }),
    renderPage({
      output: "projects/index.html",
      html: renderDocument({
        site,
        pathName: "/projects/",
        title: `Projects | ${site.name}`,
        description: "Products, systems, and experiments by Shayan Rabbi.",
        content: renderCollectionPage({
          eyebrow: "Projects",
          title: "Products, systems, and experiments.",
          lede:
            "A compact index of work with enough structure to be useful and not so much ceremony that it starts lying.",
          countLabel: `${projects.length} ${pluralize(projects.length, "project")}`,
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
        description: "Essays, notes, and framing documents by Shayan Rabbi.",
        content: renderCollectionPage({
          eyebrow: "Writing",
          title: "Essays, notes, and framing documents.",
          lede:
            "Longer thoughts belong on stable pages. Feeds are fine for distribution, but terrible as architecture.",
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
        description: "Books, reading notes, and active references.",
        content: renderSimplePage({
          eyebrow: "Bookshelf",
          title: "Books, passages, and marginalia.",
          lede:
            "This section stays selective on purpose. Better a short shelf with a point of view than an endless list with no spine.",
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
        description: "Curated references, objects, and useful fragments.",
        content: renderSimplePage({
          eyebrow: "Collections",
          title: "Objects, references, and ordered fragments.",
          lede:
            "This is where stable reference material goes once the grouping is strong enough to justify itself in public.",
          notes: collectionNotes,
        }),
      }),
    }),
    renderPage({
      output: "404.html",
      html: renderDocument({
        site,
        pathName: "/404.html",
        title: `Page not found | ${site.name}`,
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
              entry.liveUrl ? renderExternalMetaLink(entry.liveUrl, "Live site") : "",
              entry.repoUrl ? renderExternalMetaLink(entry.repoUrl, "Repository") : "",
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

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="theme-color" content="#f5efe7" />
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
      ${renderFooter(site)}
    </div>
  </body>
</html>`;
}

function renderHeader(site, pathName) {
  const currentPath = normalizePath(pathName);

  return `<header class="site-header">
    <div class="container header-row">
      <a class="brand" href="/" aria-label="${escapeHtml(site.name)} home">
        <span class="brand__mark">SR</span>
        <span class="brand__wordmark">${escapeHtml(site.name)}</span>
      </a>
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

function renderHomePage({ site, leadFeature, secondaryFeatures }) {
  return `<section class="hero hero--home container">
    <div class="hero__copy surface">
      <p class="eyebrow">${escapeHtml(site.heroEyebrow)}</p>
      <h1 class="hero__title">${escapeHtml(site.name)}</h1>
      <p class="hero__tagline">${escapeHtml(site.tagline)}</p>
      <p class="hero__lede">${escapeHtml(site.heroIntro)}</p>
      <div class="action-row">
        <a class="button" href="/projects/">Browse projects</a>
        <a class="button button--secondary" href="/writing/">Read writing</a>
        <a class="button button--ghost" href="${escapeHtml(site.githubUrl)}" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </div>
    <div class="hero__panel">
      <img class="hero__doodle" src="/doodles/journal-greeter.svg" alt="" aria-hidden="true" width="176" height="176" />
      <article class="note-card surface">
        <p class="eyebrow">${escapeHtml(site.panelTitle)}</p>
        <p class="note-card__lede">${escapeHtml(site.heroPanel)}</p>
        <ul class="focus-list">
          ${site.focusAreas.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </article>
    </div>
  </section>

  <section class="section container">
    <div class="section-heading">
      <p class="eyebrow">Featured</p>
      <h2>Start with the pieces carrying the most signal.</h2>
      <p>Projects and essays are arranged to make the current direction obvious without drowning the page in inventory.</p>
    </div>
    <div class="feature-layout">
      ${leadFeature ? renderFeatureCard(leadFeature, "lead") : ""}
      <div class="feature-stack">
        ${secondaryFeatures.map((entry) => renderFeatureCard(entry, "compact")).join("")}
      </div>
    </div>
  </section>

  <section class="section container">
    <div class="section-heading">
      <p class="eyebrow">Working principles</p>
      <h2>How the site is being shaped.</h2>
      <p>The build is simple on purpose. The design is trying to do the same job.</p>
    </div>
    <div class="principle-grid">
      ${site.principles.map((principle) => renderPrincipleCard(principle)).join("")}
    </div>
  </section>

  <section class="section container">
    <div class="section-heading">
      <p class="eyebrow">Elsewhere</p>
      <h2>Other rooms, still intentionally quiet.</h2>
      <p>Bookshelf and collections exist, but they stay lean until the material earns more real estate.</p>
    </div>
    <div class="room-grid">
      ${secondaryRooms.map((room) => renderRoomCard(room)).join("")}
    </div>
  </section>`;
}

function renderCollectionPage({ eyebrow, title, lede, countLabel, cards }) {
  return `<section class="page-intro container">
    <p class="eyebrow">${escapeHtml(eyebrow)}</p>
    <h1 class="page-title">${escapeHtml(title)}</h1>
    <p class="page-lede">${escapeHtml(lede)}</p>
    <div class="page-intro__meta">
      <span class="meta-pill meta-pill--soft">${escapeHtml(countLabel)}</span>
    </div>
  </section>
  <section class="section container">
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
  <section class="section container">
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
    <h1 class="page-title">Page not found.</h1>
    <p class="page-lede">The page moved, never existed, or decided it had better things to do.</p>
    <div class="action-row">
      <a class="button" href="/">Return home</a>
      <a class="button button--secondary" href="/projects/">Browse projects</a>
    </div>
  </section>`;
}

function renderFeatureCard(entry, variant) {
  const classes = ["card", "surface"];

  if (variant === "lead") {
    classes.push("card--lead");
  }

  if (variant === "compact") {
    classes.push("card--compact");
  }

  return `<article class="${classes.join(" ")}">
    <div class="card__topline">
      <span class="meta-pill meta-pill--soft">${escapeHtml(entry.kind)}</span>
      <span class="card__date">${escapeHtml(entry.date)}</span>
    </div>
    <p class="card__eyebrow">${escapeHtml(entry.context)}</p>
    <h3 class="card__title"><a href="${entry.href}">${escapeHtml(entry.title)}</a></h3>
    <p class="card__description">${escapeHtml(entry.description)}</p>
    <p class="card__support">${escapeHtml(entry.support)}</p>
  </article>`;
}

function renderEntryCard(entry, type) {
  const href = type === "project" ? `/projects/${entry.slug}/` : `/writing/${entry.slug}/`;
  const context = type === "project" ? formatStatus(entry.status) : entry.category;
  const support = type === "project" ? entry.tags.join(" / ") : entry.readingTime;

  return `<article class="card surface">
    <div class="card__topline">
      <span class="meta-pill meta-pill--soft">${escapeHtml(formatDate(entry.publishedAt))}</span>
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

function renderPrincipleCard(principle) {
  return `<article class="principle-card surface">
    <p class="eyebrow">Principle</p>
    <h3>${escapeHtml(principle.title)}</h3>
    <p>${escapeHtml(principle.description)}</p>
  </article>`;
}

function renderRoomCard(room) {
  return `<article class="room-card surface">
    <p class="eyebrow">${escapeHtml(room.eyebrow)}</p>
    <h3><a href="${room.href}">${escapeHtml(room.title)}</a></h3>
    <p>${escapeHtml(room.description)}</p>
    <a class="text-link" href="${room.href}">Open section</a>
  </article>`;
}

function renderExternalMetaLink(href, label) {
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function buildFeaturedWork(projects, writing) {
  return [
    ...projects.map((entry) => ({
      kind: "Project",
      href: `/projects/${entry.slug}/`,
      title: entry.title,
      description: entry.description,
      context: formatStatus(entry.status),
      support: entry.tags.join(" / "),
      date: formatDate(entry.publishedAt),
      publishedAt: entry.publishedAt,
    })),
    ...writing.map((entry) => ({
      kind: "Writing",
      href: `/writing/${entry.slug}/`,
      title: entry.title,
      description: entry.description,
      context: entry.category,
      support: entry.readingTime,
      date: formatDate(entry.publishedAt),
      publishedAt: entry.publishedAt,
    })),
  ].sort((left, right) => new Date(right.publishedAt).valueOf() - new Date(left.publishedAt).valueOf());
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
