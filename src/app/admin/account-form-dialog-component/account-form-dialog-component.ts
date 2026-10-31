import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AccountInput, Role, ROLE_LABELS, UserAccount } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import { localToday, notBlank, notInFuture } from '../../shared/form-validators';

type AccountField = 'fullName' | 'email' | 'specialty' | 'dateOfBirth' | 'primaryDoctorId' | 'temporaryPassword';

export interface AccountFormDialogData {
  /** Leave out to create a new account (US7.1); pass an account to edit it (US7.2). */
  account?: UserAccount;
  /** Active doctors for the primary-doctor dropdown. */
  doctors: UserAccount[];
}

/** UC7: create an account, or change an account's details, role and primary doctor. */
@Component({
  selector: 'app-account-form-dialog-component',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './account-form-dialog-component.html',
  styleUrls: ['../../shared/dialog.css'],
})
export class AccountFormDialogComponent {
  readonly data = inject<AccountFormDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<AccountFormDialogComponent, UserAccount>);
  private readonly adminData = inject(AdminDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEdit = !!this.data.account;
  readonly roles = Object.entries(ROLE_LABELS) as [Role, string][];
  readonly today = localToday();

  readonly saving = signal(false);
  readonly errorMessage = signal('');

  readonly form = new FormGroup({
    fullName: new FormControl(this.data.account?.fullName ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(100)],
    }),
    email: new FormControl(this.data.account?.email ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    role: new FormControl<Role>(this.data.account?.role ?? 'ROLE_PATIENT', { nonNullable: true }),
    // Doctor only
    specialty: new FormControl(this.data.account?.specialty ?? '', { nonNullable: true }),
    // Patient only
    dateOfBirth: new FormControl(this.data.account?.dateOfBirth ?? '', { nonNullable: true }),
    allergies: new FormControl(this.data.account?.allergies ?? '', { nonNullable: true }),
    primaryDoctorId: new FormControl<number | null>(this.data.account?.primaryDoctorId ?? null),
    // Create only
    temporaryPassword: new FormControl('', { nonNullable: true }),
  });

  /** Mirrors the role control so the template can show/hide role-specific fields. */
  readonly role = signal<Role>(this.form.controls.role.value);

  constructor() {
    if (!this.isEdit) {
      this.form.controls.temporaryPassword.setValidators([Validators.required, Validators.minLength(8)]);
    }
    this.applyRoleRules(this.role());
    this.form.controls.role.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((role) => {
      this.role.set(role);
      this.applyRoleRules(role);
    });
  }

  /** Only the fields shown for the chosen role are required. */
  private applyRoleRules(role: Role): void {
    const c = this.form.controls;
    const set = (control: AbstractControl, validators: ValidatorFn[]) => {
      control.setValidators(validators);
      control.updateValueAndValidity({ emitEvent: false });
    };
    set(c.specialty, role === 'ROLE_DOCTOR' ? [notBlank] : []);
    set(c.dateOfBirth, role === 'ROLE_PATIENT' ? [Validators.required, notInFuture] : []);
    set(c.primaryDoctorId, role === 'ROLE_PATIENT' ? [Validators.required] : []);
  }

  showError(field: AccountField): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const input: AccountInput = {
      fullName: v.fullName,
      email: v.email,
      role: v.role,
      specialty: v.specialty,
      dateOfBirth: v.dateOfBirth,
      allergies: v.allergies,
      primaryDoctorId: v.primaryDoctorId,
      temporaryPassword: this.isEdit ? null : v.temporaryPassword,
    };

    this.saving.set(true);
    this.errorMessage.set('');
    const request = this.isEdit
      ? this.adminData.updateAccount(this.data.account!.id, input)
      : this.adminData.createAccount(input);

    request.subscribe({
      next: (account) => this.dialogRef.close(account),
      error: (err: Error) => {
        this.saving.set(false);
        this.errorMessage.set(err.message || 'Could not save the account.');
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
