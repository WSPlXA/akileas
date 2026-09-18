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
  "bodyClass": "docs-page"
}
---
<header class="docs-hero">…</header>
```

| Field | Meaning |
| --- | --- |
| `out` | Output path relative to `site/`, including the locale prefix. Determines the relative prefix used for all chrome links. |
| `lang` | `en`, `zh` or `ja`. Must match the directory the file lives in. Selects the chrome strings, the path prefix and the font request. |
| `nav` | Which top-level nav item is marked `aria-current`. `home`, `docs`, `privacy`. |
| `docSlug` | Docs pages only. Must match a `slug` in `LOCALES.<lang>.docs`. |
| `bodyClass` | Extra `<body>` class, e.g. `legal-page`, `docs-page`. |
| `jsonLd` | Optional object, emitted as a `application/ld+json` script. |

There is deliberately no per-page "other language" field. A page's **neutral path**
is its `out` with the locale prefix stripped (`zh/docs/benchmarks.html` →
`docs/benchmarks.html`), and the generator builds every counterpart URL, `hreflang`
alternate and language-switch link from that. Adding a locale therefore means adding
an entry to `LOCALES` and a `tools/pages/<locale>/` tree — no edits to existing pages.

Two page shapes are supported:

- **Landing / privacy pages** supply a complete `<main>…</main>` element.
- **Docs pages** supply only their inner content; the generator wraps them in the
  `<div class="shell docs-layout">` sidebar shell and gives them `<main id="main" class="docs-main">`.

The build fails loudly on a duplicate output path, a `lang` that disagrees with its
directory, or a locale that does not cover exactly the same set of neutral paths as
English — so the locales cannot silently drift apart.

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

- Locale roots: English at `/`, Simplified Chinese at `/zh/`, Japanese at `/ja/`.
  Every page exists in every locale; `hreflang` alternates for all three — plus
  `x-default` pointing at English — are emitted automatically, as is the language
  switcher in the header.
- Chrome links (nav, footer, sidebar) go through `navHref()` so they stay inside the
  current locale. Counterpart links use `base + localePath(...)` because they already
  carry a locale prefix.
- CJK locales set their own `--font-*` variables in `styles.css` (`.lang-zh`,
  `.lang-ja`) so Latin text keeps the Garamond faces while Chinese and Japanese fall
  through to a matching Song / Mincho serif. The requested CJK family is appended to
  the Google Fonts URL per locale.

## Distribution claims

Akileas ships **only** through the Microsoft Store. The site must not offer or imply
any other channel:

- No GitHub links anywhere — no download, release, source-build, issue-tracker or
  repository links in the header, footer, body copy or front-matter `jsonLd`.
- No open-source claim and no licence name. Do not state a licence unless the
  publisher supplies one.
- The only download call to action is the Microsoft Store button
  (`https://apps.microsoft.com/detail/9PF44S6NS06D`).
- The privacy page's contact section points at the Microsoft Store listing's support
  channel rather than a public issue tracker.

There is also no interface-tour chapter: the manual has three chapters (benchmarks,
why it is fast, features) and deliberately shows no application screenshots yet. The
`.shot` / `.shot-frame` styles were removed with it — re-add both together if
screenshots are reintroduced.
