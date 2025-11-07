import { describe, it, expect, vi } from 'vitest';
import { Optional } from './Optional';

describe('Optional', () => {
  describe('creation', () => {
    it('should create Optional with of()', () => {
      const opt = Optional.of('test');
      expect(opt.isPresent()).toBe(true);
      expect(opt.unwrap()).toBe('test');
    });

    it('should handle null values', () => {
      const opt = Optional.of(null);
      expect(opt.isEmpty()).toBe(true);
      expect(opt.unwrap()).toBeNull();
    });

    it('should create empty Optional', () => {
      const opt = Optional.empty<string>();
      expect(opt.isEmpty()).toBe(true);
      expect(opt.unwrap()).toBeUndefined();
    });
  });

  describe('isPresent and isEmpty', () => {
    it('should return correct presence status', () => {
      expect(Optional.of('test').isPresent()).toBe(true);
      expect(Optional.of(null).isPresent()).toBe(false);
      expect(Optional.of(undefined).isPresent()).toBe(false);
      expect(Optional.empty().isPresent()).toBe(false);
    });

    it('should handle falsy values correctly', () => {
      expect(Optional.of(false).isPresent()).toBe(true);
      expect(Optional.of(0).isPresent()).toBe(true);
      expect(Optional.of('').isPresent()).toBe(true);
    });
  });

  describe('map', () => {
    it('should transform value when present', () => {
      const result = Optional.of(5).map(x => x * 2);
      expect(result.unwrap()).toBe(10);
    });

    it('should return empty when value is null', () => {
      const result = Optional.of<number>(null).map(x => x * 2);
      expect(result.isEmpty()).toBe(true);
    });

    it('should chain map operations', () => {
      const result = Optional.of('hello')
        .map(s => s.toUpperCase())
        .map(s => s.length);
      expect(result.unwrap()).toBe(5);
    });

    it('should preserve immutability', () => {
      const opt1 = Optional.of(5);
      const opt2 = opt1.map(x => x * 2);
      expect(opt1.unwrap()).toBe(5);
      expect(opt2.unwrap()).toBe(10);
    });
  });

  describe('flatMap', () => {
    it('should flatten nested optional values', () => {
      const result = Optional.of(5).flatMap(x => x > 0 ? x * 2 : null);
      expect(result.unwrap()).toBe(10);
    });

    it('should return empty when flatMap returns null', () => {
      const result = Optional.of(-5).flatMap(x => x > 0 ? x * 2 : null);
      expect(result.isEmpty()).toBe(true);
    });

    it('should handle nested object properties', () => {
      interface User {
        profile?: {
          city?: string;
        };
      }
      const user: User = { profile: { city: 'Berlin' } };
      const city = Optional.of(user).flatMap(u => u.profile?.city);
      expect(city.unwrap()).toBe('Berlin');
    });
  });

  describe('filter', () => {
    it('should keep value when predicate is true', () => {
      const result = Optional.of(10).filter(x => x > 5);
      expect(result.isPresent()).toBe(true);
      expect(result.unwrap()).toBe(10);
    });

    it('should return empty when predicate is false', () => {
      const result = Optional.of(3).filter(x => x > 5);
      expect(result.isEmpty()).toBe(true);
    });

    it('should return empty when value is null', () => {
      const result = Optional.of<number>(null).filter(x => x > 5);
      expect(result.isEmpty()).toBe(true);
    });
  });

  describe('orElse', () => {
    it('should return value when present', () => {
      const result = Optional.of('hello').orElse('default');
      expect(result).toBe('hello');
    });

    it('should return default when empty', () => {
      const result = Optional.of<string>(null).orElse('default');
      expect(result).toBe('default');
    });

    it('should handle falsy values correctly', () => {
      expect(Optional.of(0).orElse(42)).toBe(0);
      expect(Optional.of(false).orElse(true)).toBe(false);
      expect(Optional.of('').orElse('default')).toBe('');
    });
  });

  describe('orElseGet', () => {
    it('should return value when present', () => {
      const supplier = vi.fn(() => 'default');
      const result = Optional.of('hello').orElseGet(supplier);
      expect(result).toBe('hello');
      expect(supplier).not.toHaveBeenCalled();
    });

    it('should call supplier when empty', () => {
      const supplier = vi.fn(() => 'default');
      const result = Optional.of<string>(null).orElseGet(supplier);
      expect(result).toBe('default');
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
      };
    }

    it('should handle typical DTO operations', () => {
      const user: UserDTO = {
        id: 1,
        name: 'Max',
        profile: { city: 'Berlin' }
      };

      const name = Optional.of(user).map(u => u.name).orElse('Anonymous');
      const email = Optional.of(user).map(u => u.email).orElse('no-email@example.com');
      const city = Optional.of(user).flatMap(u => u.profile?.city).orElse('Unknown');

      expect(name).toBe('Max');
      expect(email).toBe('no-email@example.com');
      expect(city).toBe('Berlin');
    });

    it('should handle undefined DTO', () => {
      const user: UserDTO | undefined = undefined;
      const name = Optional.of(user).map(u => u.name).orElse('Anonymous');
      expect(name).toBe('Anonymous');
    });

    it('should chain operations safely', () => {
      const user: UserDTO = {
        id: 1,
        email: 'max@example.com'
      };

      const emailDomain = Optional.of(user)
        .map(u => u.email)
        .filter(email => email !== undefined && email.includes('@'))
        .map(email => email!.split('@')[1])
        .orElse('unknown');

      expect(emailDomain).toBe('example.com');
    });
  });
});