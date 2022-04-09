// Copyright 2021 Im-Beast. All rights reserved. MIT license.
import { EventEmitter } from "./event_emitter.ts";
import { Tui } from "./tui.ts";
import { Range, Reader } from "./types.ts";

const decoder = new TextDecoder();

/** Type for mostly every key name that `decodeBuffer` can recognize */
export type Key =
  | Alphabet
  | Chars
  | SpecialKeys
  | `f${Range<1, 12>}`
  | `${Range<0, 10>}`
  | "mouse";

type SpecialKeys =
  | "return"
  | "tab"
  | "backspace"
  | "escape"
  | "space"
  | "up"
  | "down"
  | "left"
  | "right"
  | "clear"
  | "insert"
  | "delete"
  | `page${"up" | "down"}`
  | "home"
  | "end"
  | "tab";

type Chars =
  | "!"
  | "@"
  | "#"
  | "$"
  | "%"
  | "^"
  | "&"
  | "*"
  | "("
  | ")"
  | "-"
  | "_"
  | "="
  | "+"
  | "["
  | "{"
  | "]"
  | "}"
  | "'"
  | '"'
  | ";"
  | ":"
  | ","
  | "<"
  | "."
  | ">"
  | "/"
  | "?"
  | "\\"
  | "|";

type Alphabet = aToZ;

type aToZ =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";

/** KeyPress is an object that stores data about KeyPress issued to stdin */
export interface KeyPress {
  /** Raw buffer of keypress */
  buffer: Uint8Array;
  /** Key that has been pressed */
  key: Key;
  /** Whether meta key has been pressed as well when keypress happened */
  meta: boolean;
  /** Whether shift key has been pressed as well when keypress happened */
  shift: boolean;
  /** Whether ctrl key has been pressed as well when keypress happened */
  ctrl: boolean;
}

/** MousePress is an object that stores data about MousePress issued to stdin */
export interface MousePress extends KeyPress {
  /** Horizontal position of mouse click */
  x: number;
  /** Vertical position of mouse click */
  y: number;
  /** Mouse button that has been pressed (0 - Left, 1 - Middle, 2 - Right) */
  button: 0 | 1 | 2 | undefined;
  /** Whether mouse button(s) have been released */
  release: boolean;
  /** Whether mouse cursor is dragged */
  drag: boolean;
  /** Whether user scroll (1 - Scrolls downwards, 0 - Doesn't scroll, -1 - Scrolls upwards)*/
  scroll: 1 | 0 | -1;
}

/** MultiKeyPress is an object that stores data about multiple KeyPresses issued to stdin at the same time */
export interface MultiKeyPress extends Omit<KeyPress, "buffer" | "key"> {
  /** Raw buffers of keypress */
  buffer: Uint8Array[];
  /** Keys that has been pressed */
  keys: Key[];
}

/**
 * Emit pressed keys to tui and its focused objects
 * @param tui - Tui from which keys will be redirected to focused items
 * @example
 * ```ts
 * const tui = createTui(...);
 * ...
 * handleKeypresses(tui);
 * ```
 */
export function handleKeypresses(tui: Tui): void {
  tui.on("key", (keyPress) => {
    tui.focused.items?.forEach((c) => c?.emit("key", keyPress));
  });

  tui.on("mouse", (mousePress) => {
    tui.focused.items?.forEach((c) => c?.emit("mouse", mousePress));
  });

  tui.on("multiKey", (multiKeyPress) => {
    tui.focused.items?.forEach((c) => c?.emit("multiKey", multiKeyPress));
  });

  readKeypressesEmitter(tui.reader, Reflect.get(tui, "emitter"));
}

/**
 * Read keypresses from stdin and redirect them to EventEmitter on `key` event.
 * They're both mouse and keyboard key presses.
 * @param reader - Reader from which keypresses will be read
 * @param emitter - EventEmitter to which keypresses will be redirected
 * @example
 * ```ts
 * const emitter = createEventEmitter<"key" | "multiKey" | "mouse", KeyPress, MousePress>();
 * readKeypressesEmitter(Deno.stdin, emitter);
 * ```
 */
export async function readKeypressesEmitter(
  reader: Reader,
  // deno-lint-ignore no-explicit-any
  emitter: EventEmitter<any, any>,
): Promise<void> {
  for await (const [keyPresses, mousePresses] of readKeypresses(reader)) {
    const multiKey: MultiKeyPress = {
      keys: [],
      buffer: [],
      ctrl: false,
      meta: false,
      shift: false,
    };

    for (const keyPress of keyPresses) {
      emitter.emit("key", keyPress);

      multiKey.keys.push(keyPress.key);
      multiKey.buffer.push(keyPress.buffer);
      multiKey.shift ||= keyPress.shift;
      multiKey.meta ||= keyPress.meta;
      multiKey.ctrl ||= keyPress.ctrl;
    }

    if (keyPresses.length > 1) {
      emitter.emit("multiKey", multiKey);
    }

    for (const mousePress of mousePresses) {
      emitter.emit("mouse", mousePress);
    }
  }
}

/**
 * Read keypresses from stdin
 * @param reader - Reader from which keypresses will be read
 * @example
 * ```ts
 * for await (const [keyPresses, mousePresses] of readKeypresses(Deno.stdin)) {
 *  ...
 * }
 * ```
 */
export async function* readKeypresses(
  reader: Reader,
): AsyncIterableIterator<[KeyPress[], MousePress[]]> {
  Deno.setRaw(
    reader.rid,
    true,
    Deno.build.os !== "windows" ? { cbreak: true } : undefined,
  );

  while (true) {
    const buffer = new Uint8Array(1024);

    const byteLength = await reader.read(buffer);
    if (typeof byteLength !== "number") continue;

    yield decodeBuffer(buffer.subarray(0, byteLength));
  }
}

/**
 * Decodes Uint8Array buffer to easily usable array of KeyPress objects
 * @param buffer - raw keypress buffer
 * @example
 * ```ts
 * const buffer = new Uint8Array(1024);
 * const byteLength = Deno.stdin.read(buffer);
 * if (typeof byteLength === "number") {
 *  const [keyPresses, mousePresses] = decodeBuffer(
 *    buffer.subarray(0, byteLength)
 *  );
 * }
 * ```
 */
export function decodeBuffer(buffer: Uint8Array): [KeyPress[], MousePress[]] {
  const decodedBuffer = decoder.decode(buffer);

  let keys: string[] = [decodedBuffer];
  if (decodedBuffer.split("\x1b").length > 1) {
    // deno-lint-ignore no-control-regex
    keys = decodedBuffer.split(/(?=\x1b)/);
  } else if (decodedBuffer.length > 1 && !decodedBuffer.includes("\x1b")) {
    keys = decodedBuffer.split("");
  }

  const keyPresses: KeyPress[] = [];
  const mousePresses: MousePress[] = [];

  for (const key of keys) {
    const code = key.replace("\x1b", "").replace("1;", "");

    /**
     * Originally created by @TooTallNate
     * https://github.com/TooTallNate/keypress/blob/9f1cc0ec7ac98a4aad0e0612ec14bf1b18c32eed/index.js#L370
     */
    if (code.startsWith("[M")) {
      const b = code.charCodeAt(2);
      const mousePress: MousePress = {
        buffer,
        key: "mouse",
        meta: !!(1 << 3 & b),
        shift: !!(1 << 2 & b),
        ctrl: !!(1 << 4 & b),
        button: undefined,
        release: (3 & b) === 3,
        drag: !(1 << 5 & b),
        scroll: (1 << 6 & b) && (1 << 5 & b) ? 1 & b ? 1 : -1 : 0,
        x: code.charCodeAt(3) - 33,
        y: code.charCodeAt(4) - 33,
      };

      if (!mousePress.release && !mousePress.scroll) {
        mousePress.button = (b & 3) as 0 | 1 | 2;
      }

      mousePresses.push(mousePress);
      continue;
    }

    const keyPress: KeyPress = {
      buffer,
      key: key as Key,
      meta: false,
      shift: false,
      ctrl: false,
    };

    switch (key) {
      case "\r":
        keyPress.key = "return";
        break;
      case "\n":
        keyPress.key = "return";
        break;
      case "\t":
        keyPress.key = "tab";
        break;
      case "\b":
      case "\x7f":
      case "\x1b\x7f":
      case "\x1b\b":
        keyPress.key = "backspace";
        break;
      case "\x1b":
      case "\x1b\x1b":
        keyPress.key = "escape";
        break;
      case " ":
      case "\x1b ":
        keyPress.key = "space";
        break;
      default:
        switch (code) {
          case "OP":
          case "[11~":
          case "[[A":
            keyPress.key = "f1";
            break;
          case "OQ":
          case "[12~":
          case "[[B":
            keyPress.key = "f2";
            break;
          case "OR":
          case "[13~":
          case "[[C":
            keyPress.key = "f3";
            break;
          case "OS":
          case "[14~":
          case "[[D":
            keyPress.key = "f4";
            break;
          case "[15~":
          case "[[E":
            keyPress.key = "f5";
            break;
          case "[17~":
            keyPress.key = "f6";
            break;
          case "[18~":
            keyPress.key = "f7";
            break;
          case "[19~":
            keyPress.key = "f8";
            break;
          case "[20~":
            keyPress.key = "f9";
            break;
          case "[21~":
            keyPress.key = "f10";
            break;
          case "[23~":
            keyPress.key = "f11";
            break;
          case "[24~":
            keyPress.key = "f12";
            break;
          case "[A":
          case "OA":
            keyPress.key = "up";
            break;
          case "[2A":
          case "2A":
            keyPress.key = "up";
            keyPress.shift = true;
            break;
          case "[B":
          case "OB":
            keyPress.key = "down";
            break;
          case "[2B":
          case "2B":
            keyPress.key = "down";
            keyPress.shift = true;
            break;
          case "[D":
          case "OD":
            keyPress.key = "left";
            break;
          case "[2D":
          case "2D":
            keyPress.key = "left";
            keyPress.shift = true;
            break;
          case "[C":
          case "OC":
            keyPress.key = "right";
            break;
          case "[2C":
          case "2C":
            keyPress.key = "right";
            keyPress.shift = true;
            break;
          case "[E":
          case "OE":
            keyPress.key = "clear";
            break;
          case "[H":
          case "OH":
          case "[1~":
          case "[7~":
            keyPress.key = "home";
            break;
          case "[F":
          case "OF":
          case "[8~":
          case "[4~":
            keyPress.key = "end";
            break;
          case "[2~":
            keyPress.key = "insert";
            break;
          case "[3~":
            keyPress.key = "delete";
            break;
          case "[5~":
          case "[[5~":
            keyPress.key = "pageup";
            break;
          case "[6~":
          case "[[6~":
            keyPress.key = "pagedown";
            break;
          case "[a":
            keyPress.key = "up";
            keyPress.shift = true;
            break;
          case "[b":
            keyPress.key = "down";
            keyPress.shift = true;
            break;
          case "[d":
            keyPress.key = "left";
            keyPress.shift = true;
            break;
          case "[c":
            keyPress.key = "right";
            keyPress.shift = true;
            break;
          case "[e":
            keyPress.key = "clear";
            keyPress.shift = true;
            break;
          case "[2$":
            keyPress.key = "insert";
            keyPress.shift = true;
            break;
          case "[3$":
            keyPress.key = "delete";
            keyPress.shift = true;
            break;
          case "[5$":
            keyPress.key = "pageup";
            keyPress.shift = true;
            break;
          case "[6$":
            keyPress.key = "pagedown";
            keyPress.shift = true;
            break;
          case "[7$":
            keyPress.key = "home";
            keyPress.shift = true;
            break;
          case "[8$":
            keyPress.key = "end";
            keyPress.shift = true;
            break;
          case "Oa":
            keyPress.key = "up";
            keyPress.ctrl = true;
            break;
          case "Ob":
            keyPress.key = "down";
            keyPress.ctrl = true;
            break;
          case "Od":
            keyPress.key = "left";
            keyPress.ctrl = true;
            break;
          case "Oc":
            keyPress.key = "right";
            keyPress.ctrl = true;
            break;
          case "Oe":
            keyPress.key = "clear";
            keyPress.ctrl = true;
            break;
          case "[2^":
            keyPress.key = "insert";
            keyPress.ctrl = true;
            break;
          case "[3^":
            keyPress.key = "delete";
            keyPress.ctrl = true;
            break;
          case "[5^":
            keyPress.key = "pageup";
            keyPress.ctrl = true;
            break;
          case "[6^":
            keyPress.key = "pagedown";
            keyPress.ctrl = true;
            break;
          case "[7^":
            keyPress.key = "home";
            keyPress.ctrl = true;
            break;
          case "[8^":
            keyPress.key = "end";
            keyPress.ctrl = true;
            break;
          case "[Z":
            keyPress.key = "tab";
            keyPress.shift = true;
            break;
        }
        break;
    }

    keyPress.shift = keyPress.shift ||
      keyPress.key === keyPress.key.toUpperCase();
    keyPress.key = keyPress.key.toLowerCase() as Key;

    keyPresses.push(keyPress);
  }

  return [keyPresses, mousePresses];
}
