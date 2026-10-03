import { getAdminTickets } from "@/app/actions/admin";
import TicketsManager from "@/components/admin/TicketsManager";

export default async function AdminTicketsPage() {
  const tickets = await getAdminTickets();

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">คลังหวย</h1>
      <p className="mt-1 text-sm text-foreground-muted">
        เพิ่มเลขที่เปิดขายในงวดนี้ หรือเริ่มงวดใหม่เมื่อเลขเปลี่ยน
      </p>
      <div className="mt-5">
        <TicketsManager initialTickets={tickets} />
      </div>
    </div>
  );
}
