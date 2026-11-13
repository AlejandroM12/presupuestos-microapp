import { ImageResponse } from "next/og";

export const alt = "AtajoLab Presupuestos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#14213d",
        color: "white",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", fontSize: 34, color: "#f08a3c" }}>AtajoLab Presupuestos</div>
      <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>
        Presupuestos profesionales en PDF, en minutos.
      </div>
      <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.7)" }}>
        presupuestos.atajolab.dev
      </div>
    </div>,
    size,
  );
}
