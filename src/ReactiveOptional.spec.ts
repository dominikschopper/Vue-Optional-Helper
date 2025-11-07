import { describe, it, expect, vi } from 'vitest';
import { useReactiveOptional } from './ReactiveOptional';
import { Optional } from './Optional';
import { nextTick } from 'vue';

describe('ReactiveOptional', () => {
  describe('creation and basic usage', () => {
    it('should create with initial value', () => {
      const reactive = useReactiveOptional('initial');
      expect(reactive.optional.value.isPresent()).toBe(true);
      expect(reactive.optional.value.unwrap()).toBe('initial');
      expect(reactive.ref.value).toBe('initial');
    });

    it('should create empty by default', () => {
      const reactive = useReactiveOptional<string>();
      expect(reactive.optional.value.isEmpty()).toBe(true);
      expect(reactive.ref.value).toBeUndefined();
    });

    it('should handle null initial value', () => {
      const reactive = useReactiveOptional<string>(null);
      expect(reactive.optional.value.isEmpty()).toBe(true);
      expect(reactive.ref.value).toBeNull();
    });
  });

  describe('reactivity', () => {
    it('should be reactive to ref ref changes', async () => {
      const reactive = useReactiveOptional<number>(5);

      expect(reactive.optional.value.unwrap()).toBe(5);

      reactive.ref.value = 10;
      await nextTick();

      expect(reactive.optional.value.unwrap()).toBe(10);
    });

    it('should be reactive to optional changes', async () => {
      const reactive = useReactiveOptional<string>('initial');

      reactive.optional.value = Optional.of('updated');
      await nextTick();

      expect(reactive.ref.value).toBe('updated');
      expect(reactive.optional.value.unwrap()).toBe('updated');
    });

    it('should handle setting to empty', async () => {
      const reactive = useReactiveOptional('value');

      reactive.optional.value = Optional.empty();
      await nextTick();

      expect(reactive.ref.value).toBeUndefined();
      expect(reactive.optional.value.isEmpty()).toBe(true);
    });
  });

  describe('setAsync', () => {
    it('should set value from resolved promise', async () => {
      const reactive = useReactiveOptional<string>();

      await reactive.setAsync(Promise.resolve('async value'));

      expect(reactive.optional.value.unwrap()).toBe('async value');
      expect(reactive.ref.value).toBe('async value');
    });

    it('should handle rejected promise', async () => {
      const reactive = useReactiveOptional<string>('initial');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await reactive.setAsync(Promise.reject(new Error('failed')));

      expect(reactive.optional.value.isEmpty()).toBe(true);
      expect(reactive.ref.value).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle null from promise', async () => {
      const reactive = useReactiveOptional<string>('initial');

      await reactive.setAsync(Promise.resolve(null));

      expect(reactive.optional.value.isEmpty()).toBe(true);
      expect(reactive.ref.value).toBeNull();
    });
  });

  describe('Optional operations on reactive value', () => {
    it('should support map operations', () => {
      const reactive = useReactiveOptional<number>(5);

      const doubled = reactive.optional.value.map(x => x * 2).unwrap();
      expect(doubled).toBe(10);
    });

    it('should support filter operations', () => {
      const reactive = useReactiveOptional<number>(10);

      const filtered = reactive.optional.value.filter(x => x > 5);
      expect(filtered.isPresent()).toBe(true);

      const notFiltered = reactive.optional.value.filter(x => x > 20);
      expect(notFiltered.isEmpty()).toBe(true);
    });

    it('should support chaining', () => {
      const reactive = useReactiveOptional('hello');

      const result = reactive.optional.value
        .map(s => s.toUpperCase())
        .map(s => s.length)
        .orElse(0);

      expect(result).toBe(5);
    });
  });

  describe('DTO use case', () => {
    interface UserDTO {
      id?: number;
      name?: string;
      email?: string;
      address?: {
        street?: string;
        city?: string;
      };
    }

    function createEmptyUserDTO(): UserDTO {
      return {
        id: undefined,
        name: undefined,
        email: undefined,
        address: undefined
      };
    }

    it('should handle initial empty DTO and async update', async () => {
      const reactive = useReactiveOptional<UserDTO>(createEmptyUserDTO());

      // Initially empty
      const initialName = reactive.optional.value
        .map(u => u.name)
        .orElse('Loading...');
      expect(initialName).toBe('Loading...');

      // Simulate backend response
      const fetchedUser: UserDTO = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        address: {
          street: 'Main St',
          city: 'Berlin'
        }
      };

      await reactive.setAsync(Promise.resolve(fetchedUser));

      // After load
      const name = reactive.optional.value.map(u => u.name).orElse('Unknown');
      const city = reactive.optional.value
        .flatMap(u => u.address?.city)
        .orElse('Unknown');

      expect(name).toBe('Alice');
      expect(city).toBe('Berlin');
    });

    it('should allow direct modifications via ref ref', async () => {
      const reactive = useReactiveOptional<UserDTO>(createEmptyUserDTO());

      // Direct modification for form binding
      if (reactive.ref.value) {
        reactive.ref.value.name = 'Bob';
        reactive.ref.value.email = 'bob@example.com';
      }

      await nextTick();

      const name = reactive.optional.value.map(u => u.name).orElse('Unknown');
      expect(name).toBe('Bob');
    });

    it('should support replacing entire DTO', async () => {
      const reactive = useReactiveOptional<UserDTO>(createEmptyUserDTO());

      const newUser: UserDTO = {
        id: 2,
        name: 'Charlie'
      };

      reactive.optional.value = Optional.of(newUser);
      await nextTick();

      expect(reactive.ref.value?.id).toBe(2);
      expect(reactive.ref.value?.name).toBe('Charlie');
    });
  });

  describe('composable usage pattern', () => {
    interface UserDTO {
      id?: number;
      name?: string;
      email?: string;
    }

    function useUser() {
      const reactive = useReactiveOptional<UserDTO>();

      async function loadUser(id: number) {
        // Simulate API call
        const mockFetch = (): Promise<UserDTO> =>
          new Promise(resolve =>
            setTimeout(() => resolve({ id, name: 'Test User', email: 'test@example.com' }), 10)
          );

        await reactive.setAsync(mockFetch());
      }

      const userName = () => reactive.optional.value.map(u => u.name).orElse('Guest');
      const userEmail = () => reactive.optional.value.map(u => u.email).orElse('no-email');

      return {
        user: reactive,
        userName,
        userEmail,
        loadUser
      };
    }

    it('should work in composable pattern', async () => {
      const { user, userName, userEmail, loadUser } = useUser();

      // Before load
      expect(userName()).toBe('Guest');
      expect(userEmail()).toBe('no-email');

      // Load user
      await loadUser(123);

      // After load
      expect(userName()).toBe('Test User');
      expect(userEmail()).toBe('test@example.com');
      expect(user.ref.value?.id).toBe(123);
    });
  });
});