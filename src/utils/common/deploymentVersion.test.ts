import { describe, expect, it } from 'vitest';
import { getDeploymentVersion } from './deploymentVersion';

describe('getDeploymentVersion', () => {
  it('유효한 배포 SHA를 짧은 버전으로 반환한다', () => {
    expect(
      getDeploymentVersion({ sha: 'eaf967a6c6ae6b3831ddbd41128e7f9ed4395e44' }),
    ).toBe('eaf967a');
  });

  it.each([
    undefined,
    null,
    {},
    { sha: 'unknown' },
    { sha: '123456' },
    { sha: '<script>alert(1)</script>' },
  ])('유효하지 않은 version.json 값은 숨긴다: %o', (value) => {
    expect(getDeploymentVersion(value)).toBeNull();
  });
});
