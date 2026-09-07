function PlaceholderPanel({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-5 ${className}`}
    >
      <div className="mb-8 h-3 w-24 rounded-full bg-[var(--color-placeholder-fill)]" />
      <div className="space-y-3">
        <div className="h-3 w-full rounded-full bg-[var(--color-placeholder-fill)]" />
        <div className="h-3 w-4/5 rounded-full bg-[var(--color-placeholder-fill)]" />
      </div>
      <p className="mt-6 text-sm font-medium text-[var(--color-muted)]">{title}</p>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)] sm:text-3xl">
          Platform overview
        </h2>
        <p className="mt-2 text-base text-[var(--color-muted)]">
          Get an overiew of all the activities 
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["Users metric", "Content metric", "Community metric", "System metric"].map(
          (title) => (
            <PlaceholderPanel key={title} title={title} />
          ),
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <PlaceholderPanel title="Activity chart" className="min-h-80" />
        <PlaceholderPanel title="Upcoming events" className="min-h-80" />
      </div>

      <PlaceholderPanel title="Recent platform activity" className="min-h-56" />
    </div>
  );
}
