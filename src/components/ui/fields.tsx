import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const controlClass =
  "block w-full rounded-lg border border-input bg-white px-3 text-sm text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/20";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClass, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "min-h-20 py-2", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClass, "h-10 pr-8", className)} {...props} />;
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-xs font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
};

export function TextField({ id, label, error, hint, wrapperClassName, ...props }: TextFieldProps) {
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={wrapperClassName}>
      <Input id={id} aria-invalid={error ? true : undefined} {...props} />
    </Field>
  );
}

type TextAreaFieldProps = Omit<ComponentProps<"textarea">, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  wrapperClassName?: string;
};

export function TextAreaField({
  id,
  label,
  error,
  hint,
  wrapperClassName,
  ...props
}: TextAreaFieldProps) {
  return (
    <Field label={label} error={error} hint={hint} htmlFor={id} className={wrapperClassName}>
      <Textarea id={id} aria-invalid={error ? true : undefined} {...props} />
    </Field>
  );
}
