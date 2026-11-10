/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const base = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    ];
    return [
      {
        // Everything except the widgets refuses to be framed (clickjacking protection).
        source: "/((?!embed/).*)",
        headers: [...base, { key: "X-Frame-Options", value: "DENY" }, { key: "Content-Security-Policy", value: "frame-ancestors 'none'" }],
      },
      {
        // Widgets are made to be embedded on other sites.
        source: "/embed/:path*",
        headers: [...base, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
    ];
  },
  webpack: (config, { webpack }) => {
    // Optional deps pulled in by WalletConnect / pino that are not needed in the browser.
    config.externals.push("pino-pretty", "lokijs", "encoding");
    // Coinbase CDP SDK (via the Base Account connector) references x402 payment packages
    // that Elyport never uses; skip them instead of failing the build.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    return config;
  },
};

export default nextConfig;
