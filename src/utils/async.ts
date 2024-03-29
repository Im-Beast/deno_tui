// Copyright 2023 Im-Beast. MIT license.

/** Asynchronously sleep for {time} milliseconds */
export function sleep(time: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, time);
  });
}
