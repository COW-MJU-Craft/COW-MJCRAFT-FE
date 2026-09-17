export function getDeploymentVersion(value: unknown): string | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('sha' in value) ||
    typeof value.sha !== 'string' ||
    !/^[0-9a-f]{7,64}$/i.test(value.sha)
  ) {
    return null;
  }

  return value.sha.slice(0, 7);
}
