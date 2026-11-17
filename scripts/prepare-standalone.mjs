// Copia assets estáticos junto al servidor standalone (requerido por `output: "standalone"`).
import { cpSync, existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
if (!existsSync(path.join(standalone, "server.js"))) {
  console.error("Falta .next/standalone/server.js. Ejecutá pnpm build antes.");
  process.exit(1);
}
cpSync(path.join(root, "public"), path.join(standalone, "public"), { recursive: true });
cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), {
  recursive: true,
});
if (existsSync(path.join(root, "assets"))) {
  cpSync(path.join(root, "assets"), path.join(standalone, "assets"), { recursive: true });
}
