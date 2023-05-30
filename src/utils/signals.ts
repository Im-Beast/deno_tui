// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { Signal, SignalOptions } from "../signals/mod.ts";

/** Creates signal from input if it's not already a signal */
export function signalify<T>(input: T | Signal<T>, options?: SignalOptions<T>): Signal<T> {
  return input instanceof Signal ? input : new Signal(input, options);
}
