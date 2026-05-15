import { ImageResponse } from "next/og"

export const size = { width: 512, height: 512 }
export const contentType = "image/png"

export default function Icon512() {
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
          borderRadius: 100,
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 230,
            fontWeight: 800,
            letterSpacing: -8,
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
