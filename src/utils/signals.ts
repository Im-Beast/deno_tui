// Copyright 2023 Im-Beast. All rights reserved. MIT license.
import { BaseSignal, BaseSignalOptions, Signal } from "../signals.ts";

export function signalify<T>(input: T | BaseSignal<T>, options?: BaseSignalOptions): BaseSignal<T> {
  return input instanceof BaseSignal ? input : new Signal(input, options);
}
