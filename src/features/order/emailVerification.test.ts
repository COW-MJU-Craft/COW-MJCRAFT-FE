import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/core/client';
import {
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
  it('explains an invalid code on 401 in code mode', () => {
    expect(
      getEmailVerificationError(new ApiError(401, null), 'code'),
    ).toContain('인증 코드');
  });

  it('explains a credential mismatch on 401 in password mode', () => {
    expect(
      getEmailVerificationError(new ApiError(401, null), 'password'),
    ).toContain('일치하지');
  });

  it('explains weak passwords on 422', () => {
    expect(getEmailVerificationError(new ApiError(422, null), 'code')).toContain(
      '약해요',
    );
  });
});
