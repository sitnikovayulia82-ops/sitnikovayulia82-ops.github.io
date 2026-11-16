export type Role = 'nanny' | 'parent' | 'admin';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  phone: string;
  city: string;
  districts: string[];
  pd_consent_at: string;
}

export interface NannyProfile {
  user_id: string;
  birth_date: string;
  about: string | null;
  experience_years: number;
  car_model: string;
  car_color: string | null;
  car_plate: string;
  has_child_seat: boolean;
  price_from: number | null;
  passport_series: string;
  passport_number: string;
  passport_photo_path: string;
  selfie_path: string;
  verification_status: VerificationStatus;
  rejection_reason: string | null;
}

export interface Child {
  id: string;
  parent_id: string;
  name: string;
  birth_date: string;
  school: string | null;
  grade: string | null;
  from_district: string | null;
  to_district: string | null;
  schedule: string | null;
  notes: string | null;
}

/** То, что родитель видит в поиске: без паспортных данных. */
export interface PublicNanny {
  user_id: string;
  full_name: string;
  phone: string;
  districts: string[];
  about: string | null;
  experience_years: number;
  car_model: string;
  car_color: string | null;
  has_child_seat: boolean;
  price_from: number | null;
  age: number;
}

/** То, что проверенная автоняня видит о запросах: без адресов и медицинских заметок. */
export interface PublicRequest {
  child_id: string;
  child_name: string;
  child_age: number;
  school: string | null;
  grade: string | null;
  from_district: string | null;
  to_district: string | null;
  schedule: string | null;
  parent_name: string;
  parent_phone: string;
  parent_districts: string[];
}

export function ageFrom(birthDate: string): number {
  const b = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

/** Принимает «ДД.ММ.ГГГГ», возвращает «ГГГГ-ММ-ДД» или null. */
export function parseRuDate(s: string): string | null {
  const m = s.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const iso = `${y}-${mo}-${d}`;
  const dt = new Date(iso + 'T00:00:00');
  if (isNaN(dt.getTime()) || dt.getDate() !== Number(d)) return null;
  return iso;
}

export function formatRuDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
