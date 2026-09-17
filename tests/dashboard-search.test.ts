import { describe, expect, it } from "vitest";
import { HiOutlineCalendarDays, HiOutlineHome, HiOutlineUsers } from "react-icons/hi2";
import { dashboardSearchResults, type DashboardSearchPage } from "@/app/components/dashboard/GlobalDashboardSearch";

const pages: DashboardSearchPage[] = [
  { label: "Dashboard", href: "/dashboard", icon: HiOutlineHome, group: "Overview", keywords: ["home", "analytics"] },
  { label: "Events", href: "/dashboard/events", icon: HiOutlineCalendarDays, group: "Content", keywords: ["conference"] },
  { label: "Users", href: "/dashboard/users", icon: HiOutlineUsers, group: "Community", keywords: ["account", "profile"] },
];

describe("dashboard search results", () => {
  it("offers useful quick links before a query is entered", () => {
    expect(dashboardSearchResults(pages, "").map((result) => result.href)).toEqual([
      "/dashboard",
      "/dashboard/users",
      "/dashboard/events",
    ]);
  });

  it("matches destinations by keywords and prioritizes navigation", () => {
    const results = dashboardSearchResults(pages, "account");
    expect(results[0]).toMatchObject({ label: "Users", href: "/dashboard/users", kind: "page" });
  });

  it("hands an encoded term to only the searchable pages the role can access", () => {
    const results = dashboardSearchResults(pages, "Grace & truth").filter((result) => result.kind === "search");
    expect(results.map((result) => result.href)).toEqual([
      "/dashboard/events?q=Grace+%26+truth",
      "/dashboard/users?search=Grace+%26+truth",
    ]);
    expect(results.some((result) => result.href.startsWith("/dashboard/audit-logs"))).toBe(false);
  });
});
