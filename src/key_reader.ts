// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import type { Range, Stdin } from "./types.ts";

const decoder = new TextDecoder();

//#region Long key types

/** Type defining keys that `key_reader.ts` can distinguish */
export type Key =
  | Alphabet
  | Chars
  | SpecialKeys
  | `${Range<0, 10>}`
  | `f${Range<1, 12>}`;

type Alphabet =
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
  | "pageup"
  | "pagedown"
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

//#endregion

/** Interface defining key press issued to stdin */
export interface KeyPress {
  /** Raw data which was sent to stdin */
  buffer: Uint8Array | number;
  /** Key id */
  key: Key;
  /** Whether meta button (most often alt) was pressed/held when key was pressed */
  meta: boolean;
  /** Whether shift button was pressed/held when key was pressed */
  shift: boolean;
  /** Whether ctrl button was pressed/held when key was pressed */
  ctrl: boolean;
}

/** Interface defining key press issued to stdin using a mouse */
export interface MousePress extends Omit<KeyPress, "key"> {
  /** Mouse key id */
  key: "mouse";
  /** Column on which mouse was when action was taken */
  x: number;
  /** Row on which mouse was when action was taken */
  y: number;
  /**
   *  Mouse button that has been used
   *  - 0 - Left
   *  - 1 - Middle
   *  - 2 - Right
   */
  button: 0 | 1 | 2 | undefined;
  /** Whether mouse button has been released */
  release: boolean;
  /** Whether mouse cursor is dragged */
  drag: boolean;
  /**
   * Whether user scroll
   *  - 1 - Scrolls downwards
   *  - 0 - Doesn't scroll
   *  - -1 - Scrolls upwards)
   */
  scroll: 1 | 0 | -1;
}

/** Interface defining multiple key presses (both {KeyPress} and {MousePress}) that have been issued to stdin at once */
export interface MultiKeyPress extends Omit<KeyPress, "buffer" | "key"> {
  /** MultiKeyPress id */
  key: "multi";
  /** Raw data which was sent to stdin about every key */
  buffer: KeyPress["buffer"][];
  /** Array storing KeyPress information about keys */
  keys: (KeyPress["key"] | MousePress["key"])[];
}

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
        Deno.setRaw(stdin.rid, true);
      } catch { /**/ }

      while (true) {
        let char = await dll.symbols._getch();

        let special: number;
        if (char === 0 || char === 224) {
          special = char;
          char = await dll.symbols._getch();
        }

        yield [...decodeWindowsChar(char, special!)];
      }
    }
    default:
      try {
        Deno.setRaw(stdin.rid, true, { cbreak: true });
      } catch { /**/ }

      while (true) {
        const buffer = new Uint8Array(1024);
        const byteLength = await stdin.read(buffer).catch(() => null);
        if (typeof byteLength !== "number") continue;
        yield [...decodeBuffer(buffer.subarray(0, byteLength))];
      }
  }
}

/** Decode windows character from buffer that was sent to stdin from command line */
export function* decodeWindowsChar(
  buffer: number,
  specialCharCode?: number,
): Generator<KeyPress | MousePress, void, void> {
  const decodedBuffer = String.fromCharCode(buffer);

  const keyPress: KeyPress = {
    buffer,
    key: "" as Key,
    meta: false,
    shift: false,
    ctrl: false,
  };

  if (typeof specialCharCode !== "undefined") {
    switch (buffer) {
      // F1-F10 = 59-68
      // shift:   +25
      // ctrl:    +35
      // meta:    +45
      case 59:
        keyPress.key = "f1";
        break;
      case 59 + 25:
        keyPress.key = "f1";
        keyPress.shift = true;
        break;
      case 59 + 35:
        keyPress.key = "f1";
        keyPress.ctrl = true;
        break;
      case 59 + 45:
        keyPress.key = "f1";
        keyPress.meta = true;
        break;
      case 60:
        keyPress.key = "f2";
        break;
      case 60 + 25:
        keyPress.key = "f2";
        keyPress.shift = true;
        break;
      case 60 + 35:
        keyPress.key = "f2";
        keyPress.ctrl = true;
        break;
      case 60 + 45:
        keyPress.key = "f2";
        keyPress.meta = true;
        break;
      case 61:
        keyPress.key = "f3";
        break;
      case 61 + 25:
        keyPress.key = "f3";
        keyPress.shift = true;
        break;
      case 61 + 35:
        keyPress.key = "f3";
        keyPress.ctrl = true;
        break;
      case 61 + 45:
        keyPress.key = "f3";
        keyPress.meta = true;
        break;
      case 62:
        keyPress.key = "f4";
        break;
      case 62 + 25:
        keyPress.key = "f4";
        keyPress.shift = true;
        break;
      case 62 + 35:
        keyPress.key = "f4";
        keyPress.ctrl = true;
        break;
      case 62 + 45:
        keyPress.key = "f4";
        keyPress.meta = true;
        break;
      case 63:
        keyPress.key = "f5";
        break;
      case 63 + 25:
        keyPress.key = "f5";
        keyPress.shift = true;
        break;
      case 63 + 35:
        keyPress.key = "f5";
        keyPress.ctrl = true;
        break;
      case 63 + 45:
        keyPress.key = "f5";
        keyPress.meta = true;
        break;
      case 64:
        keyPress.key = "f6";
        break;
      case 64 + 25:
        keyPress.key = "f6";
        keyPress.shift = true;
        break;
      case 64 + 35:
        keyPress.key = "f6";
        keyPress.ctrl = true;
        break;
      case 65:
        keyPress.key = "f7";
        break;
      case 65 + 25:
        keyPress.key = "f7";
        keyPress.shift = true;
        break;
      case 65 + 35:
        keyPress.key = "f7";
        keyPress.ctrl = true;
        break;
      case 65 + 45:
        keyPress.key = "f7";
        keyPress.meta = true;
        break;
      case 66:
        keyPress.key = "f8";
        break;
      case 66 + 25:
        keyPress.key = "f8";
        keyPress.shift = true;
        break;
      case 66 + 35:
        keyPress.key = "f8";
        keyPress.ctrl = true;
        break;
      case 66 + 45:
        keyPress.key = "f8";
        keyPress.meta = true;
        break;
      case 67:
        keyPress.key = "f9";
        break;
      case 67 + 25:
        keyPress.key = "f9";
        keyPress.shift = true;
        break;
      case 67 + 35:
        keyPress.key = "f9";
        keyPress.ctrl = true;
        break;
      case 67 + 45:
        keyPress.key = "f9";
        keyPress.meta = true;
        break;
      case 68:
        keyPress.key = "f10";
        break;
      case 68 + 25:
        keyPress.key = "f10";
        keyPress.shift = true;
        break;
      case 68 + 35:
        keyPress.key = "f10";
        keyPress.ctrl = true;
        break;
      case 68 + 45:
        keyPress.key = "f10";
        keyPress.meta = true;
        break;
      // F11-F12 = 133-134
      // shift:    +2
      // ctrl:     +4
      // meta:     +6
      case 133:
        keyPress.key = "f11";
        break;
      case 135:
        keyPress.key = "f11";
        keyPress.shift = true;
        break;
      case 137:
        keyPress.key = "f11";
        keyPress.ctrl = true;
        break;
      case 139:
        keyPress.key = "f11";
        keyPress.meta = true;
        break;
      case 134:
        keyPress.key = "f12";
        break;
      case 136:
        keyPress.key = "f12";
        keyPress.shift = true;
        break;
      case 138:
        keyPress.key = "f12";
        keyPress.ctrl = true;
        break;
      case 140:
        keyPress.key = "f12";
        keyPress.meta = true;
        break;

      case 72:
        keyPress.key = "up";
        break;
      case 141:
        keyPress.key = "up";
        keyPress.ctrl = true;
        break;
      case 152:
        keyPress.key = "up";
        keyPress.meta = true;
        break;

      case 80:
        keyPress.key = "down";
        break;
      case 145:
        keyPress.key = "down";
        keyPress.ctrl = true;
        break;
      case 160:
        keyPress.key = "down";
        keyPress.meta = true;
        break;

      case 75:
        keyPress.key = "left";
        break;
      case 115:
        keyPress.key = "left";
        keyPress.ctrl = true;
        break;
      case 155:
        keyPress.key = "left";
        keyPress.meta = true;
        break;

      case 77:
        keyPress.key = "right";
        break;
      case 116:
        keyPress.key = "right";
        keyPress.ctrl = true;
        break;
      case 157:
        keyPress.key = "right";
        keyPress.meta = true;
        break;

      case 82:
        keyPress.key = "insert";
        break;
      case 146:
        keyPress.key = "insert";
        keyPress.ctrl = true;
        break;
      case 162:
        keyPress.key = "insert";
        keyPress.meta = true;
        break;

      case 83:
        keyPress.key = "delete";
        break;
      case 147:
        keyPress.key = "delete";
        keyPress.ctrl = true;
        break;
      case 163:
        keyPress.key = "delete";
        keyPress.meta = true;
        break;

      case 71:
        keyPress.key = "home";
        break;
      case 119:
        keyPress.key = "home";
        keyPress.ctrl = true;
        break;
      case 151:
        keyPress.key = "home";
        keyPress.meta = true;
        break;

      case 79:
        keyPress.key = "end";
        break;
      case 117:
        keyPress.key = "end";
        keyPress.ctrl = true;
        break;
      case 159:
        keyPress.key = "end";
        keyPress.meta = true;
        break;

      case 73:
        keyPress.key = "pageup";
        break;
      // Windows is so dumb, F12 is the same as pageup with ctrl held
      // case 134:
      //   keyPress.key = "pageup";
      //   keyPress.ctrl = true;
      //   break;
      case 153:
        keyPress.key = "pageup";
        keyPress.meta = true;
        break;

      case 81:
        keyPress.key = "pagedown";
        break;
      case 118:
        keyPress.key = "pagedown";
        keyPress.ctrl = true;
        break;
      case 161:
        keyPress.key = "pagedown";
        keyPress.meta = true;
        break;
    }
  } else {
    switch (buffer) {
      case 13:
        keyPress.key = "return";
        break;
      case 32:
        keyPress.key = "space";
        break;
      case 9:
        keyPress.key = "tab";
        break;
      case 27:
        keyPress.key = "escape";
        break;
      case 8:
        keyPress.key = "backspace";
        break;
      default:
        {
          const offset96 = String.fromCharCode(buffer + 96);
          if (/[a-z]/.test(offset96)) {
            keyPress.key = offset96 as Alphabet;
            keyPress.ctrl = true;
          } else {
            keyPress.key = decodedBuffer.toLowerCase() as Key;
            keyPress.shift = keyPress.key !== decodedBuffer;
          }
        }
        break;
    }
  }

  yield keyPress;
}

/**
 * Decode character(s) from buffer that was sent to stdin from terminal on mostly
 * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.txt for reference used to create this function
 */
export function* decodeBuffer(buffer: Uint8Array): Generator<KeyPress | MousePress, void, void> {
  const decodedBuffer = decoder.decode(buffer);

  let codes: string[] = [];

  if (decodedBuffer.split("\x1b").length > 1) {
    codes = decodedBuffer.split(/(?=\x1b)/);
  } else if (decodedBuffer.length > 1 && !decodedBuffer.includes("\x1b")) {
    codes = decodedBuffer.split("");
  } else {
    codes = [decodedBuffer];
  }

  for (let key of codes) {
    key = key.replace("\x1b", "");
    const action = key.at(-1);

    // SGR
    if (key.startsWith("[<") && (action === "m" || action === "M")) {
      let [modifiers, x, y] = key.slice(2, -1).split(";").map((x) => +x);
      x -= 1;
      y -= 1;

      let scroll: MousePress["scroll"] = 0;
      if (modifiers >= 64) {
        scroll = modifiers % 2 === 0 ? -1 : 1;
        modifiers -= scroll < 0 ? 64 : 65;
      }

      let drag = false;
      if (modifiers >= 32) {
        drag = true;
        modifiers -= 32;
      }

      let ctrl = false;
      if (modifiers >= 16) {
        ctrl = true;
        modifiers -= 16;
      }

      let meta = false;
      if (modifiers >= 8) {
        meta = true;
        modifiers -= 8;
      }

      let shift = false;
      if (modifiers >= 4) {
        shift = true;
        modifiers -= 4;
      }

      let button: MousePress["button"] = undefined;
      if (!scroll) {
        button = modifiers as MousePress["button"];
      }

      const mousePress: MousePress = {
        buffer,
        key: "mouse",
        shift,
        ctrl,
        meta,
        button,
        release: action === "m",
        drag,
        scroll,
        x,
        y,
      };
      yield mousePress;
      continue;
    }

    // VT and UTF-8
    if (key.startsWith("[M")) {
      let [modifiers, x, y] = key.slice(2).split("").map((x) => x.charCodeAt(0));

      x -= 0o41;
      y -= 0o41;

      const buttonInfo = modifiers & 3;
      let button: MousePress["button"] = undefined;
      let release = false;

      if (buttonInfo === 3) {
        release = true;
      } else {
        button = buttonInfo as MousePress["button"];
      }

      const shift = !!(modifiers & 4);
      const meta = !!(modifiers & 8);
      const ctrl = !!(modifiers & 16);

      const scroll = !!(modifiers & 32) && !!(modifiers & 64) ? modifiers & 3 ? 1 : -1 : 0;

      const drag = !scroll && !!(modifiers & 64);

      const mousePress: MousePress = {
        buffer,
        key: "mouse",
        meta,
        shift,
        ctrl,
        button,
        drag,
        release,
        scroll,
        x,
        y,
      };

      yield mousePress;
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
      case "\n":
        keyPress.key = "return";
        break;
      case "\t":
        keyPress.key = "tab";
        break;
      case "\b":
      case "\x7f":
        keyPress.key = "backspace";
        break;
      case "\x1b":
        keyPress.key = "escape";
        break;
      case " ":
        keyPress.key = "space";
        break;
      default:
        {
          if (buffer[0] !== 27) {
            const offset96 = String.fromCharCode(buffer[0] + 96);
            if (/[a-z]/.test(offset96)) {
              keyPress.key = offset96 as Alphabet;
              keyPress.ctrl = true;
              break;
            }
          }

          if (key.length === 1 && /[a-zA-Z]/.test(key)) {
            const lowerCase = key.toLowerCase();
            keyPress.key = lowerCase as Key;
            keyPress.shift = key !== lowerCase;
            keyPress.meta = buffer[0] === 27;
            break;
          }

          const modifier = key.match(/\d+.+(\d+)/)?.[1] ?? "";
          switch (modifier) {
            case "5":
              keyPress.ctrl = true;
              break;
            case "3":
              keyPress.meta = true;
              break;
            case "2":
              keyPress.shift = true;
              break;
          }

          key = key.replace(`1;${modifier}`, "").replace(`;${modifier}`, "").replace("1;", "");
          switch (key) {
            case "OP":
            case "[P":
              keyPress.key = "f1";
              break;
            case "OG":
            case "[Q":
              keyPress.key = "f2";
              break;
            case "OR":
            case "[R":
              keyPress.key = "f3";
              break;
            case "OS":
            case "[S":
              keyPress.key = "f4";
              break;
            case "[15~":
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
              keyPress.key = "up";
              break;
            case "[B":
              keyPress.key = "down";
              break;
            case "[C":
              keyPress.key = "right";
              break;
            case "[D":
              keyPress.key = "left";
              break;

            case "[2~":
              keyPress.key = "insert";
              break;
            case "[3~":
              keyPress.key = "delete";
              break;

            case "[5~":
              keyPress.key = "pageup";
              break;
            case "[6~":
              keyPress.key = "pagedown";
              break;

            case "[H":
              keyPress.key = "home";
              break;
            case "[F":
              keyPress.key = "end";
              break;

            case "[E":
              keyPress.key = "clear";
              break;
          }
        }
        break;
    }

    yield keyPress;
  }
}
