"use client";

import { startTransition, useActionState, useEffect, useState } from "react";

type WithFields = { error?: string; fields?: Record<string, string> };

// React 19 clears a form and keeps old errors after an action runs. This keeps what the
// person typed and drops each error as soon as they edit that field.
export function useFormAction<S extends WithFields>(action: (state: S, data: FormData) => Promise<S>, initial: S) {
  const [state, run, pending] = useActionState<S, FormData>(action as (s: Awaited<S>, d: FormData) => Promise<S>, initial as Awaited<S>);
  const [edited, setEdited] = useState<Set<string>>(new Set());

  useEffect(() => setEdited(new Set()), [state]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => run(data));
  };

  const onChange = (e: React.FormEvent<HTMLFormElement>) => {
    const name = (e.target as HTMLInputElement).name;
    if (name) setEdited((prev) => (prev.has(name) ? prev : new Set(prev).add(name)));
  };

  const fields = Object.fromEntries(Object.entries(state.fields ?? {}).filter(([k]) => !edited.has(k)));
  const bannerError = state.error === "fixFields" ? (Object.keys(fields).length > 0 ? state.error : undefined) : state.error;

  return { state, pending, onSubmit, onChange, fields, bannerError };
}
