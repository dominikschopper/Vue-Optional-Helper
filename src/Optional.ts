import { computed, type ComputedRef, type Ref } from 'vue';

type Nullable<T> = T | null | undefined;

export interface Optional<T> {
  map<R>(mapper: (value: T) => R): Optional<R>;
  flatMap<R>(mapper: (value: T) => Nullable<R>): Optional<R>;
  filter(predicate: (value: T) => boolean): Optional<T>;
  or(supplier: () => Optional<T>): Optional<T>;
  orElse(other: T): T;
  orElseGet(supplier: () => T): T;
  orElseThrow(errorSupplier?: () => Error): T;
  ifPresent(consumer: (value: T) => void): void;
  ifPresentOrElse(action: (value: T) => void, emptyAction: () => void): void;
  isPresent(): boolean;
  isEmpty(): boolean;
  equals(other: Optional<T>): boolean;
  get(): T;
  unwrap(): Nullable<T>;
}

function createOptional<T>(value: Nullable<T>): Optional<T> {
  const isPresent = (): boolean => {
    return value !== null && value !== undefined;
  };

  const isEmpty = (): boolean => {
    return value === null || value === undefined;
  };

  const get = (): T => {
    if (isEmpty()) {
      throw new Error('No value present in Optional');
    }
    return value as T;
  };

  const unwrap = (): Nullable<T> => {
    return value;
  };

  const map = <R>(mapper: (value: T) => R): Optional<R> => {
    if (isEmpty()) {
      return createOptional<R>(undefined);
    }
    const mapped = mapper(value as T);
    return createOptional(mapped);
  };

  const flatMap = <R>(mapper: (value: T) => Nullable<R>): Optional<R> => {
    if (isEmpty()) {
      return createOptional<R>(undefined);
    }
    const mapped = mapper(value as T);
    return createOptional(mapped);
  };

  const filter = (predicate: (value: T) => boolean): Optional<T> => {
    if (isEmpty()) {
      return createOptional<T>(value);
    }
    return predicate(value as T) ? createOptional(value) : createOptional<T>(undefined);
  };

  const or = (supplier: () => Optional<T>): Optional<T> => {
    return isPresent() ? createOptional(value) : supplier();
  };

  const orElse = (other: T): T => {
    return isPresent() ? (value as T) : other;
  };

  const orElseGet = (supplier: () => T): T => {
    return isPresent() ? (value as T) : supplier();
  };

  const orElseThrow = (errorSupplier?: () => Error): T => {
    if (isEmpty()) {
      const error = errorSupplier ? errorSupplier() : new Error('No value present in Optional');
      throw error;
    }
    return value as T;
  };

  const ifPresent = (consumer: (value: T) => void): void => {
    if (isPresent()) {
      consumer(value as T);
    }
  };

  const ifPresentOrElse = (action: (value: T) => void, emptyAction: () => void): void => {
    if (isPresent()) {
      action(value as T);
    } else {
      emptyAction();
    }
  };

  const equals = (other: Optional<T>): boolean => {
    if (isPresent() && other.isPresent()) {
      return value === other.unwrap();
    }
    return isEmpty() && other.isEmpty();
  };

  return {
    map,
    flatMap,
    filter,
    or,
    orElse,
    orElseGet,
    orElseThrow,
    ifPresent,
    ifPresentOrElse,
    isPresent,
    isEmpty,
    equals,
    get,
    unwrap,
  };
}

// Export static factory methods
export const Optional = {
  of: <T>(value: Nullable<T>): Optional<T> => createOptional(value),
  empty: <T>(): Optional<T> => createOptional<T>(undefined),
  ofNullable: <T>(value: Nullable<T>): Optional<T> => createOptional(value),
};

// Vue Composable für reactive Optionals
export function refAsOptional<T>(
  source: Ref<Nullable<T>>
): ComputedRef<Optional<T>> {
  return computed({
    get: () => Optional.of(source.value),
    set: (newOptional: Optional<T>) => {
      source.value = newOptional.unwrap() as T;
    }
  });
}

// Helper für verschachtelte Properties mit Typsicherheit
export function optionalPath<T, R>(
  obj: Nullable<T>,
  accessor: (val: T) => R
): Optional<R> {
  return Optional.of(obj).map(accessor);
}

// Async Variante für orElseGet
export async function orElseGetAsync<T>(
  optional: Optional<T>,
  supplier: () => Promise<T>
): Promise<T> {
  return optional.isPresent() ? optional.get() : await supplier();
}