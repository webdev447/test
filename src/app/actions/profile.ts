"use server";

import { auth } from "@/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Profile } from "@/lib/profile";

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) throw new Error("กรุณาเข้าสู่ระบบก่อน");
  return userId;
}

export async function getProfile(): Promise<Profile | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("first_name, last_name, phone, bank_name, bank_account_name, bank_account_number")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    firstName: data.first_name ?? "",
    lastName: data.last_name ?? "",
    phone: data.phone ?? "",
    bankName: data.bank_name ?? "",
    bankAccountName: data.bank_account_name ?? "",
    bankAccountNumber: data.bank_account_number ?? "",
  };
}

export async function saveProfile(profile: Profile) {
  const userId = await requireUserId();
  const { error } = await supabaseAdmin().from("profiles").upsert({
    user_id: userId,
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone: profile.phone,
    bank_name: profile.bankName,
    bank_account_name: profile.bankAccountName,
    bank_account_number: profile.bankAccountNumber,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
