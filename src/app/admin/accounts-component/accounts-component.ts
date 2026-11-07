import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs/operators';
import { AccountRow, Role, ROLE_LABELS, UserAccount } from '../../models/clinic.models';
import { AdminDataService } from '../../services/admin-data.service';
import { InitialsPipe } from '../../shared/initials.pipe';
import { MaskEmailPipe } from '../../shared/mask-email.pipe';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/confirm-dialog-component/confirm-dialog-component';
import {
  AccountFormDialogComponent,
  AccountFormDialogData,
} from '../account-form-dialog-component/account-form-dialog-component';

/** UC7: list accounts, create (US7.1), edit role / primary doctor (US7.2), deactivate (US7.3). */
@Component({
  selector: 'app-accounts-component',
  standalone: true,
  imports: [DatePipe, InitialsPipe, MaskEmailPipe],
  templateUrl: './accounts-component.html',
  styleUrls: ['../../shared/admin-page.css'],
})
export class AccountsComponent {
  private readonly adminData = inject(AdminDataService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  readonly roleLabels = ROLE_LABELS;
  readonly roleOptions = Object.entries(ROLE_LABELS) as [Role, string][];

  readonly accounts = signal<AccountRow[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');
  readonly query = signal('');
  readonly roleFilter = signal<Role | 'ALL'>('ALL');

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const role = this.roleFilter();
    return this.accounts().filter(
      (a) =>
        (role === 'ALL' || a.role === role) &&
        (!q || a.fullName.toLowerCase().includes(q) || a.email.toLowerCase().includes(q)),
    );
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.adminData.getAccounts().subscribe((list) => {
      this.accounts.set(list);
      this.loading.set(false);
    });
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  onRoleFilter(event: Event): void {
    this.roleFilter.set((event.target as HTMLSelectElement).value as Role | 'ALL');
  }

  /** US7.1 when account is undefined, US7.2 otherwise. */
  openForm(account?: AccountRow): void {
    this.errorMessage.set('');
    this.adminData
      .getActiveDoctors()
      .pipe(
        switchMap((doctors) =>
          this.dialog
            .open<AccountFormDialogComponent, AccountFormDialogData, UserAccount>(AccountFormDialogComponent, {
              width: '640px',
              maxWidth: '95vw',
              data: { account, doctors },
            })
            .afterClosed(),
        ),
      )
      .subscribe((saved) => {
        if (!saved) return;
        this.snackBar.open(account ? 'Account updated.' : 'Account created.', undefined, { duration: 3000 });
        this.load();
      });
  }

  /** US7.3: deactivate needs confirmation; reactivating does not. */
  setActive(account: AccountRow, active: boolean): void {
    this.errorMessage.set('');
    if (active) {
      this.saveActive(account, true);
      return;
    }
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        width: '460px',
        maxWidth: '95vw',
        data: {
          title: 'Deactivate this account?',
          message: `${account.fullName} will no longer be able to log in. Their records are kept, and you can reactivate the account later.`,
          confirmLabel: 'Deactivate',
          danger: true,
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) this.saveActive(account, false);
      });
  }

  private saveActive(account: AccountRow, active: boolean): void {
    this.adminData.setAccountActive(account.id, active).subscribe({
      next: () => {
        this.snackBar.open(active ? 'Account reactivated.' : 'Account deactivated.', undefined, { duration: 3000 });
        this.load();
      },
      error: (err: Error) => this.errorMessage.set(err.message),
    });
  }
}
