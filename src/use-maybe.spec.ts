import { describe, it, expect, vi } from 'vitest';
import { useMaybe, useMaybePath } from './use-maybe';

describe('useMaybe', () => {
  describe('hasValue and isEmpty', () => {
    it('should return hasValue=true for defined values', () => {
      const maybe = useMaybe('test');
      expect(maybe.hasValue.value).toBe(true);
      expect(maybe.isEmpty.value).toBe(false);
    });

    it('should return hasValue=false for null', () => {
      const maybe = useMaybe(null);
      expect(maybe.hasValue.value).toBe(false);
      expect(maybe.isEmpty.value).toBe(true);
    });

    it('should return hasValue=false for undefined', () => {
      const maybe = useMaybe(undefined);
      expect(maybe.hasValue.value).toBe(false);
      expect(maybe.isEmpty.value).toBe(true);
    });

    it('should handle falsy values correctly', () => {
      expect(useMaybe(false).hasValue.value).toBe(true);
      expect(useMaybe(0).hasValue.value).toBe(true);
      expect(useMaybe('').hasValue.value).toBe(true);

      expect(useMaybe(false).isEmpty.value).toBe(false);
      expect(useMaybe(0).isEmpty.value).toBe(false);
      expect(useMaybe('').isEmpty.value).toBe(false);
    });
  });

  describe('map', () => {
    it('should transform value when present', () => {
      const maybe = useMaybe(5);
      const result = maybe.map(x => x * 2);
      expect(result.unwrap.value).toBe(10);
    });

    it('should return empty Maybe when value is null', () => {
      const maybe = useMaybe<number>(null);
      const result = maybe.map(x => x * 2);
      expect(result.isEmpty.value).toBe(true);
    });

    it('should chain multiple map operations', () => {
      const maybe = useMaybe('hello');
      const result = maybe
        .map(s => s.toUpperCase())
        .map(s => s.length);
      expect(result.unwrap.value).toBe(5);
    });

    it('should work with complex objects', () => {
      interface User {
        name: string;
        age: number;
      }
      const user: User = { name: 'Alice', age: 30 };
      const maybe = useMaybe(user);
      const name = maybe.map(u => u.name);
      expect(name.unwrap.value).toBe('Alice');
    });
  });

  describe('flatMap', () => {
    it('should flatten nested Maybe', () => {
      const maybe = useMaybe(5);
      const result = maybe.flatMap(x => x > 0 ? x * 2 : null);
      expect(result.unwrap.value).toBe(10);
    });

    it('should return empty when flatMap returns null', () => {
      const maybe = useMaybe(-5);
      const result = maybe.flatMap(x => x > 0 ? x * 2 : null);
      expect(result.isEmpty.value).toBe(true);
    });

    it('should handle nested optional properties', () => {
      interface Profile {
        city?: string;
      }
      interface User {
        profile?: Profile;
      }
      const user: User = { profile: { city: 'Berlin' } };
      const city = useMaybe(user).flatMap(u => u.profile?.city);
      expect(city.unwrap.value).toBe('Berlin');
    });
  });

  describe('filter', () => {
    it('should keep value when predicate is true', () => {
      const maybe = useMaybe(10);
      const result = maybe.filter(x => x > 5);
      expect(result.hasValue.value).toBe(true);
      expect(result.unwrap.value).toBe(10);
    });

    it('should return empty when predicate is false', () => {
      const maybe = useMaybe(3);
      const result = maybe.filter(x => x > 5);
      expect(result.isEmpty.value).toBe(true);
    });

    it('should return empty when value is null', () => {
      const maybe = useMaybe<number>(null);
      const result = maybe.filter(x => x > 5);
      expect(result.isEmpty.value).toBe(true);
    });
  });

  describe('orElse', () => {
    it('should return value when present', () => {
      const maybe = useMaybe('hello');
      const result = maybe.orElse('default');
      expect(result.value).toBe('hello');
    });

    it('should return default when value is null', () => {
      const maybe = useMaybe<string>(null);
      const result = maybe.orElse('default');
      expect(result.value).toBe('default');
    });

    it('should handle falsy values correctly', () => {
      const maybe = useMaybe(0);
      const result = maybe.orElse(42);
      expect(result.value).toBe(0);
    });
  });

  describe('orElseGet', () => {
    it('should return value when present', () => {
      const maybe = useMaybe('hello');
      const supplier = vi.fn(() => 'default');
      const result = maybe.orElseGet(supplier);
      expect(result.value).toBe('hello');
      expect(supplier).not.toHaveBeenCalled();
    });

    it('should call supplier when value is null', () => {
      const maybe = useMaybe<string>(null);
      const supplier = vi.fn(() => 'default');
      const result = maybe.orElseGet(supplier);
      expect(result.value).toBe('default');
      expect(supplier).toHaveBeenCalledOnce();
    });
  });

  describe('ifPresent', () => {
    it('should call consumer when value is present', () => {
      const maybe = useMaybe(42);
      const consumer = vi.fn();
      maybe.ifPresent(consumer);
      expect(consumer).toHaveBeenCalledWith(42);
      expect(consumer).toHaveBeenCalledOnce();
    });

    it('should not call consumer when value is null', () => {
      const maybe = useMaybe(null);
      const consumer = vi.fn();
      maybe.ifPresent(consumer);
      expect(consumer).not.toHaveBeenCalled();
    });
  });

  describe('getOrThrow', () => {
    it('should return value when present', () => {
      const maybe = useMaybe(42);
      expect(maybe.getOrThrow()).toBe(42);
    });

    it('should throw default error when value is null', () => {
      const maybe = useMaybe(null);
      expect(() => maybe.getOrThrow()).toThrow('Value is not present');
    });

    it('should throw custom error message', () => {
      const maybe = useMaybe(undefined);
      expect(() => maybe.getOrThrow('Custom error')).toThrow('Custom error');
    });

    it('should throw custom Error instance', () => {
      const maybe = useMaybe(null);
      const customError = new Error('Custom Error instance');
      expect(() => maybe.getOrThrow(customError)).toThrow(customError);
    });
  });

  describe('useMaybePath', () => {
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
      const city = useMaybePath(user, u => u.profile?.address?.city);
      expect(city.unwrap.value).toBe('München');
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
      const city = useMaybePath(user, u => u.profile?.address?.city);
      expect(city.isEmpty.value).toBe(true);
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

      const name = useMaybe(dto).map(u => u.name).orElse('Anonymous');
      const email = useMaybe(dto).map(u => u.email).orElse('no-email@example.com');
      const city = useMaybePath(dto, u => u.profile?.city).orElse('Unknown');

      expect(name.value).toBe('Max');
      expect(email.value).toBe('no-email@example.com');
      expect(city.value).toBe('Berlin');
    });

    it('should handle undefined DTO from backend', () => {
      const dto: UserDTO | undefined = undefined;

      const name = useMaybe(dto).map(u => u.name).orElse('Anonymous');
      expect(name.value).toBe('Anonymous');
    });

    it('should chain operations on DTO', () => {
      const dto: UserDTO = {
        id: 1,
        email: 'max@example.com',
        profile: { age: 25, premium: true }
      };

      const emailDomain = useMaybe(dto)
        .map(u => u.email)
        .filter(email => email !== undefined && email.includes('@'))
        .map(email => email!.split('@')[1])
        .orElse('unknown');

      const isPremiumAdult = useMaybe(dto)
        .flatMap(u => u.profile)
        .filter(p => (p.age ?? 0) >= 18 && (p.premium ?? false))
        .hasValue;

      expect(emailDomain.value).toBe('example.com');
      expect(isPremiumAdult.value).toBe(true);
    });
  });
});