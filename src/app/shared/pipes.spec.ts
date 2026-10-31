import { InitialsPipe } from './initials.pipe';
import { MaskEmailPipe } from './mask-email.pipe';

describe('MaskEmailPipe', () => {
  const pipe = new MaskEmailPipe();
  it('keeps the first letter and the domain', () => {
    expect(pipe.transform('thomas.brennan@patient.health')).toBe('t*****@patient.health');
  });
  it('handles empty values', () => {
    expect(pipe.transform(null)).toBe('');
  });
});

describe('InitialsPipe', () => {
  const pipe = new InitialsPipe();
  it('skips the "Dr." title', () => {
    expect(pipe.transform('Dr. James Harrington')).toBe('JH');
  });
  it('uses the first two names', () => {
    expect(pipe.transform('Amelia Chen')).toBe('AC');
  });
});
