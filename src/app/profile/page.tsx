import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProfile } from "@/app/actions/profile";
import { isProfileComplete } from "@/lib/profile";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const profile = await getProfile();
  const complete = isProfileComplete(profile);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          ข้อมูลส่วนตัว
        </h1>
        <p className="mt-2 text-sm text-foreground-muted">
          {session.user.name ? `สวัสดีคุณ ${session.user.name}` : "จัดการข้อมูลบัญชีของคุณ"}
        </p>
      </div>

      {!complete && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-gold bg-gold/10 p-4">
          <span className="mt-0.5 text-gold">
            <AlertIcon />
          </span>
          <p className="text-sm text-foreground">
            กรุณากรอกข้อมูลให้ครบถ้วน โดยเฉพาะ{" "}
            <span className="font-semibold text-gold-light">ข้อมูลบัญชีธนาคาร</span>{" "}
            — ถ้าสลากของคุณถูกรางวัล เราจะใช้ข้อมูลนี้โอนเงินรางวัลให้คุณ
          </p>
        </div>
      )}

      <ProfileForm initialProfile={profile} />
    </div>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
