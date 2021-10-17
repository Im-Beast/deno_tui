import { Reader } from "./types.ts";

const decoder = new TextDecoder();

export interface KeyPress {
  buffer: Uint8Array;
  key: string;
  meta: boolean;
  shift: boolean;
  ctrl: boolean;
}

export async function* readKeypresses(
  reader: Reader,
): AsyncIterableIterator<KeyPress[]> {
  while (true) {
    const buffer = new Uint8Array(1024);
    Deno.setRaw(reader.rid, true, { cbreak: true });

    const byteLength = await reader.read(buffer);
    if (typeof byteLength !== "number") continue;

    Deno.setRaw(reader.rid, false, { cbreak: true });

    yield decodeBuffer(buffer.subarray(0, byteLength));
  }
}

export function decodeBuffer(buffer: Uint8Array): KeyPress[] {
  const decodedBuffer = decoder.decode(buffer);
  let keys = [decodedBuffer];

  // Splitting seems fine, i'm expecting bugs though
  if (decodedBuffer.split("\x1b").length > 1) {
    // deno-lint-ignore no-control-regex
    keys = decodedBuffer.split(/(?=\x1b)/);
  } else if (decodedBuffer.length > 1 && !decodedBuffer.includes("\x1b")) {
    keys = decodedBuffer.split("");
  }

  const keyPresses = keys.map((key) => {
    const keyPress: KeyPress = {
      buffer,
      key: key,
      meta: false,
      shift: false,
      ctrl: false,
    };

    const code = keyPress.key.replace("\x1b", "").replace("1;", "");

    switch (keyPress.key) {
      case "\r":
        keyPress.key = "return";
        break;
      case "\n":
        keyPress.key = "enter";
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
            keyPress.key = "end";
            break;

          case "[2~":
            keyPress.key = "insert";
            break;
          case "[3~":
            keyPress.key = "delete";
            break;
          case "[4~":
            keyPress.key = "end";
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

          default:
            break;
        }
        break;
    }

    return keyPress;
  });

  return keyPresses;
}
