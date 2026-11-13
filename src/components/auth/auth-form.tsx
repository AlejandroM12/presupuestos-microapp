"use client";

import { Loader2 } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/fields";
import type { FormState } from "@/app/(auth)/actions";

export interface FieldSpec {
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
}

interface Props {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  fields: FieldSpec[];
  submitLabel: string;
  hidden?: Record<string, string>;
  /** Contenido extra bajo el campo de contraseña (por ejemplo, el enlace de recuperación). */
  afterFields?: React.ReactNode;
}

const initial: FormState = {};

export function AuthForm({ action, fields, submitLabel, hidden, afterFields }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);

  if (state.ok && state.message) {
    return (
      <p role="status" className="rounded-lg border border-border bg-muted/50 p-4 text-sm text-ink">
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} noValidate className="space-y-4">
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {state.message && (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {state.message}
        </p>
      )}
      {fields.map((f) => (
        <TextField
          key={f.name}
          id={`auth-${f.name}`}
          name={f.name}
          label={f.label}
          type={f.type ?? "text"}
          autoComplete={f.autoComplete}
          hint={f.hint}
          defaultValue={f.type === "password" ? undefined : state.values?.[f.name]}
          error={state.errors?.[f.name]}
        />
      ))}
      {afterFields}
      <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={pending}>
        {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
        {submitLabel}
      </Button>
    </form>
  );
}
