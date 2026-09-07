import { notFound } from "next/navigation";

const sections = {
  events: "Events",
  blogs: "Blogs",
  books: "Books",
  quiz: "Quiz",
  verse: "Verse of the Day",
  users: "Users",
  moderation: "Moderation",
  notifications: "Notifications",
  admins: "Admin Management",
  "audit-logs": "Audit Logs",
  exports: "Exports",
  "system-config": "System Configuration",
} as const;

type Section = keyof typeof sections;

function isSection(value: string): value is Section {
  return value in sections;
}

export function generateStaticParams() {
  return Object.keys(sections).map((section) => ({ section }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!isSection(section)) notFound();

  const title = sections[section];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--color-foreground)] sm:text-3xl">
          {title}
        </h2>
        <p className="mt-2 text-base text-[var(--color-muted)]">
          Dashboard page
        </p>
      </div>

      <section className="min-h-[26rem] rounded-2xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-xl bg-[var(--color-placeholder-fill)]" />
          <div className="h-24 rounded-xl bg-[var(--color-placeholder-fill)]" />
          <div className="h-24 rounded-xl bg-[var(--color-placeholder-fill)]" />
        </div>
        <div className="mt-6 h-56 rounded-xl bg-[var(--color-placeholder-fill)]" />
      </section>
    </div>
  );
}
