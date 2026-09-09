"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { IconType } from "react-icons";
import { ErrorState } from "@/components/ui";
import { canAccessRestrictedAdminArea, isRestrictedAdminRoute } from "@/lib/auth/roles";
import type { AdminSession } from "@/types/auth";
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineBars3,
  HiOutlineBell,
  HiOutlineBookOpen,
  HiOutlineCalendarDays,
  HiOutlineClipboardDocumentList,
  HiOutlineCog6Tooth,
  HiOutlineHome,
  HiOutlineKey,
  HiOutlineMagnifyingGlass,
  HiOutlineMoon,
  HiOutlineSun,
  HiOutlineNewspaper,
  HiOutlineQuestionMarkCircle,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlineUserGroup,
  HiOutlineUsers,
  HiOutlineXMark,
} from "react-icons/hi2";

type NavItem = {
  label: string;
  href: string;
  icon: IconType;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: HiOutlineHome }],
  },
  {
    label: "Content",
    items: [
      { label: "Events", href: "/dashboard/events", icon: HiOutlineCalendarDays },
      { label: "Blogs", href: "/dashboard/blogs", icon: HiOutlineNewspaper },
      { label: "Books", href: "/dashboard/books", icon: HiOutlineBookOpen },
      { label: "Quiz", href: "/dashboard/quiz", icon: HiOutlineQuestionMarkCircle },
      { label: "Verse of the Day", href: "/dashboard/verse-of-day", icon: HiOutlineSparkles },
    ],
  },
  {
    label: "Community",
    items: [
      { label: "Users", href: "/dashboard/users", icon: HiOutlineUsers },
      { label: "Moderation", href: "/dashboard/moderation", icon: HiOutlineShieldCheck },
      { label: "Notifications", href: "/dashboard/notifications", icon: HiOutlineBell },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Admin Management", href: "/dashboard/admin-management", icon: HiOutlineUserGroup },
      { label: "Audit Logs", href: "/dashboard/audit-logs", icon: HiOutlineClipboardDocumentList },
      // { label: "Audit Logs", href: "/dashboard/audit-logs", icon: HiOutlineClipboardDocumentList },
      { label: "Exports", href: "/dashboard/exports", icon: HiOutlineArrowDownTray },
      { label: "Password Security", href: "/dashboard/security", icon: HiOutlineKey },
      { label: "System Configuration", href: "/dashboard/system-configuration", icon: HiOutlineCog6Tooth },
    ],
  },
];

const routeTitles = new Map(
  navGroups.flatMap((group) => group.items.map((item) => [item.href, item.label])),
);

function isRouteActive(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export default function DashboardShell({ children, session }: { children: ReactNode; session: AdminSession }) {
  const pathname = usePathname();
  const router = useRouter();
  const [desktopExpanded, setDesktopExpanded] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const privileged = canAccessRestrictedAdminArea(session.user.role);
  const visibleNavGroups = useMemo(() => navGroups.map((group) => ({ ...group, items: group.items.filter((item) => privileged || !isRestrictedAdminRoute(item.href)) })).filter((group) => group.items.length), [privileged]);
  const permissionDenied = isRestrictedAdminRoute(pathname) && !privileged;

  const pageTitle = useMemo(
    () => pathname === "/dashboard" ? "Welcome Back" : routeTitles.get(pathname) || "Dashboard",
    [pathname],
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("bibleplus-theme");
    const preferredTheme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.classList.toggle("dark", preferredTheme === "dark");
    localStorage.removeItem("adminAccessToken");
    localStorage.removeItem("adminUser");
    sessionStorage.removeItem("adminAccessToken");
    sessionStorage.removeItem("adminUser");
    const frame = window.requestAnimationFrame(() => {
      setTheme(preferredTheme);
      setCurrentDate(
        new Intl.DateTimeFormat("en-NG", {
          weekday: "short",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date()),
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("bibleplus-theme", next);
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }); }
    finally { router.replace("/"); router.refresh(); }
  };

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-page)] p text-[var(--color-foreground)] sm:p-4">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 cursor-pointer bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        onMouseEnter={() => setDesktopExpanded(true)}
        onMouseLeave={() => setDesktopExpanded(false)}
        className={`fixed inset-y-3 left-3 z-50 flex w-[17rem] flex-col overflow-hidden rounded-[26px] bg-[var(--color-primary)] text-white shadow-[0_20px_50px_rgba(10,35,80,0.18)] transition-[width,transform] duration-300 ease-out sm:inset-y-4 sm:left-4 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"
        } ${desktopExpanded ? "lg:w-[17rem]" : "lg:w-[4.75rem]"}`}
      >
        <div className="flex h-[76px] shrink-0 items-center px-[18px]">
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className="flex min-w-0 cursor-pointer items-center gap-3"
            aria-label="BiblePlus dashboard"
          >
            <Image
              src="/icon.png"
              alt="BiblePlus logo"
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-xl object-cover"
              priority
            />
            <span
              className={`whitespace-nowrap text-lg font-semibold tracking-[-0.02em] transition-all duration-200 ${
                desktopExpanded || mobileOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-2 opacity-0"
              }`}
            >
              BiblePlus Admin
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl text-blue-100 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <HiOutlineXMark className="h-6 w-6" />
          </button>
        </div>

        <nav className="dashboard-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4">
          {visibleNavGroups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={groupIndex ? "mt-4 border-t border-white/10 pt-4" : "mt-2"}
            >
              <p
                className={`mb-2 h-5 whitespace-nowrap px-3 text-xs font-medium uppercase tracking-[0.16em] text-blue-200/70 transition-opacity duration-200 ${
                  desktopExpanded || mobileOpen ? "opacity-100" : "opacity-0"
                }`}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isRouteActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      title={!desktopExpanded ? item.label : undefined}
                      className={`group flex h-11 cursor-pointer items-center gap-3 rounded-xl px-3 transition-colors ${
                        active
                          ? "bg-white text-[var(--color-primary)]"
                          : "text-blue-100 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      <span
                        className={`whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                          desktopExpanded || mobileOpen
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-2 opacity-0"
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title={!desktopExpanded ? "Log out" : undefined}
            className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <HiOutlineArrowLeftOnRectangle className="h-5 w-5 shrink-0" />
            <span
              className={`whitespace-nowrap text-sm font-medium transition-all duration-200 ${
                desktopExpanded || mobileOpen
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-2 opacity-0"
              }`}
            >
              {loggingOut ? "Logging out…" : "Log out"}
            </span>
          </button>
        </div>
      </aside>

      <div
        className={`h-full transition-[padding] duration-300 ease-out ${
          desktopExpanded ? "lg:pl-[17.75rem]" : "lg:pl-[5.5rem]"
        }`}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_18px_55px_rgba(17,45,90,0.07)]">
          <header className="z-30 flex min-h-[88px] shrink-0 flex-wrap items-center gap-3 border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-4 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-foreground)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] lg:hidden"
              aria-label="Open navigation"
            >
              <HiOutlineBars3 className="h-6 w-6" />
            </button>

            <div className="min-w-0">
           
              <h1 className="truncate text-xl font-semibold tracking-[-0.025em] text-[var(--color-foreground)] sm:text-2xl">
                {pageTitle}
              </h1>
            </div>

            <label className="relative order-3 w-full sm:order-none sm:ml-8 sm:flex-1 sm:max-w-[28rem] lg:ml-16 xl:ml-24">
              <span className="sr-only">Search dashboard</span>
              <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--color-placeholder)]" />
              <input
                type="search"
                placeholder="Search dashboard..."
                className="h-10 w-full rounded-full border border-transparent bg-[var(--color-surface-muted)] py-2 pl-11 pr-5 text-sm text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-placeholder)] hover:bg-[var(--color-placeholder-fill)] focus:border-[var(--color-border)] focus:bg-[var(--color-surface)] focus:ring-2 focus:ring-[var(--color-primary-soft)]"
              />
            </label>

            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              <p className="hidden text-sm text-[var(--color-muted)] md:block">
                {currentDate}
              </p>
              <button
                type="button"
                onClick={toggleTheme}
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--color-primary-soft)]"
                aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
              >
                {theme === "dark" ? <HiOutlineSun className="h-5 w-5" /> : <HiOutlineMoon className="h-5 w-5" />}
              </button>
              <Link
                href="/dashboard/notifications"
                className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl  border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-muted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                aria-label="Open notifications"
              >
                <HiOutlineBell className="h-5 w-5" />
              </Link>
              <div className="grid h-10 w-10 place-items-center cursor-pointer rounded-4xl bg-[var(--color-primary)] text-sm font-semibold text-white">
                A
              </div>
            </div>
          </header>

          <main className="dashboard-scrollbar min-h-0 flex-1 overflow-y-auto rounded-t-[32px] bg-[var(--color-page)]
  p-4 sm:p-6 lg:p-8">
            {permissionDenied ? <ErrorState title="Permission denied" description="Your administrator role does not grant access to this area." /> : children}
          </main>
        </div>
      </div>
    </div>
  );
}
