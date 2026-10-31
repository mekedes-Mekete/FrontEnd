import { ServiceNote, UserAccount } from '../models/clinic.models';

// TEMPORARY seed data. All names and records are synthetic (NFR2).
// Delete this file once AdminDataService calls the real backend.

export const MOCK_USERS: UserAccount[] = [
  { id: 1, fullName: 'Sarah Mitchell', email: 'sarah.mitchell@medicore.health', role: 'ROLE_ADMIN', active: true, createdAt: '2020-01-15' },

  { id: 101, fullName: 'Dr. James Harrington', email: 'j.harrington@medicore.health', role: 'ROLE_DOCTOR', active: true, createdAt: '2021-03-01', specialty: 'Internal Medicine' },
  { id: 102, fullName: 'Dr. Priya Nair', email: 'p.nair@medicore.health', role: 'ROLE_DOCTOR', active: true, createdAt: '2022-06-12', specialty: 'Cardiology' },
  { id: 103, fullName: 'Dr. Marcus Webb', email: 'm.webb@medicore.health', role: 'ROLE_DOCTOR', active: true, createdAt: '2023-01-09', specialty: 'Neurology' },

  { id: 201, fullName: 'Thomas Brennan', email: 'thomas.brennan@patient.health', role: 'ROLE_PATIENT', active: true, createdAt: '2021-05-20', dateOfBirth: '1978-04-12', allergies: 'Penicillin, Sulfa', primaryDoctorId: 101 },
  { id: 202, fullName: 'Amelia Chen', email: 'amelia.chen@patient.health', role: 'ROLE_PATIENT', active: true, createdAt: '2022-09-02', dateOfBirth: '1990-11-03', allergies: 'None known', primaryDoctorId: 102 },
  { id: 203, fullName: 'Robert Okafor', email: 'robert.okafor@patient.health', role: 'ROLE_PATIENT', active: true, createdAt: '2023-02-14', dateOfBirth: '1965-07-28', allergies: 'Latex', primaryDoctorId: 101 },
  { id: 204, fullName: 'Sarah Jenkins', email: 'sarah.jenkins@patient.health', role: 'ROLE_PATIENT', active: false, createdAt: '2023-08-30', dateOfBirth: '1984-02-17', allergies: 'None known', primaryDoctorId: 103 },
];

export const MOCK_NOTES: ServiceNote[] = [
  {
    id: 1, patientId: 203, doctorId: 101, serviceType: 'followup',
    title: 'Blood Pressure Follow-up',
    originalNote: 'Patient BP home log checked. Consistently above 140/90 mmHg. Lisinopril dosage adjusted.',
    summary: 'Your home blood pressure numbers remain elevated. The doctor has adjusted your lisinopril medication to help bring your pressure down.',
    summaryStatus: 'READY', dateOfVisit: '2024-10-08', createdAt: '2024-10-08T15:20:00', lastUpdated: '2024-10-08T15:20:00',
  },
  {
    id: 2, patientId: 201, doctorId: 101, serviceType: 'lab',
    title: 'Comprehensive Metabolic Panel',
    originalNote: 'Glucose 102 mg/dL (borderline). HbA1c 5.8%. LDL 138 mg/dL, HDL 42 mg/dL. Kidney function within normal limits. ALT 48 U/L, mildly elevated. Recommend lifestyle modifications, reduced alcohol intake, repeat labs in 6 months.',
    summary: 'Your kidney tests were normal. Your blood sugar and cholesterol are a little higher than recommended, and one liver test was mildly elevated. Focus on balanced meals, activity and less alcohol, and repeat your labs in six months.',
    summaryStatus: 'READY', dateOfVisit: '2024-09-22', createdAt: '2024-09-22T10:05:00', lastUpdated: '2024-09-22T10:05:00',
  },
  {
    id: 3, patientId: 201, doctorId: 101, serviceType: 'consultation',
    title: 'Annual Physical Examination',
    originalNote: 'Routine annual physical. BP 128/82 mmHg, HR 72 bpm, SpO2 98%. BMI 26.4. Lungs clear, heart rhythm regular. Mild fatigue over 6 weeks, attributed to work stress. Blood panel ordered, follow-up in 3 months.',
    summary: 'Your annual exam was reassuring. Your heart, lungs and oxygen level were normal. Your blood pressure is slightly above the ideal range. Please complete the blood tests and return in three months.',
    summaryStatus: 'READY', dateOfVisit: '2024-09-15', createdAt: '2024-09-15T09:40:00', lastUpdated: '2024-09-15T09:40:00',
  },
  {
    id: 4, patientId: 202, doctorId: 102, serviceType: 'diagnosis',
    title: 'Palpitations Evaluation',
    originalNote: 'Intermittent palpitations x 2 weeks. ECG: sinus rhythm, occasional PACs. TSH ordered. Advised reducing caffeine. 48h Holter monitor scheduled.',
    summary: 'Your heart tracing showed a normal rhythm with a few harmless extra beats. Cut back on caffeine. You will wear a small heart monitor for two days, and a thyroid blood test was ordered.',
    summaryStatus: 'READY', dateOfVisit: '2024-08-30', createdAt: '2024-08-31T11:15:00', lastUpdated: '2024-08-31T11:15:00',
  },
  {
    id: 5, patientId: 204, doctorId: 103, serviceType: 'consultation',
    title: 'Migraine Consultation',
    originalNote: 'Recurrent migraines 3-4/month with aura. Neuro exam normal. Start sumatriptan 50mg PRN. Headache diary advised. Review in 8 weeks.',
    summary: 'Your nerve exam was normal. You were given a medicine to take when a migraine starts. Keep a headache diary and come back in eight weeks.',
    summaryStatus: 'READY', dateOfVisit: '2024-07-11', createdAt: '2024-07-11T14:30:00', lastUpdated: '2024-07-11T14:30:00',
  },
];
