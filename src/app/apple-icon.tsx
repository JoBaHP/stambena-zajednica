import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 92,
          fontWeight: 700,
          letterSpacing: -3,
          background: "linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)",
          borderRadius: 36,
        }}
      >
        P16
      </div>
    ),
    { ...size },
  )
}
