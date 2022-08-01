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
  buffer: Uint8Array | number;
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
  buffer: KeyPress["buffer"][];
  keys: (KeyPress["key"] | MousePress["key"])[];
}

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
        // TODO: Make reading keypresses happen in a Worker
        // Not sure whether this is actually needed although worth consideration
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
          // TODO: Test whether this doesn't introduce any misunderstood presses
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

// Reference: https://invisible-island.net/xterm/ctlseqs/ctlseqs.txt
export function* decodeBuffer(buffer: Uint8Array): Generator<KeyPress | MousePress, void, void> {
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
      let [modifiers, x, y] = code.slice(2, -1).split(";").map((x) => +x);
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
    if (code.startsWith("[M")) {
      let [modifiers, x, y] = code.slice(2).split("").map((x) => x.charCodeAt(0));

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
