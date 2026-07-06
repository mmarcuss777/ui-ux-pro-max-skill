/** @type {import('next').NextConfig} */
const nextConfig = {
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
