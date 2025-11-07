import { ref, computed, type Ref, type WritableComputedRef } from 'vue';
import { Optional } from './Optional';

type Nullable<T> = T | null | undefined;

export interface ReactiveOptional<T> {
  optional: WritableComputedRef<Optional<T>>;
  ref: Ref<Nullable<T>>;
  setAsync: (promise: Promise<Nullable<T>>) => Promise<void>;
}

export function useReactiveOptional<T>(
  initialValue: Nullable<T> = undefined
): ReactiveOptional<T> {
  const valueRef = ref<Nullable<T>>(initialValue);

  const optional = computed({
    get: () => Optional.of(valueRef.value),
    set: (newOptional: Optional<T>) => {
      valueRef.value = newOptional.unwrap();
    }
  });

  const setAsync = async (promise: Promise<Nullable<T>>): Promise<void> => {
    try {
      const result = await promise;
      valueRef.value = result;
    } catch (error) {
      console.error('useReactiveOptional setAsync failed:', error);
      valueRef.value = undefined;
    }
  };

  return {
    optional,
    ref: valueRef,
    setAsync
  };
}