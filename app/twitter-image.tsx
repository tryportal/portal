import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Portal - Open Source Team Chat";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F7F7F4",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #E8E8E3 0%, transparent 50%), radial-gradient(circle at 75% 75%, #E8E8E3 0%, transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                backgroundColor: "#26251E",
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="48"
                height="48"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12 12-5.373 12-12S22.627 4 16 4zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"
                  fill="#F7F7F4"
                />
              </svg>
            </div>
            <span
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#26251E",
                letterSpacing: -2,
              }}
            >
              Portal
            </span>
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#666660",
              textAlign: "center",
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Team chat, reimagined.
          </div>
          <div
            style={{
              display: "flex",
              gap: 32,
              marginTop: 16,
              fontSize: 20,
              color: "#888880",
            }}
          >
            <span>Open Source</span>
            <span>•</span>
            <span>Privacy-First</span>
            <span>•</span>
            <span>Free Forever</span>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 24,
            color: "#999990",
          }}
        >
          tryportal.app
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
