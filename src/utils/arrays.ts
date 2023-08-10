export function cloneArrayContents<T>(from: T[], to: T[]): void {
  while (to.length > 0) {
    to.pop();
  }

  for (const element of from) {
    to.push(element);
  }
}
