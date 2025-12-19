// src/app/opengraph-image.tsx
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "1200px",
        height: "600px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px",
        background: "#0f1116",
        color: "#fafafa",
      }}
    >
      <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1 }}>Do Not Ghost Me</div>
      <div style={{ marginTop: 24, fontSize: 28, opacity: 0.9, maxWidth: 900 }}>
        A privacy-aware way to track and surface ghosting in hiring processes.
      </div>
      <div
        style={{
          marginTop: 36,
          fontSize: 22,
          color: "#EDEDED",
          opacity: 0.95,
        }}
      >
        donotghostme.com
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 56,
          right: 72,
          width: 220,
          height: 10,
          borderRadius: 999,
          background: "#4f46e5",
        }}
      />
    </div>,
    size,
  );
}
