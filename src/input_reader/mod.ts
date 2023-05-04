// Copyright 2023 Im-Beast. All rights reserved. MIT license.

import type { KeyPressEvent, MouseEvent, MousePressEvent, MouseScrollEvent } from "./types.ts";
import type { Stdin } from "../types.ts";
import { decodeMouseSGR, decodeMouseVT_UTF8 } from "./decoders/mouse.ts";
import { decodeKey } from "./decoders/keyboard.ts";
import type { EmitterEvent, EventEmitter } from "../event_emitter.ts";

export type InputEventRecord = {
  keyPress: EmitterEvent<[KeyPressEvent]>;
  mouseEvent: EmitterEvent<[MouseEvent | MousePressEvent | MouseScrollEvent]>;
  mousePress: EmitterEvent<[MousePressEvent]>;
  mouseScroll: EmitterEvent<[MouseScrollEvent]>;
};

/**
 * Read keypresses from given stdin, parse them and emit to given emitter.
 * On Windows keys are read by calling `_getch()` in `msvcrt.dll`.
 */
export async function emitInputEvents(stdin: Stdin, emitter: EventEmitter<InputEventRecord>) {
  try {
    stdin.setRaw(true, { cbreak: Deno.build.os !== "windows" });
  } catch {
    // omit
  }
  for await (const buffer of stdin.readable) {
    for (const event of decodeBuffer(buffer)) {
      if (event.key === "mouse") {
        emitter.emit("mouseEvent", event);

        if ("button" in event) emitter.emit("mousePress", event);
        else if ("scroll" in event) emitter.emit("mouseScroll", event);
      } else {
        emitter.emit("keyPress", event);
      }
    }
  }
}

const textDecoder = new TextDecoder();

/**
 * Decode character(s) from buffer that was sent to stdin from terminal on mostly
 * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.txt for reference used to create this function
 */
export function* decodeBuffer(
  buffer: Uint8Array,
): Generator<KeyPressEvent | MouseEvent | MousePressEvent | MouseScrollEvent, void, void> {
  const code = textDecoder.decode(buffer);
  yield decodeMouseVT_UTF8(buffer, code) ?? decodeMouseSGR(buffer, code) ?? decodeKey(buffer, code);
}
