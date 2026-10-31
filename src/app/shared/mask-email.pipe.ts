import { Pipe, PipeTransform } from '@angular/core';

/** "thomas.brennan@patient.health" -> "t*****@patient.health" (NFR2: mask patient emails in admin lists). */
@Pipe({ name: 'maskEmail', standalone: true })
export class MaskEmailPipe implements PipeTransform {
  transform(email: string | null | undefined): string {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (!domain) return '*****';
    return `${local.charAt(0)}*****@${domain}`;
  }
}
