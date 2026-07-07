/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14.2 defaults the client router cache for DYNAMIC pages to 0s,
    // which forces a full server round trip on every single tab switch —
    // that was the "blank window" between pages. 30s means hopping between
    // Today/Body/Mind/Business is instant; data still refreshes on
    // mutations (router.refresh) and after the window passes.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  // Old routes from the pre-refactor app — keep bookmarks working.
  async redirects() {
    return [
      { source: "/business", destination: "/build", permanent: false },
      { source: "/coach", destination: "/nexa", permanent: false },
      { source: "/screen", destination: "/mind", permanent: false },
    ];
  },
};

export default nextConfig;
