import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "Pasterova 16 — Stambena zajednica"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 60%, #1e1b4b 100%)",
          position: "relative",
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Icon badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 96,
            height: 96,
            borderRadius: 20,
            background: "rgba(255,255,255,0.12)",
            border: "1.5px solid rgba(255,255,255,0.2)",
            marginBottom: 36,
          }}
        >
          <span
            style={{
              color: "white",
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: -1,
              lineHeight: 1,
            }}
          >
            P16
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            color: "white",
            fontSize: 80,
            fontWeight: 800,
            letterSpacing: -3,
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          Pasterova 16
        </div>

        {/* Divider */}
        <div
          style={{
            width: 64,
            height: 3,
            borderRadius: 2,
            background: "rgba(255,255,255,0.3)",
            marginBottom: 20,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            color: "rgba(255,255,255,0.65)",
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Stambena zajednica
        </div>
      </div>
    ),
    { ...size },
  )
}
