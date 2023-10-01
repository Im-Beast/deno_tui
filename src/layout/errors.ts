// Copyright 2023 Im-Beast. MIT license.
export class LayoutInvalidElementsPatternError extends Error {
  constructor() {
    super(
      `Invalid elements pattern, same-name elements should be arranged in a row, e.g. ["dog", "dog", "cat"], not ["dog", "cat", "dog"]`,
    );
  }
}

export class LayoutMissingElementError extends Error {
  constructor(name: string) {
    super(`Element "${name}" hasn't been found in layout`);
  }
}
