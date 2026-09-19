import { Role } from "@prisma/client";
import { requireAuth } from "@/lib/rbac";
import { listMembers } from "@/lib/services/workspace.service";
import { MembersTable } from "@/components/settings/members-table";
import { AddMemberDialog } from "@/components/settings/add-member-dialog";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  // requireAuth(Role.ADMIN) throws a 403 ApiError for non-admins. Since this
  // is a page (not an API route) we let it surface as the Next.js error
  // boundary - middleware already redirects non-admins away from /settings
  // before they'd ever hit this in normal use.
  const { userId, workspaceId } = await requireAuth(Role.ADMIN);
  const members = await listMembers(workspaceId);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Members</h1>
          <p className="mt-1 text-sm text-fg-3">
            {members.length} {members.length === 1 ? "person" : "people"} in this workspace
          </p>
        </div>
        <AddMemberDialog />
      </div>

      <div className="rounded-lg border border-border bg-base-2">
        <MembersTable members={members} currentUserId={userId} />
      </div>
    </div>
  );
}
