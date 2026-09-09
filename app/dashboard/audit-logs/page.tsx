import { ErrorState } from "@/components/ui";
import { canAccessRestrictedAdminArea } from "@/lib/auth/roles";
import { getAdminSession } from "@/lib/auth/session";
import AuditLogsPage from "./AuditLogsPage";

export default async function Page() {
  const session = await getAdminSession();
  if (!session || !canAccessRestrictedAdminArea(session.user.role)) return <ErrorState title="Permission denied" description="Only a super administrator can review or export audit logs." />;
  return <AuditLogsPage />;
}