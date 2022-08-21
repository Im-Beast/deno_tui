// Copyright 2022 Im-Beast. All rights reserved. MIT license.

/** Asynchronously sleep for {time} milliseconds */
export function sleep(time: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, time);
  });
}
