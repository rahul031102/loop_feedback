/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Section 06: the API key must stay server-side only. Nothing in this
  // config exposes server env vars to the client bundle - only variables
  // explicitly prefixed NEXT_PUBLIC_ would be, and none are used.
};

export default nextConfig;
