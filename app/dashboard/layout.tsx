import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import DashboardShell from "@/app/components/dashboard/DashboardShell";
import { getAdminSession } from "@/lib/auth/session";
export default async function DashboardLayout({ children }: { children: ReactNode }) { const session = await getAdminSession(); if (!session) redirect("/?returnTo=/dashboard"); return <DashboardShell session={session}>{children}</DashboardShell>; }
