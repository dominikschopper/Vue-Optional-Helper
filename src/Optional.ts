type Nullable<T> = T | null | undefined;

export interface Optional<T> {
  map<R>(mapper: (value: T) => R): Optional<R>;
  flatMap<R>(mapper: (value: T) => Nullable<R>): Optional<R>;
  filter(predicate: (value: T) => boolean): Optional<T>;
  orElse(other: T): T;
  orElseGet(supplier: () => T): T;
  isPresent(): boolean;
  isEmpty(): boolean;
  unwrap(): Nullable<T>;
}

function createOptional<T>(value: Nullable<T>): Optional<T> {
  const isPresent = (): boolean => {
    return value !== null && value !== undefined;
  };

  const isEmpty = (): boolean => {
    return value === null || value === undefined;
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

  const orElse = (other: T): T => {
    return isPresent() ? (value as T) : other;
  };

  const orElseGet = (supplier: () => T): T => {
    return isPresent() ? (value as T) : supplier();
  };

  return {
    map,
    flatMap,
    filter,
    orElse,
    orElseGet,
    isPresent,
    isEmpty,
    unwrap,
  };
}

export const Optional = {
  of: <T>(value: Nullable<T>): Optional<T> => createOptional(value),
  empty: <T>(): Optional<T> => createOptional<T>(undefined),
};