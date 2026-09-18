// Mermaid bootstrap, inlined by tools/build-site.mjs into pages that contain
// diagrams. The CDN import is intentionally unguarded: if it fails, the source
// inside each <pre class="mermaid"> simply stays on screen as readable text.
import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

const nodes = document.querySelectorAll("pre.mermaid");
if (nodes.length) {
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    fontFamily: '"EB Garamond", "Cormorant Garamond", Garamond, Georgia, serif',
    fontSize: 17,
    themeVariables: {
      background: "#fdf8ec",
      primaryColor: "#f8f1e0",
      primaryTextColor: "#241d12",
      primaryBorderColor: "#bda87c",
      secondaryColor: "#ece0c6",
      secondaryTextColor: "#241d12",
      secondaryBorderColor: "#bda87c",
      tertiaryColor: "#f1e6cf",
      tertiaryTextColor: "#241d12",
      tertiaryBorderColor: "#bda87c",
      lineColor: "#8a6a2a",
      textColor: "#241d12",
      mainBkg: "#f8f1e0",
      nodeBorder: "#bda87c",
      clusterBkg: "#f2e8d5",
      clusterBorder: "#bda87c",
      edgeLabelBackground: "#fdf8ec",
      actorBkg: "#f8f1e0",
      actorBorder: "#bda87c",
      actorTextColor: "#241d12",
      actorLineColor: "#bda87c",
      signalColor: "#5f5138",
      signalTextColor: "#241d12",
      labelBoxBkgColor: "#f8f1e0",
      labelBoxBorderColor: "#bda87c",
      labelTextColor: "#241d12",
      loopTextColor: "#241d12",
      noteBkgColor: "#f6ecd2",
      noteBorderColor: "#a5813a",
      noteTextColor: "#241d12",
      activationBkgColor: "#ece0c6",
      activationBorderColor: "#a5813a",
      sequenceNumberColor: "#fdf8ec",
      pie1: "#2b4d7d",
      pie2: "#a5813a",
      pie3: "#4d6b4a",
      pie4: "#9c4230",
      pieOpacity: "0.85",
    },
    flowchart: { curve: "basis", htmlLabels: true, padding: 14, useMaxWidth: true },
    sequence: { useMaxWidth: true, mirrorActors: false, actorMargin: 60, boxMargin: 10 },
    pie: { useMaxWidth: true, textPosition: 0.62 },
  });

  try {
    await mermaid.run({ nodes });
  } catch (err) {
    console.warn("[akileas] mermaid render failed; showing diagram source instead.", err);
  }
}
