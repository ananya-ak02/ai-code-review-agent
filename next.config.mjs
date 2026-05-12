/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@langchain/groq", "@langchain/core", "@supabase/supabase-js"]
  }
};

export default nextConfig;
