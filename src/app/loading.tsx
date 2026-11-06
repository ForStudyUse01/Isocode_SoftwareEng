export default function Loading() {
  return (
    <div className="container-page py-14" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-10 w-2/3 max-w-md" />
      <div className="skeleton mt-4 h-5 w-1/2 max-w-sm" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton aspect-[4/3]" />)}
      </div>
    </div>
  );
}
