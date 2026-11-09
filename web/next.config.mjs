/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
