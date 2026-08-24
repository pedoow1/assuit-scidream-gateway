// Shared constants + types for the Industrial Chemistry department module
// (قسم الكيمياء الصناعية). Kept separate from subjects/auth so every
// department route imports the same source of truth.

export const DEPARTMENT_NAME = "الكيمياء الصناعية";

export const DEPARTMENT_FEATURES = [
  { title: "تسجيل مواد مستقل", body: "تسجيل المواد لطلاب القسم منفصل تمامًا عن باقي الموقع." },
  { title: "متابعة أكاديمية", body: "مشرف أكاديمي يراجع كل تسجيل قبل ما يتأكد." },
  { title: "درجات أول بأول", body: "الدكاترة يرفعوا الدرجات لمادتهم بس، وتظهر لكل طالب فورًا." },
  { title: "إيصالات إلكترونية", body: "ارفع إيصال السداد من موبايلك بدل الطوابير." },
];

export type DepartmentApplicationStatus = "pending" | "approved" | "rejected";

export interface DepartmentApplication {
  id: string;
  user_id: string;
  department: string;
  full_name: string;
  email: string;
  phone: string;
  academic_id: string | null;
  academic_year: string | null;
  notes: string | null;
  status: DepartmentApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type RegistrationStatus =
  | "pending_advisor"
  | "approved"
  | "needs_receipt"
  | "paid"
  | "rejected"
  | "expired";

export interface DepartmentRegistration {
  id: string;
  student_id: string;
  subject_id: string;
  status: RegistrationStatus;
  priority: number;
  priority_edit_count: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DepartmentReceipt {
  id: string;
  registration_id: string;
  student_id: string;
  file_url: string;
  status: "submitted" | "confirmed" | "rejected";
  uploaded_at: string;
  confirmed_by: string | null;
  confirmed_at: string | null;
}

export interface DepartmentGrade {
  id: string;
  student_id: string;
  subject_id: string;
  grade: string | null;
  points: number | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export const REGISTRATION_STATUS_LABEL: Record<RegistrationStatus, string> = {
  pending_advisor: "معلّق عند المشرف",
  approved: "موافق عليه — محتاج ترفع الإيصال",
  needs_receipt: "الإيصال قيد المراجعة",
  paid: "مدفوع ومؤكد",
  rejected: "مرفوض",
  expired: "اتشال (اتأخر في الإيصال)",
};

export const RECEIPT_DEADLINE_DAYS = 7;
export const MAX_PRIORITY_EDITS = 3;

export function receiptDueDate(registrationCreatedAt: string) {
  const d = new Date(registrationCreatedAt);
  d.setDate(d.getDate() + RECEIPT_DEADLINE_DAYS);
  return d;
}

export function isReceiptOverdue(registrationCreatedAt: string) {
  return receiptDueDate(registrationCreatedAt).getTime() < Date.now();
}
