import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="AtajoLab Presupuestos"
    >
      <span className="grid size-8 place-items-center rounded-lg bg-ink text-brand" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          className="size-4.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 4h9l5 5v11H5z" />
          <path d="M9 14h6M9 17.5h3" />
        </svg>
      </span>
      <span className="font-display text-[1.05rem] font-semibold tracking-tight">
        Atajo<span className="text-brand-strong">Lab</span>
        <span className="ml-1.5 hidden font-normal text-muted-foreground min-[430px]:inline">
          Presupuestos
        </span>
      </span>
    </Link>
  );
}
