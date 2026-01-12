import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignorar errores de tipos en build (necesario hasta generar tipos de Supabase)
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
