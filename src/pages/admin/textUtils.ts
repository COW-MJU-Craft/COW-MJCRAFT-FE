export function toLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function toText(lines: string[]) {
  return lines.join('\n');
}
