import { ImageResponse } from "next/og";
import { AppLogoMark } from "@/features/brand/components/app-logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS fills transparency with black and rounds the corners itself, so: solid tile, no radius.
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#171717",
        color: "#fafafa",
      }}
    >
      <AppLogoMark width={112} height={112} />
    </div>,
    size,
  );
}
