# Site tooling

The published site in `site/` is **generated**. Do not hand-edit files under `site/`
— your changes will be overwritten on the next build.

## Layout

```
tools/
  build-site.mjs        generator (no dependencies, Node 18+)
  check-links.mjs       link / anchor verifier for the generated output
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
| `altOut` | Output path of the counterpart page in the other language. Drives `hreflang` and the language switch. |
| `jsonLd` | Optional object, emitted as a `application/ld+json` script. |

Two page shapes are supported:

- **Landing / privacy pages** supply a complete `<main>…</main>` element.
- **Docs pages** supply only their inner content; the generator wraps them in the
  `<div class="shell docs-layout">` sidebar shell and gives them `<main id="main" class="docs-main">`.

The build fails loudly on a duplicate output path or an `altOut` that does not
correspond to a real generated page, so the two locales cannot silently drift apart.

### Diagrams

Diagrams are plain HTML/CSS, not a diagramming library — see the `.diagram` /
`.dgm-*` rules in `site/styles.css`. Three shapes are available:

| Wrapper | Use |
| --- | --- |
| `<ol class="dgm-flow">` | Linear sequence of steps with connectors between them. |
| `<div class="dgm-lanes">` | Two parallel lanes (e.g. what happens now vs. in the background). |
| `<div class="dgm-split">` | Fan-out and merge: a source pill, `.dgm-branches`, then a result pill. |
| `<div class="dgm-bars">` | Labelled comparison bars; set the width with `style="--w: 42%"`. |

Keeping diagrams as markup means the text stays crisp at every width, the styling
matches the rest of the site, and there is no runtime dependency that can fail.

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
