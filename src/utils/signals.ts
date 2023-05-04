// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { BaseSignal, BaseSignalOptions, Signal } from "../signals.ts";

/** Creates signal from input if it's not already a signal */
export function signalify<T>(input: T | BaseSignal<T>, options?: BaseSignalOptions): BaseSignal<T> {
  return input instanceof BaseSignal ? input : new Signal(input, options);
}
