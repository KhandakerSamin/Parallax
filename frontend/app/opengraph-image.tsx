import { ImageResponse } from "next/og";

export const alt = "Parallax — See your work from every angle";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PERSPECTIVES = [
  { name: "Lexical", color: "#fbbf24", value: 0.41 },
  { name: "Semantic", color: "#a5b4fc", value: 0.86 },
  { name: "Concept", color: "#5eead4", value: 0.78 },
  { name: "Structural", color: "#fda4af", value: 0.69 },
];

/** Social preview card generated at build time. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #0b0f1a 0%, #1e1b4b 55%, #042f2e 100%)",
          color: "white",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 34, fontWeight: 700 }}>
            <div style={{ display: "flex", position: "relative", width: 48, height: 48 }}>
              <div style={{ position: "absolute", left: 0, top: 12, width: 30, height: 30, borderRadius: 8, background: "#fbbf24" }} />
              <div style={{ position: "absolute", left: 8, top: 6, width: 30, height: 30, borderRadius: 8, background: "#fda4af" }} />
              <div style={{ position: "absolute", left: 14, top: 0, width: 30, height: 30, borderRadius: 8, background: "#5eead4" }} />
              <div style={{ position: "absolute", left: 18, top: 16, width: 30, height: 30, borderRadius: 8, background: "#4f46e5" }} />
            </div>
            Parallax
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 }}>
              See your work from every angle.
            </div>
            <div style={{ marginTop: 24, fontSize: 28, color: "#cbd5e1", lineHeight: 1.4 }}>
              Lexical, semantic, concept and structural similarity for Bangla-English academic work.
            </div>
          </div>
          <div style={{ fontSize: 22, color: "#94a3b8" }}>Potential similarity, explained · DIU SE 331 Capstone</div>
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 380,
              padding: 32,
              borderRadius: 28,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, fontWeight: 600 }}>
              <span>Similarity report</span>
              <span style={{ fontSize: 16, color: "#5eead4" }}>Sample</span>
            </div>
            <div style={{ fontSize: 72, fontWeight: 700, marginTop: 12 }}>0.72</div>
            {PERSPECTIVES.map((p) => (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, fontSize: 18 }}>
                <span style={{ width: 100, color: "#cbd5e1" }}>{p.name}</span>
                <div style={{ display: "flex", flex: 1, height: 10, borderRadius: 999, background: "rgba(255,255,255,0.12)" }}>
                  <div style={{ width: `${p.value * 100}%`, height: 10, borderRadius: 999, background: p.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
