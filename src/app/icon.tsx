import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)",
          borderRadius: 4,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 14,
            fontWeight: 800,
            letterSpacing: -0.5,
            lineHeight: 1,
          }}
        >
          P16
        </span>
      </div>
    ),
    { ...size },
  )
}
