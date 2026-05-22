import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SnapGuard AI",
    short_name: "SnapGuard AI",
    description: "Scam protection and financial intelligence powered by AI.",
    start_url: "/",
    display: "standalone",
    background_color: "#08101b",
    theme_color: "#08101b",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
