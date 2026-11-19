import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const directory = fileURLToPath(new URL(".", import.meta.url));
const outputDirectory = join(directory, "dist");

await mkdir(outputDirectory, { recursive: true });
await build({
  entryPoints: [join(directory, "main.ts")],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: join(outputDirectory, "app.js"),
});
await Promise.all(
  [
    "index.html",
    "styles.css",
    "manifest.webmanifest",
    "sw.js",
    "icon.svg",
    "icon-192.png",
    "icon-512.png",
  ].map((file) => copyFile(join(directory, file), join(outputDirectory, file))),
);
