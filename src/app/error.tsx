"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container-page max-w-lg py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted">We could not load this page. Please try again.</p>
      <button onClick={reset} className="btn btn-primary mt-8">Try again</button>
    </div>
  );
}
