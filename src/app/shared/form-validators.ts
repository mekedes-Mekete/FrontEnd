import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Like Validators.required, but also rejects text that is only spaces. */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim().length > 0 ? null : { required: true };
}

/** Rejects ISO dates (yyyy-MM-dd) later than today. */
export function notInFuture(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  if (!value) return null;
  return value > localToday() ? { future: true } : null;
}

export function localToday(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}
