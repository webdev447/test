import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // LINE Login profile pictures
      { protocol: "https", hostname: "profile.line-scdn.net" },
      // Supabase Storage — ticket photos uploaded via /admin/tickets
      { protocol: "https", hostname: "ixcqghcvefoklpyjyoqr.supabase.co" },
    ],
  },
  // Testing through ngrok — allow it to load Next.js dev assets (HMR, etc.).
  // Update this if ngrok gives you a new subdomain.
  allowedDevOrigins: ["grimy-scabby-fiction.ngrok-free.dev"],
  experimental: {
    // Default is 1MB — a phone-camera slip photo is easily 3-8MB, which
    // would get rejected before verifyPaymentSlip even runs. The action
    // itself re-compresses the image down before forwarding it to Thunder.
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
