import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/core/client';
import {
  createThrowawayPassword,
  getEmailVerificationError,
  isEmailVerified,
} from './emailVerification';

describe('isEmailVerified', () => {
  it('is false before any verification', () => {
    expect(isEmailVerified(null, 'a@mju.ac.kr')).toBe(false);
  });

  it('is true for the same email ignoring case and surrounding spaces', () => {
    expect(isEmailVerified('a@mju.ac.kr', '  A@MJU.ac.kr ')).toBe(true);
  });

  it('is false once the email changes', () => {
    expect(isEmailVerified('a@mju.ac.kr', 'b@mju.ac.kr')).toBe(false);
  });

  it('is false for a blank current email', () => {
    expect(isEmailVerified('', ' ')).toBe(false);
  });
});

describe('getEmailVerificationError', () => {
  it('explains an invalid or expired code on 401', () => {
    expect(getEmailVerificationError(new ApiError(401, null))).toContain(
      '인증 코드',
    );
  });

  it('explains a malformed email on 400', () => {
    expect(getEmailVerificationError(new ApiError(400, null))).toContain(
      '이메일 형식',
    );
  });
});

describe('createThrowawayPassword', () => {
  it('has the requested length and every character class', () => {
    const password = createThrowawayPassword();
    expect(password).toHaveLength(24);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/\d/);
    expect(password).toMatch(/[!@#$%^&*]/);
  });

  it('differs between calls', () => {
    expect(createThrowawayPassword()).not.toBe(createThrowawayPassword());
  });
});
