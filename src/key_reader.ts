// TODO: Use msvcrt.dll on windows to get pressed keys
import type { Range, Stdin } from "./types.ts";

const decoder = new TextDecoder();

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

export interface KeyPress {
  buffer: Uint8Array;
  key: Key;
  meta: boolean;
  shift: boolean;
  ctrl: boolean;
}

export interface MousePress extends Omit<KeyPress, "key"> {
  key: "mouse";
  x: number;
  y: number;
  button: 0 | 1 | 2 | undefined;
  release: boolean;
  drag: boolean;
  scroll: 1 | 0 | -1;
}

export interface MultiKeyPress extends Omit<KeyPress, "buffer" | "key"> {
  buffer: Uint8Array[];
  keys: (KeyPress["key"] | MousePress["key"])[];
}

export async function* readKeypresses(
  stdin: Stdin,
): AsyncGenerator<(KeyPress | MousePress)[], void, void> {
  try {
    Deno.setRaw(
      stdin.rid,
      true,
      Deno.build.os !== "windows" ? { cbreak: true } : undefined,
    );
  } catch {
    //
  }

  while (true) {
    const buffer = new Uint8Array(1024);
    const byteLength = await stdin.read(buffer).catch(() => false);
    if (typeof byteLength !== "number") continue;
    yield [...decodeBuffer(buffer.subarray(0, byteLength))];
  }
}

// Reference: https://invisible-island.net/xterm/ctlseqs/ctlseqs.txt
export function* decodeBuffer(
  buffer: Uint8Array,
): Generator<KeyPress | MousePress, void, void> {
  const decodedBuffer = decoder.decode(buffer);

  let keys: string[] = [];

  if (decodedBuffer.split("\x1b").length > 1) {
    // deno-lint-ignore no-control-regex
    keys = decodedBuffer.split(/(?=\x1b)/);
  } else if (decodedBuffer.length > 1 && !decodedBuffer.includes("\x1b")) {
    keys = decodedBuffer.split("");
  } else {
    keys = [decodedBuffer];
  }

  for (const key of keys) {
    const code = key.replace("\x1b", "");
    const action = code.at(-1);

    // SGR
    if (code.startsWith("[<") && (action === "m" || action === "M")) {
      let [modifier, x, y] = code.slice(2, -1).split(";").map((x) => +x);
      x -= 1;
      y -= 1;

      let scroll: MousePress["scroll"] = 0;
      if (modifier >= 64) {
        scroll = modifier % 2 === 0 ? 1 : -1;
        modifier -= scroll > 0 ? 64 : 65;
      }

      let drag = false;
      if (modifier >= 32) {
        drag = true;
        modifier -= 32;
      }

      let ctrl = false;
      if (modifier >= 16) {
        ctrl = true;
        modifier -= 16;
      }

      let meta = false;
      if (modifier >= 8) {
        meta = true;
        modifier -= 8;
      }

      let shift = false;
      if (modifier >= 4) {
        shift = true;
        modifier -= 4;
      }

      let button: MousePress["button"] = undefined;
      if (!scroll) {
        button = modifier as MousePress["button"];
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
    if (code.startsWith("[M")) {
      let [modifiers, x, y] = code.slice(2).split("").map((x) =>
        x.charCodeAt(0)
      );

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

      const scroll = !!(modifiers & 32) && !!(modifiers & 64)
        ? modifiers & 3 ? 1 : -1
        : 0;

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
          case "[a":
          case "2A":
            keyPress.key = "up";
            keyPress.shift = true;
            break;
          case "Oa":
            keyPress.key = "up";
            keyPress.ctrl = true;
            break;

          case "[B":
          case "OB":
            keyPress.key = "down";
            break;
          case "[b":
          case "[2B":
          case "2B":
            keyPress.key = "down";
            keyPress.shift = true;
            break;
          case "Ob":
            keyPress.key = "down";
            keyPress.ctrl = true;
            break;

          case "[D":
          case "OD":
            keyPress.key = "left";
            break;
          case "[2D":
          case "[d":
          case "2D":
            keyPress.key = "left";
            keyPress.shift = true;
            break;
          case "Od":
            keyPress.key = "left";
            keyPress.ctrl = true;
            break;

          case "[C":
          case "OC":
            keyPress.key = "right";
            break;
          case "[2C":
          case "2C":
          case "[c":
            keyPress.key = "right";
            keyPress.shift = true;
            break;
          case "Oc":
            keyPress.key = "right";
            keyPress.ctrl = true;
            break;

          case "[E":
          case "OE":
            keyPress.key = "clear";
            break;
          case "[e":
            keyPress.key = "clear";
            keyPress.shift = true;
            break;
          case "Oe":
            keyPress.key = "clear";
            keyPress.ctrl = true;
            break;

          case "[H":
          case "OH":
          case "[1~":
          case "[7~":
            keyPress.key = "home";
            break;
          case "[7$":
            keyPress.key = "home";
            keyPress.shift = true;
            break;
          case "[7^":
            keyPress.key = "home";
            keyPress.ctrl = true;
            break;

          case "[F":
          case "OF":
          case "[8~":
          case "[4~":
            keyPress.key = "end";
            break;
          case "[8$":
            keyPress.key = "end";
            keyPress.shift = true;
            break;
          case "[8^":
            keyPress.key = "end";
            keyPress.ctrl = true;
            break;

          case "[2~":
            keyPress.key = "insert";
            break;
          case "[2$":
            keyPress.key = "insert";
            keyPress.shift = true;
            break;
          case "[2^":
            keyPress.key = "insert";
            keyPress.ctrl = true;
            break;

          case "[3~":
            keyPress.key = "delete";
            break;
          case "[3$":
            keyPress.key = "delete";
            keyPress.shift = true;
            break;
          case "[3^":
            keyPress.key = "delete";
            keyPress.ctrl = true;
            break;

          case "[5~":
          case "[[5~":
            keyPress.key = "pageup";
            break;
          case "[5$":
            keyPress.key = "pageup";
            keyPress.shift = true;
            break;
          case "[5^":
            keyPress.key = "pageup";
            keyPress.ctrl = true;
            break;

          case "[6~":
          case "[[6~":
            keyPress.key = "pagedown";
            break;
          case "[6$":
            keyPress.key = "pagedown";
            keyPress.shift = true;
            break;
          case "[6^":
            keyPress.key = "pagedown";
            keyPress.ctrl = true;
            break;

          case "[Z":
            keyPress.key = "tab";
            keyPress.shift = true;
            break;
        }
        break;
    }

    const lowerKey = keyPress.key.toLowerCase() as Key;

    keyPress.shift ||= keyPress.key !== lowerKey;
    keyPress.key = lowerKey;

    yield keyPress;
  }
}
