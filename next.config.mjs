const nextConfig = {
  reactCompiler: true,
  async headers() {
    if (process.env.NETLIFY !== "true") return []
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
      }
    ]
  }
};

export default nextConfig;
