// Copyright 2022 Im-Beast. All rights reserved. MIT license.

/** Asynchronously sleep for {time} milliseconds */
export function sleep(time: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
}
