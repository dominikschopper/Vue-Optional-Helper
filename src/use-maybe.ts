import { computed, type ComputedRef } from 'vue';

type Maybe<T> = T | null | undefined;

interface MaybeOperations<T> {
  readonly unwrap: ComputedRef<Maybe<T>>;
  readonly hasValue: ComputedRef<boolean>;
  readonly isEmpty: ComputedRef<boolean>;
  
  map: <R>(fn: (val: T) => R) => MaybeOperations<R>;
  flatMap: <R>(fn: (val: T) => Maybe<R>) => MaybeOperations<R>;
  filter: (predicate: (val: T) => boolean) => MaybeOperations<T>;
  orElse: (defaultValue: T) => ComputedRef<T>;
  orElseGet: (supplier: () => T) => ComputedRef<T>;
  ifPresent: (consumer: (val: T) => void) => void;
  getOrThrow: (error?: string | Error) => T;
}

export function useMaybe<T>(value: Maybe<T>): MaybeOperations<T> {
  const maybeValue = computed(() => value);
  
  const hasValue = computed(() => 
    maybeValue.value !== null && maybeValue.value !== undefined
  );
  
  const isEmpty = computed(() => 
    maybeValue.value === null || maybeValue.value === undefined
  );
  
  const map = <R>(fn: (val: T) => R): MaybeOperations<R> => {
    const mappedValue = computed(() => 
      hasValue.value ? fn(maybeValue.value as T) : undefined
    );
    return useMaybe(mappedValue.value);
  };
  
  const flatMap = <R>(fn: (val: T) => Maybe<R>): MaybeOperations<R> => {
    const flatMappedValue = computed(() => 
      hasValue.value ? fn(maybeValue.value as T) : undefined
    );
    return useMaybe(flatMappedValue.value);
  };
  
  const filter = (predicate: (val: T) => boolean): MaybeOperations<T> => {
    const filteredValue = computed(() => 
      hasValue.value && predicate(maybeValue.value as T) 
        ? maybeValue.value 
        : undefined
    );
    return useMaybe(filteredValue.value);
  };
  
  const orElse = (defaultValue: T): ComputedRef<T> => 
    computed(() => hasValue.value ? maybeValue.value as T : defaultValue);
  
  const orElseGet = (supplier: () => T): ComputedRef<T> => 
    computed(() => hasValue.value ? maybeValue.value as T : supplier());
  
  const ifPresent = (consumer: (val: T) => void): void => {
    if (hasValue.value) {
      consumer(maybeValue.value as T);
    }
  };
  
  const getOrThrow = (error?: string | Error): T => {
    if (!hasValue.value) {
      if (error instanceof Error) throw error;
      throw new Error(error || 'Value is not present');
    }
    return maybeValue.value as T;
  };
  
  return {
    unwrap: maybeValue,
    hasValue,
    isEmpty,
    map,
    flatMap,
    filter,
    orElse,
    orElseGet,
    ifPresent,
    getOrThrow
  };
}

// Hilfsfunktion für verschachtelte Properties
export function useMaybePath<T, R>(
  obj: Maybe<T>,
  accessor: (val: T) => R
): MaybeOperations<R> {
  return useMaybe(obj).map(accessor);
}