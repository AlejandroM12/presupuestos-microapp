import path from "node:path";
import { Font } from "@react-pdf/renderer";

let registered = false;

const dir = () => path.join(process.cwd(), "assets", "fonts");
const file = (name: string) => path.join(dir(), `${name}.woff`);

/** Registra las tipografías incluidas en el repositorio (una sola vez por proceso). */
export function registerPdfFonts(): void {
  if (registered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: file("inter-latin-400-normal"), fontWeight: 400 },
      { src: file("inter-latin-600-normal"), fontWeight: 600 },
      { src: file("inter-latin-700-normal"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Lora",
    fonts: [
      { src: file("lora-latin-400-normal"), fontWeight: 400 },
      { src: file("lora-latin-700-normal"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "Bricolage",
    fonts: [{ src: file("bricolage-grotesque-latin-700-normal"), fontWeight: 700 }],
  });
  Font.register({
    family: "JetBrains",
    fonts: [
      { src: file("jetbrains-mono-latin-400-normal"), fontWeight: 400 },
      { src: file("jetbrains-mono-latin-700-normal"), fontWeight: 700 },
    ],
  });
  // Evita cortes de palabra automáticos en descripciones.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}
