import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  { ignores: ["public/sw.js", "public/workbox-*.js"] },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default config;
