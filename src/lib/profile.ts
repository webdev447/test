export type Profile = {
  firstName: string;
  lastName: string;
  phone: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
};

export const EMPTY_PROFILE: Profile = {
  firstName: "",
  lastName: "",
  phone: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
};

export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false;
  return Object.values(profile).every((v) => v.trim().length > 0);
}
