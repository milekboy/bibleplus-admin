import { ErrorState } from "@/components/ui";
import { canAccessRestrictedAdminArea } from "@/lib/auth/roles";
import { getAdminSession } from "@/lib/auth/session";
import AdminManagementPage from "./AdminManagementPage";

export default async function Page() {
  const session = await getAdminSession();
  if (!session || !canAccessRestrictedAdminArea(session.user.role)) {
    return <ErrorState title="Permission denied" description="Only a super administrator can manage administrator accounts." />;
  }
  return <AdminManagementPage currentAdmin={session.user} />;
}