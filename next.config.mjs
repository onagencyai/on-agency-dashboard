/** @type {import('next').NextConfig} */
const nextConfig = {
  // Old /dashboard/... addresses (bookmarks, emails) keep working and land on the new short ones.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: true },
      { source: "/dashboard/receptionist", destination: "/home", permanent: true },
      { source: "/dashboard/receptionist-call-history", destination: "/call-history", permanent: true },
      { source: "/dashboard/calls", destination: "/call-history", permanent: true },
      { source: "/dashboard/outbound-call-history", destination: "/outbound", permanent: true },
      { source: "/dashboard/outbound/calls", destination: "/outbound", permanent: true },
      { source: "/dashboard/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
