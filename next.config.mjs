/** @type {import('next').NextConfig} */
const nextConfig = {
  // Old /dashboard/... addresses (bookmarks, emails) keep working and land on the new short ones.
  // Listed one by one so no rule can swallow another.
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: true },
      { source: "/dashboard/receptionist", destination: "/home", permanent: true },
      { source: "/dashboard/receptionist-call-history", destination: "/call-history", permanent: true },
      { source: "/dashboard/calls", destination: "/call-history", permanent: true },
      { source: "/dashboard/outbound-call-history", destination: "/outbound", permanent: true },
      { source: "/dashboard/outbound/calls", destination: "/outbound", permanent: true },
      { source: "/dashboard/outbound", destination: "/outbound", permanent: true },
      { source: "/dashboard/leads", destination: "/leads", permanent: true },
      { source: "/dashboard/updates", destination: "/updates", permanent: true },
      { source: "/dashboard/billing", destination: "/billing", permanent: true },
      { source: "/dashboard/settings", destination: "/settings", permanent: true },
      { source: "/dashboard/transcripts", destination: "/transcripts", permanent: true },
    ];
  },
};

export default nextConfig;
