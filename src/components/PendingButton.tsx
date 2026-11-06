"use client";

import { useFormStatus } from "react-dom";

export function PendingButton({ children, pending: label, className }: { children: React.ReactNode; pending: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? label : children}</button>;
}
