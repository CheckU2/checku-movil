export type Role = 'super_admin' | 'admin' | 'career_admin' | 'tutor' | 'teacher' | 'student';
export interface User { id: string; full_name: string; email: string; role: Role; bio?: string; avatar_url?: string; banner_color?: string; }
export interface ApiEnvelope<T> { success: boolean; data: T; message?: string; meta?: Record<string, unknown>; }
export interface Tokens { access_token: string; refresh_token: string; }
export interface LoginData extends Tokens { user: User; }
export interface ClassItem { id: string; subject_name?: string; group_name?: string; teacher_name?: string; period_name?: string; enrollment_code?: string; code?: string; status?: string; }
export interface SessionItem { id: string; class_id?: string; status?: string; started_at?: string; created_at?: string; subject_name?: string; group_name?: string; }
export interface AttendanceItem { id: string; status?: string; recorded_at?: string; class?: { subject_name?: string; group_name?: string }; }
