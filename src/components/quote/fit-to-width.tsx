"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Muestra su contenido con un ancho de diseño fijo y lo escala para que entre en pantallas
 * angostas (el documento se ve completo, sin cortes ni columnas superpuestas en el celular).
 */
export function FitToWidth({
  designWidth = 640,
  children,
}: {
  designWidth?: number;
  children: React.ReactNode;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;
    const update = () => {
      const k = Math.min(1, o.clientWidth / designWidth);
      setScale(k);
      setHeight(i.offsetHeight * k);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(o);
    ro.observe(i);
    return () => ro.disconnect();
  }, [designWidth]);

  return (
    <div
      ref={outer}
      className="relative mx-auto w-full min-w-0"
      style={{ maxWidth: designWidth, height }}
    >
      <div
        ref={inner}
        className="absolute top-0 left-0"
        style={{
          width: designWidth,
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
