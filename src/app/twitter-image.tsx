// src/app/twitter-image.tsx
import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage(): ImageResponse {
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
      <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.1 }}>Do Not Ghost Me</div>
      <div style={{ marginTop: 20, fontSize: 26, opacity: 0.9, maxWidth: 920 }}>
        Track ghosting in hiring. See patterns, not personal stories.
      </div>
      <div
        style={{
          marginTop: 34,
          fontSize: 22,
          color: "#EDEDED",
          opacity: 0.95,
        }}
      >
        www.donotghostme.com
      </div>
    </div>,
    size,
  );
}
