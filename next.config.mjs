/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/dashboard/outbound-call-history", destination: "/dashboard/outbound", permanent: true },
      { source: "/dashboard/outbound/calls", destination: "/dashboard/outbound", permanent: true },
    ];
  },
};

export default nextConfig;
