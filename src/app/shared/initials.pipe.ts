import { Pipe, PipeTransform } from '@angular/core';

/** "Dr. James Harrington" -> "JH", "Amelia Chen" -> "AC". */
@Pipe({ name: 'initials', standalone: true })
export class InitialsPipe implements PipeTransform {
  transform(name: string | null | undefined): string {
    return (name ?? '')
      .replace(/^Dr\.?\s+/i, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }
}
