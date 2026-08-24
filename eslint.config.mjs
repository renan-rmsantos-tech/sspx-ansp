import nextConfig from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: ["docs/design/opendesign/**"] },
  ...nextConfig,
];

export default config;
