// Reescribe marketing/textos/enlaces-utm.md a partir de utm-links.mjs.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CAMPAIGN, CHANNELS, DESTINATIONS, link } from "./utm-links.mjs";

const rows = (d) => CHANNELS.map((c) => `| ${c.nombre} | \`${link(d.key, c.key)}\` |`).join("\n");
const md = `# Enlaces de destino con UTM

Generado por \`marketing/build/utm-links.mjs\` (no editar a mano). Campaña inicial: \`${CAMPAIGN}\`.
Para distinguir creatividades dentro de una campaña, agregar \`&utm_content=<creatividad>\` (por ejemplo \`&utm_content=minutos_v1\`; los nombres de las creatividades están en \`marketing/creatividades/\`).

Reglas: solo minúsculas, números, guion bajo, punto o guion; hasta 60 caracteres (la aplicación ignora valores raros).

${DESTINATIONS.map((d) => `## ${d.uso}\n\n| Canal | Enlace |\n| --- | --- |\n${rows(d)}`).join("\n\n")}
`;
writeFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "textos", "enlaces-utm.md"),
  md,
);
console.log("Documento de enlaces generado.");
