# Site tooling

The published site in `site/` is **generated**. Do not hand-edit files under `site/`
— your changes will be overwritten on the next build.

## Layout

```
tools/
  build-site.mjs        generator (no dependencies, Node 18+)
  check-links.mjs       link / anchor verifier for the generated output
  mermaid-boot.js       Mermaid bootstrap, inlined into pages that set "mermaid": true
  pages/
    en/…                English page sources
    zh/…                Chinese page sources
site/                   generated output — this is what GitHub Pages uploads
```

## Commands

```bash
node tools/build-site.mjs     # regenerate site/ from tools/pages/
node tools/check-links.mjs    # verify every internal link, asset and anchor resolves
```

Run both before committing. `check-links.mjs` exits non-zero on a broken reference,
so it works as a pre-commit or CI gate.

## Adding or editing a page

Each source file under `tools/pages/<locale>/` starts with a JSON front-matter block
followed by the page markup:

```
---
{
  "out": "docs/benchmarks.html",
  "lang": "en",
  "title": "Performance & Benchmarks — Akileas Manual",
  "description": "…",
  "nav": "docs",
  "docSlug": "benchmarks",
  "bodyClass": "docs-page",
  "mermaid": true,
  "altOut": "zh/docs/benchmarks.html"
}
---
<header class="docs-hero">…</header>
```

| Field | Meaning |
| --- | --- |
| `out` | Output path relative to `site/`. Determines the relative prefix used for all chrome links. |
| `lang` | `en` or `zh`. Selects the chrome strings and the locale path prefix. |
| `nav` | Which top-level nav item is marked `aria-current`. `home`, `docs`, `privacy`. |
| `docSlug` | Docs pages only. Must match a `slug` in `LOCALES.<lang>.docs`. |
| `bodyClass` | Extra `<body>` class, e.g. `legal-page`, `docs-page`. |
| `mermaid` | Inline the Mermaid bootstrap. Required if the page has `<pre class="mermaid">`. |
| `altOut` | Output path of the counterpart page in the other language. Drives `hreflang` and the language switch. |
| `jsonLd` | Optional object, emitted as a `application/ld+json` script. |

Two page shapes are supported:

- **Landing / privacy pages** supply a complete `<main>…</main>` element.
- **Docs pages** supply only their inner content; the generator wraps them in the
  `<div class="shell docs-layout">` sidebar shell and gives them `<main id="main" class="docs-main">`.

The build fails loudly on a duplicate output path or an `altOut` that does not
correspond to a real generated page, so the two locales cannot silently drift apart.

### Mermaid

Inside a `<pre class="mermaid">` block, escape `<`, `>` and `&` as `&lt;`, `&gt;`
and `&amp;`. A literal line-break tag is therefore written `&lt;br/&gt;`. This is
required: `<pre>` does not escape its content, so a raw tag would be parsed as HTML
and lost before Mermaid ever sees it.

Diagrams are rendered client-side from a CDN. If the import fails, the diagram source
simply stays on screen as readable text.

## Deployment

`.github/workflows/pages.yml` uploads `site/` verbatim — there is no build step in CI,
so **the generated output must be committed**. If you edit anything under
`tools/pages/`, run the build and commit the resulting `site/` changes in the same
commit, or the deployed site will not match the sources.

## Conventions

- Locale root: English lives at `/`, Chinese at `/zh/`. Every page has a counterpart;
  `hreflang` alternates (including `x-default` → English) are emitted automatically.
- All chrome links are resolved through `navHref()` so they stay inside the current
  locale; `altOut` links use `abs()` because they already carry a locale prefix.
- Screenshot assets referenced by `docs/screenshots.html` are reported by
  `check-links.mjs` as *pending* rather than broken until they are captured into
  `site/assets/screenshots/`.
