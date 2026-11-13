import type { Metadata } from "next";
import { QuoteEditor } from "@/components/quote/quote-editor";

export const metadata: Metadata = {
  title: "Crear presupuesto",
  description:
    "Armá un presupuesto profesional con cálculo automático y vista previa, sin registrarte.",
  alternates: { canonical: "/crear" },
};

export default function CrearPage() {
  return <QuoteEditor />;
}
