// Grafikkarte grob erkennen, nur für den Assistenten. Bleibt im Browser, wird nirgends hingeschickt.
// Laptops mit zwei Grafikchips melden im Browser oft den schwächeren; deshalb nur Vorauswahl, keine Entscheidung.
export type Gpu = { name: string; vendor: "nvidia" | "amd" | "intel" | "" };

export function detectGpu(): Gpu {
  let raw = "";
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      raw = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || "");
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch { /* kein WebGL: keine Erkennung */ }
  const name = raw
    .replace(/^ANGLE \([^,]+,\s*/, "")          // „ANGLE (NVIDIA, …“
    .replace(/\s*\(0x[0-9a-f]+\).*$/i, "")       // Geräte-ID und Treiber-Angaben
    .replace(/\/PCIe.*$|, or similar$/i, "")
    .replace(/\s*(Direct3D|D3D11|OpenGL|Vulkan|Metal).*$/i, "")
    .replace(/[,\s)]+$/, "").trim();
  // Intel Arc ist eine echte Spiele-Grafikkarte, keine schwache Onboard-Grafik
  const vendor = /nvidia|geforce|quadro|\brtx\b|\bgtx\b/i.test(raw) ? "nvidia"
    : /\bamd\b|radeon/i.test(raw) ? "amd"
    : /intel|iris|uhd graphics|hd graphics/i.test(raw) && !/\barc\b/i.test(raw) ? "intel" : "";
  return { name: name === "Apple GPU" || /swiftshader|llvmpipe|basic render/i.test(raw) ? "" : name, vendor };
}

/** Schwache Grafik: Onboard-/Laptop-Grafik oder „Einsteiger“ gewählt */
export const weakGpu = (w: Record<string, any>) => w.vendor === "intel" || w.gpu === "low";
