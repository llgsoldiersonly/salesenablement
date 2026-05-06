import { supabase } from "./supabase.js";

export interface LeadContact {
  name: string | null;
  phone: string | null;
  email: string | null;
  role: string | null;
}

export async function getLeadContact(assessmentId: string): Promise<LeadContact> {
  const { data } = await supabase
    .from("sales_assessments")
    .select("contact_name, contact_phone, contact_email, contact_role")
    .eq("id", assessmentId)
    .maybeSingle();

  return {
    name: data?.contact_name ?? null,
    phone: data?.contact_phone ?? null,
    email: data?.contact_email ?? null,
    role: data?.contact_role ?? null,
  };
}

export async function updateLeadContact(
  assessmentId: string,
  contact: LeadContact,
): Promise<void> {
  await supabase
    .from("sales_assessments")
    .update({
      contact_name: contact.name?.trim() || null,
      contact_phone: contact.phone?.trim() || null,
      contact_email: contact.email?.trim() || null,
      contact_role: contact.role?.trim() || null,
    })
    .eq("id", assessmentId);
}

/** Format a phone for display: keeps numbers/symbols, falls back to raw. */
export function formatPhoneDisplay(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

export function phoneTelHref(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `tel:+${digits.length === 10 ? "1" : ""}${digits}`;
}
