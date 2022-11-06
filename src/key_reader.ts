// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import { decodeWindowsBuffer } from "./key_reader/windows.ts";
import { decodeUnixBuffer } from "./key_reader/unix.ts";

import type { KeyPress, MousePress, Stdin } from "./types.ts";

/**
 * Read keypresses from given stdin (except for Windows) and then parse them.
 * On Windows keys are read by calling `_getch()` in `msvcrt.dll`.
 * It yields array of either KeyPress or MousePress
 */
export async function* readKeypresses(stdin: Stdin): AsyncGenerator<(KeyPress | MousePress)[], void, void> {
  switch (Deno.build.os) {
    case "windows": {
      const dll = Deno.dlopen("C:\\Windows\\System32\\msvcrt.dll", {
        "_getch": { parameters: [], result: "i32", nonblocking: true },
      });

      try {
        stdin.setRaw(true);
      } catch { /**/ }

      while (true) {
        let char = await dll.symbols._getch();

        let special: number;
        if (char === 0 || char === 224) {
          special = char;
          char = await dll.symbols._getch();
        }

        yield [decodeWindowsBuffer(char, special!)];
      }
    }
    default:
      try {
        stdin.setRaw(true, { cbreak: true });
      } catch { /**/ }

      while (true) {
        const buffer = new Uint8Array(1024);
        const byteLength = await stdin.read(buffer).catch(() => null);
        if (typeof byteLength !== "number") continue;
        yield [...decodeUnixBuffer(buffer.subarray(0, byteLength))];
      }
  }
}
