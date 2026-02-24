import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["aws-jwt-verify", "mongodb"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.dev",
      },
      // Legacy Firebase Storage URLs (existing event databases may still reference these)
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "digito-poc.firebasestorage.app",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.r2.dev https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app",
              "connect-src 'self' https://*.r2.cloudflarestorage.com https://*.r2.dev https://ipapi.co https://api.sunrise-sunset.org https://cognito-idp.eu-south-1.amazonaws.com https://cognito-identity.eu-south-1.amazonaws.com https://*.amazoncognito.com https://*.auth.eu-south-1.amazoncognito.com",
              "font-src 'self'",
              "frame-src https://accounts.google.com https://*.amazoncognito.com https://*.auth.eu-south-1.amazoncognito.com",
            ].join("; "),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
