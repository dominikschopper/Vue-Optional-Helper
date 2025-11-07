import { describe, it, expect, vi } from 'vitest';
import { Optional, refAsOptional, optionalPath, orElseGetAsync } from './Optional';
import { ref } from 'vue';

describe('Optional', () => {
  describe('creation methods', () => {
    it('should create Optional with of()', () => {
      const opt = Optional.of('test');
      expect(opt.isPresent()).toBe(true);
      expect(opt.unwrap()).toBe('test');
    });

    it('should create Optional with of() for null values', () => {
      const opt = Optional.of(null);
      expect(opt.isEmpty()).toBe(true);
      expect(opt.unwrap()).toBeNull();
    });

    it('should create empty Optional with empty()', () => {
      const opt = Optional.empty<string>();
      expect(opt.isEmpty()).toBe(true);
      expect(opt.unwrap()).toBeUndefined();
    });

    it('should create Optional with ofNullable()', () => {
      const opt1 = Optional.ofNullable('test');
      const opt2 = Optional.ofNullable(null);
      const opt3 = Optional.ofNullable(undefined);
      
      expect(opt1.isPresent()).toBe(true);
      expect(opt2.isEmpty()).toBe(true);
      expect(opt3.isEmpty()).toBe(true);
    });
  });

  describe('isPresent and isEmpty', () => {
    it('should return isPresent=true for defined values', () => {
      const opt = Optional.of('test');
      expect(opt.isPresent()).toBe(true);
      expect(opt.isEmpty()).toBe(false);
    });

    it('should return isPresent=false for null', () => {
      const opt = Optional.of(null);
      expect(opt.isPresent()).toBe(false);
      expect(opt.isEmpty()).toBe(true);
    });

    it('should return isPresent=false for undefined', () => {
      const opt = Optional.of(undefined);
      expect(opt.isPresent()).toBe(false);
      expect(opt.isEmpty()).toBe(true);
    });

    it('should handle falsy values correctly', () => {
      expect(Optional.of(false).isPresent()).toBe(true);
      expect(Optional.of(0).isPresent()).toBe(true);
      expect(Optional.of('').isPresent()).toBe(true);
      
      expect(Optional.of(false).isEmpty()).toBe(false);
      expect(Optional.of(0).isEmpty()).toBe(false);
      expect(Optional.of('').isEmpty()).toBe(false);
    });
  });

  describe('get and unwrap', () => {
    it('should return value with get() when present', () => {
      const opt = Optional.of(42);
      expect(opt.get()).toBe(42);
    });

    it('should throw with get() when empty', () => {
      const opt = Optional.empty<number>();
      expect(() => opt.get()).toThrow('No value present in Optional');
    });

    it('should return raw value with unwrap()', () => {
      expect(Optional.of(42).unwrap()).toBe(42);
      expect(Optional.of(null).unwrap()).toBeNull();
      expect(Optional.empty().unwrap()).toBeUndefined();
    });
  });

  describe('map', () => {
    it('should transform value when present', () => {
      const opt = Optional.of(5);
      const result = opt.map(x => x * 2);
      expect(result.unwrap()).toBe(10);
    });

    it('should return empty Optional when value is null', () => {
      const opt = Optional.of<number>(null);
      const result = opt.map(x => x * 2);
      expect(result.isEmpty()).toBe(true);
    });

    it('should chain multiple map operations', () => {
      const opt = Optional.of('hello');
      const result = opt
        .map(s => s.toUpperCase())
        .map(s => s.length);
      expect(result.unwrap()).toBe(5);
    });

    it('should work with complex objects', () => {
      interface User {
        name: string;
        age: number;
      }
      const user: User = { name: 'Alice', age: 30 };
      const opt = Optional.of(user);
      const name = opt.map(u => u.name);
      expect(name.unwrap()).toBe('Alice');
    });

    it('should preserve immutability', () => {
      const opt1 = Optional.of(5);
      const opt2 = opt1.map(x => x * 2);
      
      expect(opt1.unwrap()).toBe(5);
      expect(opt2.unwrap()).toBe(10);
    });
  });

  describe('flatMap', () => {
    it('should flatten nested Optional', () => {
      const opt = Optional.of(5);
      const result = opt.flatMap(x => x > 0 ? x * 2 : null);
      expect(result.unwrap()).toBe(10);
    });

    it('should return empty when flatMap returns null', () => {
      const opt = Optional.of(-5);
      const result = opt.flatMap(x => x > 0 ? x * 2 : null);
      expect(result.isEmpty()).toBe(true);
    });

    it('should handle nested optional properties', () => {
      interface Profile {
        city?: string;
      }
      interface User {
        profile?: Profile;
      }
      const user: User = { profile: { city: 'Berlin' } };
      const city = Optional.of(user).flatMap(u => u.profile?.city);
      expect(city.unwrap()).toBe('Berlin');
    });

    it('should handle deeply nested structures', () => {
      interface Address {
        street?: string;
      }
      interface Profile {
        address?: Address;
      }
      interface User {
        profile?: Profile;
      }
      
      const user: User = { profile: { address: { street: 'Main St' } } };
      const street = Optional.of(user)
        .flatMap(u => u.profile?.address?.street);
      
      expect(street.unwrap()).toBe('Main St');
    });
  });

  describe('filter', () => {
    it('should keep value when predicate is true', () => {
      const opt = Optional.of(10);
      const result = opt.filter(x => x > 5);
      expect(result.isPresent()).toBe(true);
      expect(result.unwrap()).toBe(10);
    });

    it('should return empty when predicate is false', () => {
      const opt = Optional.of(3);
      const result = opt.filter(x => x > 5);
      expect(result.isEmpty()).toBe(true);
    });

    it('should return empty when value is null', () => {
      const opt = Optional.of<number>(null);
      const result = opt.filter(x => x > 5);
      expect(result.isEmpty()).toBe(true);
    });

    it('should chain filter with map', () => {
      const result = Optional.of('hello@example.com')
        .filter(email => email.includes('@'))
        .map(email => email.split('@')[1]);
      
      expect(result.unwrap()).toBe('example.com');
    });
  });

  describe('or', () => {
    it('should return current Optional when present', () => {
      const opt = Optional.of(5);
      const result = opt.or(() => Optional.of(10));
      expect(result.unwrap()).toBe(5);
    });

    it('should call supplier when empty', () => {
      const opt = Optional.empty<number>();
      const result = opt.or(() => Optional.of(10));
      expect(result.unwrap()).toBe(10);
    });

    it('should chain multiple or operations', () => {
      const result = Optional.empty<string>()
        .or(() => Optional.empty())
        .or(() => Optional.of('fallback'));
      
      expect(result.unwrap()).toBe('fallback');
    });
  });

  describe('orElse', () => {
    it('should return value when present', () => {
      const opt = Optional.of('hello');
      const result = opt.orElse('default');
      expect(result).toBe('hello');
    });

    it('should return default when value is null', () => {
      const opt = Optional.of<string>(null);
      const result = opt.orElse('default');
      expect(result).toBe('default');
    });

    it('should handle falsy values correctly', () => {
      const opt = Optional.of(0);
      const result = opt.orElse(42);
      expect(result).toBe(0);
    });
  });

  describe('orElseGet', () => {
    it('should return value when present', () => {
      const opt = Optional.of('hello');
      const supplier = vi.fn(() => 'default');
      const result = opt.orElseGet(supplier);
      expect(result).toBe('hello');
      expect(supplier).not.toHaveBeenCalled();
    });

    it('should call supplier when value is null', () => {
      const opt = Optional.of<string>(null);
      const supplier = vi.fn(() => 'default');
      const result = opt.orElseGet(supplier);
      expect(result).toBe('default');
      expect(supplier).toHaveBeenCalledOnce();
    });

    it('should support complex supplier logic', () => {
      const opt = Optional.empty<number>();
      const result = opt.orElseGet(() => Math.floor(Math.random() * 100));
      expect(typeof result).toBe('number');
    });
  });

  describe('orElseThrow', () => {
    it('should return value when present', () => {
      const opt = Optional.of(42);
      expect(opt.orElseThrow()).toBe(42);
    });

    it('should throw default error when value is null', () => {
      const opt = Optional.of(null);
      expect(() => opt.orElseThrow()).toThrow('No value present in Optional');
    });

    it('should throw custom error', () => {
      const opt = Optional.of(undefined);
      const customError = () => new Error('Custom error message');
      expect(() => opt.orElseThrow(customError)).toThrow('Custom error message');
    });

    it('should throw specific error types', () => {
      const opt = Optional.empty<string>();
      expect(() => opt.orElseThrow(() => new TypeError('Wrong type'))).toThrow(TypeError);
    });
  });

  describe('ifPresent', () => {
    it('should call consumer when value is present', () => {
      const opt = Optional.of(42);
      const consumer = vi.fn();
      opt.ifPresent(consumer);
      expect(consumer).toHaveBeenCalledWith(42);
      expect(consumer).toHaveBeenCalledOnce();
    });

    it('should not call consumer when value is null', () => {
      const opt = Optional.of(null);
      const consumer = vi.fn();
      opt.ifPresent(consumer);
      expect(consumer).not.toHaveBeenCalled();
    });

    it('should support side effects', () => {
      let sideEffect = 0;
      Optional.of(5).ifPresent(x => { sideEffect = x * 2; });
      expect(sideEffect).toBe(10);
    });
  });

  describe('ifPresentOrElse', () => {
    it('should call action when value is present', () => {
      const opt = Optional.of(42);
      const action = vi.fn();
      const emptyAction = vi.fn();
      opt.ifPresentOrElse(action, emptyAction);
      expect(action).toHaveBeenCalledWith(42);
      expect(emptyAction).not.toHaveBeenCalled();
    });

    it('should call emptyAction when value is not present', () => {
      const opt = Optional.empty();
      const action = vi.fn();
      const emptyAction = vi.fn();
      opt.ifPresentOrElse(action, emptyAction);
      expect(action).not.toHaveBeenCalled();
      expect(emptyAction).toHaveBeenCalledOnce();
    });
  });

  describe('equals', () => {
    it('should return true for equal values', () => {
      const opt1 = Optional.of(42);
      const opt2 = Optional.of(42);
      expect(opt1.equals(opt2)).toBe(true);
    });

    it('should return false for different values', () => {
      const opt1 = Optional.of(42);
      const opt2 = Optional.of(43);
      expect(opt1.equals(opt2)).toBe(false);
    });

    it('should return true for two empty Optionals', () => {
      const opt1 = Optional.empty<number>();
      const opt2 = Optional.empty<number>();
      expect(opt1.equals(opt2)).toBe(true);
    });

    it('should return false when one is empty and one is not', () => {
      const opt1 = Optional.of(42);
      const opt2 = Optional.empty<number>();
      expect(opt1.equals(opt2)).toBe(false);
    });
  });

  describe('optionalPath helper', () => {
    it('should access nested properties safely', () => {
      interface User {
        profile?: {
          address?: {
            city?: string;
          };
        };
      }
      const user: User = {
        profile: {
          address: {
            city: 'München'
          }
        }
      };
      const city = optionalPath(user, u => u.profile?.address?.city);
      expect(city.unwrap()).toBe('München');
    });

    it('should handle missing nested properties', () => {
      interface User {
        profile?: {
          address?: {
            city?: string;
          };
        };
      }
      const user: User = {};
      const city = optionalPath(user, u => u.profile?.address?.city);
      expect(city.isEmpty()).toBe(true);
    });
  });

  describe('refAsOptional with Vue refs', () => {
    it('should work with Vue refs', () => {
      const userRef = ref<string | undefined>('Alice');
      const opt = refAsOptional(userRef);
      
      expect(opt.value.isPresent()).toBe(true);
      expect(opt.value.unwrap()).toBe('Alice');
    });

    it('should be reactive to ref changes', () => {
      const countRef = ref<number | undefined>(5);
      const opt = refAsOptional(countRef);
      
      expect(opt.value.unwrap()).toBe(5);
      
      countRef.value = 10;
      expect(opt.value.unwrap()).toBe(10);
      
      countRef.value = undefined;
      expect(opt.value.isEmpty()).toBe(true);
    });

    it('should be writable', () => {
      const userRef = ref<string | undefined>('Alice');
      const opt = refAsOptional(userRef);
      
      // Schreibe in den Optional-Ref
      opt.value = Optional.of('Bob');
      
      // Sollte im Original-Ref auch geändert sein
      expect(userRef.value).toBe('Bob');
      expect(opt.value.unwrap()).toBe('Bob');
    });

    it('should handle writing empty Optional', () => {
      const userRef = ref<string | undefined>('Alice');
      const opt = refAsOptional(userRef);
      
      opt.value = Optional.empty();
      
      expect(userRef.value).toBeUndefined();
      expect(opt.value.isEmpty()).toBe(true);
    });

    it('should work bidirectionally', () => {
      const valueRef = ref<number | undefined>(10);
      const opt = refAsOptional(valueRef);
      
      // Schreibe in Original-Ref
      valueRef.value = 20;
      expect(opt.value.unwrap()).toBe(20);
      
      // Schreibe in Optional-Ref
      opt.value = Optional.of(30);
      expect(valueRef.value).toBe(30);
    });
  });

  describe('orElseGetAsync', () => {
    it('should return value when present', async () => {
      const opt = Optional.of('hello');
      const supplier = vi.fn(async () => 'default');
      const result = await orElseGetAsync(opt, supplier);
      expect(result).toBe('hello');
      expect(supplier).not.toHaveBeenCalled();
    });

    it('should call async supplier when empty', async () => {
      const opt = Optional.empty<string>();
      const supplier = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async default';
      });
      const result = await orElseGetAsync(opt, supplier);
      expect(result).toBe('async default');
      expect(supplier).toHaveBeenCalledOnce();
    });
  });

  describe('real-world DTO scenarios', () => {
    interface UserDTO {
      id?: number;
      name?: string;
      email?: string;
      profile?: {
        age?: number;
        city?: string;
        premium?: boolean;
      };
    }

    it('should handle typical DTO with optional properties', () => {
      const dto: UserDTO = {
        id: 1,
        name: 'Max',
        profile: {
          city: 'Berlin'
        }
      };

      const name = Optional.of(dto).map(u => u.name).orElse('Anonymous');
      const email = Optional.of(dto).map(u => u.email).orElse('no-email@example.com');
      const city = optionalPath(dto, u => u.profile?.city).orElse('Unknown');

      expect(name).toBe('Max');
      expect(email).toBe('no-email@example.com');
      expect(city).toBe('Berlin');
    });

    it('should handle undefined DTO from backend', () => {
      const dto: UserDTO | undefined = undefined;
      const name = Optional.of(dto).map(u => u.name).orElse('Anonymous');
      expect(name).toBe('Anonymous');
    });

    it('should chain operations on DTO', () => {
      const dto: UserDTO = {
        id: 1,
        email: 'max@example.com',
        profile: { age: 25, premium: true }
      };

      const emailDomain = Optional.of(dto)
        .map(u => u.email)
        .filter(email => email !== undefined && email.includes('@'))
        .map(email => email!.split('@')[1])
        .orElse('unknown');

      const isPremiumAdult = Optional.of(dto)
        .flatMap(u => u.profile)
        .filter(p => (p.age ?? 0) >= 18 && (p.premium ?? false))
        .isPresent();

      expect(emailDomain).toBe('example.com');
      expect(isPremiumAdult).toBe(true);
    });

    it('should handle missing nested properties gracefully', () => {
      const dto: UserDTO = { id: 1 };
      
      const city = Optional.of(dto)
        .flatMap(u => u.profile?.city)
        .orElse('Not specified');
      
      expect(city).toBe('Not specified');
    });

    it('should support complex business logic', () => {
      const dto: UserDTO = {
        id: 1,
        name: 'Alice',
        profile: { age: 17, premium: false }
      };

      const discountMessage = Optional.of(dto)
        .flatMap(u => u.profile)
        .filter(p => (p.age ?? 0) >= 18)
        .filter(p => p.premium ?? false)
        .map(() => 'You get 20% discount!')
        .orElse('No discount available');

      expect(discountMessage).toBe('No discount available');
    });
  });
});