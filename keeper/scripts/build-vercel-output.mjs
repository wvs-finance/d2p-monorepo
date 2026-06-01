/**
 * Build the Vercel "Build Output API" structure for a fully self-contained,
 * prebuilt serverless function — so `vercel deploy --prebuilt` uploads it as-is and
 * Vercel runs NO build (no build quota; and our esbuild bundle resolves all .ts
 * imports in OUR env, fixing the remote-transpile failure).
 *
 * Produces:
 *   .vercel/output/functions/api/fetch.func/index.mjs      (esbuild bundle)
 *   .vercel/output/functions/api/fetch.func/.vc-config.json
 *   .vercel/output/config.json                             (the /te/* rewrite)
 */
import { build } from "esbuild";
import { mkdir, writeFile, rm } from "node:fs/promises";

const OUT = ".vercel/output";
const FUNC = `${OUT}/functions/api/fetch.func`;

await rm(OUT, { recursive: true, force: true });
await mkdir(FUNC, { recursive: true });

await build({
  entryPoints: ["vercel/handler.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  outfile: `${FUNC}/index.mjs`,
});

await writeFile(
  `${FUNC}/.vc-config.json`,
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", shouldAddHelpers: true }, null, 2),
);

await writeFile(
  `${OUT}/config.json`,
  JSON.stringify({ version: 3, routes: [{ src: "/te/(.*)", dest: "/api/fetch?path=te/$1" }] }, null, 2),
);

console.log("Vercel Build Output written to", OUT);
