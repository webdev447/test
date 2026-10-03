import { getAdminMembers } from "@/app/actions/admin";
import MembersTable from "@/components/admin/MembersTable";

export default async function AdminMembersPage() {
  const members = await getAdminMembers();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">สมาชิก</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        ทั้งหมด {members.length.toLocaleString("th-TH")} คน
      </p>
      <div className="mt-5">
        <MembersTable members={members} />
      </div>
    </div>
  );
}
