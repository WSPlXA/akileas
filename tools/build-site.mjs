// Static site generator for the Akileas site.
//
//   node tools/build-site.mjs
//
// Source of truth: tools/pages/<locale>/<name>.html
// Each source file is a small JSON front-matter block followed by page markup.
// Landing / privacy pages supply a complete <main> element; docs pages supply
// only their inner content and the generator wraps them in the docs shell.
// Output goes to site/, which GitHub Pages uploads verbatim.
//
// Locales mirror each other one-for-one: a page at docs/benchmarks.html exists
// at docs/benchmarks.html (en), zh/docs/benchmarks.html and ja/docs/benchmarks.html.
// Counterpart URLs, hreflang alternates and the language switcher are all derived
// from that shared "neutral" path, so adding a locale needs no per-page fields.
//
// No dependencies. Node 18+.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "site");
const PAGES = join(ROOT, "tools", "pages");

const ORIGIN = "https://wsplxa.github.io/akileas";

// Google Fonts request. Each locale appends the CJK serif it needs so Latin
// text keeps the Garamond faces and CJK falls through to a matching Mincho /
// Song serif instead of whatever the system happens to pick.
const FONT_BASE =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900" +
  "&family=Cormorant+Garamond:ital,wght@0,300..700;1,300..700" +
  "&family=EB+Garamond:ital,wght@0,400..800;1,400..800" +
  "&family=GFS+Didot" +
  "&family=JetBrains+Mono:wght@400;500;600;700";

// ---------------------------------------------------------------------------
// Locales
// ---------------------------------------------------------------------------

const LOCALES = {
  en: {
    htmlLang: "en",
    hreflang: "en",
    prefix: "",
    label: "EN",
    fontExtra: "",
    skip: "Skip to content",
    brandAlt: "Akileas home",
    langAria: "Language",
    nav: [
      { key: "vision", label: "Philosophy", href: "#vision" },
      { key: "features", label: "Features", href: "#features" },
      { key: "specs", label: "Capabilities", href: "#tech-specs" },
      { key: "architecture", label: "Architecture", href: "#architecture" },
      { key: "docs", label: "Manual", href: "docs/" },
      { key: "privacy", label: "Privacy", href: "privacy.html" },
    ],
    sidebarTitle: "Technical Manual",
    sidebarBack: "Back to overview",
    footerTagline: "Swift-footed performance. Native Markdown desktop editor.",
    footerNav: [
      { label: "Privacy Policy", href: "privacy.html" },
      { label: "Manual", href: "docs/" },
    ],
    docs: [
      { slug: "", num: "§", label: "Overview" },
      { slug: "benchmarks", num: "I", label: "Benchmarks" },
      { slug: "architecture", num: "II", label: "How it's fast" },
      { slug: "features", num: "III", label: "Features" },
    ],
  },

  zh: {
    htmlLang: "zh-Hans",
    hreflang: "zh-Hans",
    prefix: "zh/",
    label: "中文",
    fontExtra: "&family=Noto+Serif+SC:wght@400;600;700",
    skip: "跳到主要内容",
    brandAlt: "Akileas 首页",
    langAria: "语言",
    nav: [
      { key: "vision", label: "设计理念", href: "#vision" },
      { key: "features", label: "功能特性", href: "#features" },
      { key: "specs", label: "技术细节", href: "#tech-specs" },
      { key: "architecture", label: "系统架构", href: "#architecture" },
      { key: "docs", label: "技术手册", href: "docs/" },
      { key: "privacy", label: "隐私政策", href: "privacy.html" },
    ],
    sidebarTitle: "技术手册",
    sidebarBack: "返回产品总览",
    footerTagline: "疾步如飞的性能。原生 Markdown 桌面编辑器。",
    footerNav: [
      { label: "隐私政策", href: "privacy.html" },
      { label: "技术手册", href: "docs/" },
    ],
    docs: [
      { slug: "", num: "§", label: "总览" },
      { slug: "benchmarks", num: "一", label: "性能基准" },
      { slug: "architecture", num: "二", label: "为什么这么快" },
      { slug: "features", num: "三", label: "功能全景" },
    ],
  },

  ja: {
    htmlLang: "ja",
    hreflang: "ja",
    prefix: "ja/",
    label: "日本語",
    fontExtra: "&family=Noto+Serif+JP:wght@400;600;700",
    skip: "コンテンツへスキップ",
    brandAlt: "Akileas ホーム",
    langAria: "言語",
    nav: [
      { key: "vision", label: "設計思想", href: "#vision" },
      { key: "features", label: "機能", href: "#features" },
      { key: "specs", label: "詳細仕様", href: "#tech-specs" },
      { key: "architecture", label: "アーキテクチャ", href: "#architecture" },
      { key: "docs", label: "マニュアル", href: "docs/" },
      { key: "privacy", label: "プライバシー", href: "privacy.html" },
    ],
    sidebarTitle: "テクニカルマニュアル",
    sidebarBack: "概要に戻る",
    footerTagline: "疾走する性能。ネイティブ Markdown デスクトップエディタ。",
    footerNav: [
      { label: "プライバシーポリシー", href: "privacy.html" },
      { label: "マニュアル", href: "docs/" },
    ],
    docs: [
      { slug: "", num: "§", label: "概要" },
      { slug: "benchmarks", num: "I", label: "ベンチマーク" },
      { slug: "architecture", num: "II", label: "高速化の仕組み" },
      { slug: "features", num: "III", label: "機能ガイド" },
    ],
  },
};

const LOCALE_CODES = Object.keys(LOCALES);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Relative prefix ("./", "../", …) walking from an output path back to the site root. */
function baseFor(outPath) {
  const depth = outPath.split("/").length - 1;
  return depth === 0 ? "./" : "../".repeat(depth);
}

/** Strip a locale prefix, leaving the path shared by every locale. */
function neutralFor(outPath, locale) {
  const prefix = LOCALES[locale].prefix;
  return prefix && outPath.startsWith(prefix) ? outPath.slice(prefix.length) : outPath;
}

/** Site-root-relative path for a locale's copy of a page, using clean directory URLs. */
function localePath(locale, neutral) {
  const trimmed = neutral.endsWith("index.html") ? neutral.slice(0, -"index.html".length) : neutral;
  return LOCALES[locale].prefix + trimmed;
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Resolve a site-root-relative href (or in-page anchor) against a page's base prefix. */
function abs(base, href) {
  return /^https?:/.test(href) ? href : base + href;
}

/**
 * Resolve a chrome link (nav / footer) against the page's base prefix AND the
 * current locale's directory. Anchors and absolute URLs pass through untouched.
 */
function navHref(base, t, href) {
  if (/^https?:/.test(href)) return href;
  if (href.startsWith("#")) return base + href;
  return base + t.prefix + href;
}

function indent(text, n) {
  const pad = " ".repeat(n);
  return text
    .split("\n")
    .map((l) => (l.trim() === "" ? "" : pad + l))
    .join("\n");
}

function parseSource(text, file) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) throw new Error(`${file}: missing JSON front matter`);
  let meta;
  try {
    meta = JSON.parse(m[1]);
  } catch (e) {
    throw new Error(`${file}: front matter is not valid JSON — ${e.message}`);
  }
  if (meta.altOut) {
    throw new Error(
      `${file}: "altOut" is obsolete — counterpart URLs are derived from the locale prefix. Remove it.`,
    );
  }
  return { meta, body: text.slice(m[0].length).trim() };
}

// ---------------------------------------------------------------------------
// Shell rendering
// ---------------------------------------------------------------------------

function renderHead(meta, base, t, neutral) {
  const canonical = `${ORIGIN}/${localePath(meta.lang, neutral)}`;
  const alternates = [
    ...LOCALE_CODES.map(
      (code) =>
        `    <link rel="alternate" hreflang="${LOCALES[code].hreflang}" href="${ORIGIN}/${localePath(code, neutral)}" />`,
    ),
    `    <link rel="alternate" hreflang="x-default" href="${ORIGIN}/${localePath("en", neutral)}" />`,
  ].join("\n");

  const ogImage = `${ORIGIN}/assets/og.png`;
  const ogLocale = { en: "en_US", zh: "zh_CN", ja: "ja_JP" }[meta.lang] || "en_US";
  const jsonLd = meta.jsonLd
    ? `\n    <script type="application/ld+json">\n${indent(JSON.stringify(meta.jsonLd, null, 2), 6)}\n    </script>`
    : "";

  return `    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#f1e6cf" />
    <meta name="description" content="${esc(meta.description)}" />
    <link rel="canonical" href="${canonical}" />
${alternates}
    <link rel="icon" type="image/png" href="${base}assets/akileas-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="${FONT_BASE}${t.fontExtra}&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="${base}styles.css" />

    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Akileas" />
    <meta property="og:locale" content="${ogLocale}" />
    <meta property="og:title" content="${esc(meta.title)}" />
    <meta property="og:description" content="${esc(meta.description)}" />
    <meta property="og:url" content="${canonical}" />
    <meta property="og:image" content="${ogImage}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(meta.title)}" />
    <meta name="twitter:description" content="${esc(meta.description)}" />
    <meta name="twitter:image" content="${ogImage}" />

    <title>${esc(meta.title)}</title>${jsonLd}`;
}

function renderLangSwitch(meta, base, t, neutral) {
  const items = LOCALE_CODES.map((code) => {
    const L = LOCALES[code];
    if (code === meta.lang) {
      return `            <span class="lang-current" aria-current="true">${esc(L.label)}</span>`;
    }
    const href = base + localePath(code, neutral);
    return `            <a href="${href}" hreflang="${L.hreflang}" lang="${L.htmlLang}">${esc(L.label)}</a>`;
  }).join("\n");

  return `          <span class="lang-switch" role="group" aria-label="${esc(t.langAria)}">
${items}
          </span>`;
}

function renderHeader(meta, base, t, neutral) {
  const links = t.nav
    .map((item) => {
      const current = item.key === meta.nav ? ' aria-current="page"' : "";
      const cls = item.href.startsWith("#") ? ' class="nav-anchor"' : "";
      return `          <a href="${navHref(base, t, item.href)}"${cls}${current}>${esc(item.label)}</a>`;
    })
    .join("\n");

  return `    <header class="site-header">
      <div class="shell nav-shell">
        <a class="brand" href="${base + t.prefix}" aria-label="${esc(t.brandAlt)}">
          <img src="${base}assets/akileas-icon.png" width="38" height="38" alt="Akileas icon" />
          <span>Akileas</span>
        </a>
        <nav aria-label="Primary">
${links}
${renderLangSwitch(meta, base, t, neutral)}
        </nav>
      </div>
    </header>`;
}

function renderDocsSidebar(meta, base, t) {
  // Every docs page sits in its own locale's docs/ directory, so sibling links
  // are always same-directory links.
  const items = t.docs
    .map((d) => {
      const href = d.slug ? `${d.slug}.html` : "./";
      const current = d.slug === (meta.docSlug || "") ? ' aria-current="page"' : "";
      return `          <li>
            <a href="${href}"${current}>
              <span class="docs-nav-num" aria-hidden="true">${d.num}</span>
              <span>${esc(d.label)}</span>
            </a>
          </li>`;
    })
    .join("\n");

  return `      <aside class="docs-sidebar" aria-label="${esc(t.sidebarTitle)}">
        <p class="docs-sidebar-title">${esc(t.sidebarTitle)}</p>
        <ol class="docs-nav">
${items}
        </ol>
        <a class="docs-sidebar-back" href="${base + t.prefix}"><span aria-hidden="true">←</span> ${esc(t.sidebarBack)}</a>
      </aside>`;
}

function renderFooter(base, t) {
  const links = t.footerNav
    .map((l) => `          <a href="${navHref(base, t, l.href)}">${esc(l.label)}</a>`)
    .join("\n");
  return `    <footer>
      <div class="shell footer-inner">
        <a class="brand" href="${base + t.prefix}" aria-label="Akileas">
          <img src="${base}assets/akileas-icon.png" width="30" height="30" alt="Akileas icon" />
          <span>Akileas</span>
        </a>
        <p>${esc(t.footerTagline)}</p>
        <nav aria-label="Footer">
${links}
        </nav>
      </div>
    </footer>`;
}

function renderPage(meta, body, neutral) {
  const t = LOCALES[meta.lang];
  const base = baseFor(meta.out);
  const bodyClass = [meta.bodyClass, `lang-${meta.lang}`].filter(Boolean).join(" ");

  let main;
  if (meta.nav === "docs") {
    main = `    <div class="shell docs-layout">
${renderDocsSidebar(meta, base, t)}
      <main id="main" class="docs-main">
${indent(body, 8)}
      </main>
    </div>`;
  } else {
    main = indent(body, 4);
  }

  return `<!doctype html>
<html lang="${t.htmlLang}">
  <head>
${renderHead(meta, base, t, neutral)}
  </head>
  <body class="${bodyClass}">
    <a class="skip-link" href="#main">${esc(t.skip)}</a>

${renderHeader(meta, base, t, neutral)}

${main}

${renderFooter(base, t)}
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".html")) out.push(p);
  }
  return out;
}

const sources = [];
for (const locale of LOCALE_CODES) {
  const dir = join(PAGES, locale);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const { meta, body } = parseSource(readFileSync(file, "utf8"), relative(ROOT, file));
    meta.lang = meta.lang || locale;
    if (meta.lang !== locale) {
      throw new Error(`${relative(ROOT, file)}: lang "${meta.lang}" does not match its ${locale}/ directory`);
    }
    sources.push({ file, meta, body, neutral: neutralFor(meta.out, locale) });
  }
}

if (sources.length === 0) throw new Error("no page sources found under tools/pages/");

const seenOut = new Set();
for (const s of sources) {
  if (seenOut.has(s.meta.out)) throw new Error(`duplicate output path: ${s.meta.out}`);
  seenOut.add(s.meta.out);
}

// Every locale must cover exactly the same set of pages.
const byLocale = new Map(LOCALE_CODES.map((c) => [c, new Set()]));
for (const s of sources) byLocale.get(s.meta.lang).add(s.neutral);

const reference = byLocale.get("en");
for (const [code, set] of byLocale) {
  const missing = [...reference].filter((p) => !set.has(p));
  const extra = [...set].filter((p) => !reference.has(p));
  if (missing.length) throw new Error(`locale "${code}" is missing: ${missing.join(", ")}`);
  if (extra.length) throw new Error(`locale "${code}" has pages English lacks: ${extra.join(", ")}`);
}

const outputs = new Set(sources.map((s) => s.meta.out));
for (const s of sources) {
  for (const code of LOCALE_CODES) {
    const counterpart = localePath(code, s.neutral).replace(/\/$/, "/index.html") || "index.html";
    if (!outputs.has(counterpart)) {
      throw new Error(`${s.meta.out}: counterpart for "${code}" (${counterpart}) is not generated`);
    }
  }
}

for (const s of sources) {
  const outFile = join(SITE, ...s.meta.out.split("/"));
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, renderPage(s.meta, s.body, s.neutral), "utf8");
  console.log(`  ${s.meta.out.padEnd(32)} ← ${relative(ROOT, s.file).split(sep).join("/")}`);
}

// ---------------------------------------------------------------------------
// sitemap.xml
// ---------------------------------------------------------------------------

const today = new Date().toISOString().slice(0, 10);
const entries = sources
  .slice()
  .sort((a, b) => a.meta.out.localeCompare(b.meta.out))
  .map((s) => {
    const alts = [
      ...LOCALE_CODES.map(
        (code) =>
          `    <xhtml:link rel="alternate" hreflang="${LOCALES[code].hreflang}" href="${ORIGIN}/${localePath(code, s.neutral)}" />`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}/${localePath("en", s.neutral)}" />`,
    ].join("\n");
    const priority = /^(zh\/|ja\/)?index\.html$/.test(s.meta.out) ? "1.0" : "0.7";
    return `  <url>
    <loc>${ORIGIN}/${localePath(s.meta.lang, s.neutral)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${priority}</priority>
${alts}
  </url>`;
  })
  .join("\n");

writeFileSync(
  join(SITE, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
</urlset>
`,
  "utf8",
);

console.log(
  `\nBuilt ${sources.length} pages across ${LOCALE_CODES.length} locales + sitemap.xml → site/`,
);
