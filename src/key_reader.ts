// Copyright 2022 Im-Beast. All rights reserved. MIT license.

import type { Alphabet, Key, KeyPress, MousePress, Stdin } from "./types.ts";

const textDecoder = new TextDecoder();

/**
 * Read keypresses from given stdin (except for Windows) and then parse them.
 * On Windows keys are read by calling `_getch()` in `msvcrt.dll`.
 * It yields array of either KeyPress or MousePress
 */
export async function* readKeypresses(stdin: Stdin): AsyncGenerator<(KeyPress | MousePress)[], void, void> {
  try {
    stdin.setRaw(true, { cbreak: Deno.build.os !== "windows" });
  } catch { /**/ }

  for await (const buffer of stdin.readable) {
    yield [...decodeBuffer(buffer)];
  }
}

/**
 * Decode character(s) from buffer that was sent to stdin from terminal on mostly
 * @see https://invisible-island.net/xterm/ctlseqs/ctlseqs.txt for reference used to create this function
 */
export function* decodeBuffer(buffer: Uint8Array): Generator<KeyPress | MousePress, void, void> {
  const decodedBuffer = textDecoder.decode(buffer);

  let codes: string[] = [];

  if (decodedBuffer.split("\x1b").length > 1) {
    codes = decodedBuffer.split(/(?=\x1b)/);
  } else if (decodedBuffer.length > 1 && !decodedBuffer.includes("\x1b")) {
    codes = decodedBuffer.split("");
  } else {
    codes = [decodedBuffer];
  }

  for (let code of codes) {
    code = code.replace("\x1b", "");

    const mousePress = decodeMouseSGR(buffer, code) ?? decodeMouseVT_UTF8(buffer, code);
    if (mousePress) {
      yield mousePress;
      continue;
    }

    yield decodeKey(buffer, code);
  }
}

/** Decode code sequence to {KeyPress} object. */
export function decodeKey(buffer: Uint8Array, code: string): KeyPress {
  const keyPress: KeyPress = {
    buffer,
    key: code as Key,
    meta: false,
    shift: false,
    ctrl: false,
  };

  switch (code) {
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
        } else if (buffer.length === 1) {
          keyPress.key = "escape";
          break;
        }

        if (code.length === 1 && /[a-zA-Z]/.test(code)) {
          const lowerCase = code.toLowerCase();
          keyPress.key = lowerCase as Key;
          keyPress.shift = code !== lowerCase;
          keyPress.meta = buffer[0] === 27;
          break;
        }

        const modifier = code.match(/\d+.+(\d+)/)?.[1] ?? "";
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

        code = code.replace(`1;${modifier}`, "").replace(`;${modifier}`, "").replace("1;", "");
        switch (code) {
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

  return keyPress;
}

/**
 * Decode SGR mouse mode code sequence to {MousePress} object.
 * If it can't convert specified {code} to {MousePress} it returns undefined.
 */
export function decodeMouseSGR(buffer: Uint8Array, code: string): MousePress | undefined {
  const action = code.at(-1);

  if (!code.startsWith("[<") || (action !== "m" && action !== "M")) {
    return undefined;
  }

  const release = action === "m";

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

  return {
    key: "mouse",
    buffer,
    release,
    shift,
    ctrl,
    meta,
    button,
    drag,
    scroll,
    x,
    y,
  };
}

/**
 * Decode VT and UTF8 mouse mode code sequence to {MousePress} object.
 * If it can't convert specified {code} to {MousePress} it returns undefined.
 */
export function decodeMouseVT_UTF8(buffer: Uint8Array, code: string): MousePress | undefined {
  if (!code.startsWith("[M")) return undefined;

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

  return {
    key: "mouse",
    buffer,
    release,
    shift,
    ctrl,
    meta,
    button,
    drag,
    scroll,
    x,
    y,
  };
}
