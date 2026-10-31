// Shared data shapes for the admin screens (UC3–UC7).
// When the backend exists, align these field names with the Spring DTOs.

export type Role = 'ROLE_ADMIN' | 'ROLE_DOCTOR' | 'ROLE_PATIENT';
export type ServiceType = 'consultation' | 'diagnosis' | 'prescription' | 'lab' | 'followup';

/** State of the AI summary (UC11). FAILED = Groq call failed, the note is kept without a summary (US11.3). */
export type SummaryStatus = 'PENDING' | 'READY' | 'FAILED';

export const ROLE_LABELS: Record<Role, string> = {
  ROLE_ADMIN: 'Admin',
  ROLE_DOCTOR: 'Doctor',
  ROLE_PATIENT: 'Patient',
};

/** One login account. Doctor-only and patient-only fields are optional. */
export interface UserAccount {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string; // ISO date, shown as "member since"
  // Doctor fields
  specialty?: string;
  // Patient fields
  dateOfBirth?: string; // ISO date
  allergies?: string;
  primaryDoctorId?: number | null;
}

/** A service = one clinical note plus its patient-friendly summary. */
export interface ServiceNote {
  id: number;
  patientId: number;
  doctorId: number;
  serviceType: ServiceType;
  title: string;
  originalNote: string;
  summary: string;
  summaryStatus: SummaryStatus;
  dateOfVisit: string; // ISO date
  createdAt: string; // ISO date-time, set once when the doctor saves the note
  lastUpdated: string; // ISO date-time, changes on every edit
}

/** A note with names resolved, ready to show in a table. */
export interface NoteRow extends ServiceNote {
  patientName: string;
  doctorName: string;
}

/** Account with the primary doctor's name resolved (used for patient and account lists). */
export interface AccountRow extends UserAccount {
  primaryDoctorName: string | null;
}

export interface DoctorProfile {
  doctor: UserAccount;
  assignedPatients: UserAccount[];
  recentNotes: NoteRow[];
}

export interface PatientDetail {
  patient: UserAccount;
  primaryDoctorName: string | null;
  notes: NoteRow[];
}

/** UC5: the three fields an admin may edit. */
export interface NoteChanges {
  title: string;
  originalNote: string;
  summary: string;
}

/** UC7: what the create/edit account form sends. */
export interface AccountInput {
  fullName: string;
  email: string;
  role: Role;
  specialty?: string | null;
  dateOfBirth?: string | null;
  allergies?: string | null;
  primaryDoctorId?: number | null;
  temporaryPassword?: string | null;
}
