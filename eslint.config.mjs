import nextPlugin from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  { ignores: ["public/sw.js", "public/workbox-*.js"] },
  ...nextPlugin,
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
