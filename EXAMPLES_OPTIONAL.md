# Optional Usage Examples (Synchronous, Immutable)

## Basic Usage

```typescript
import { Optional } from './Optional';

interface UserDTO {
  id?: number;
  name?: string;
  email?: string;
}

const user: UserDTO | undefined = { id: 1, name: 'Alice' };

// Safe access with fallback
const userName = Optional.of(user)
  .map(u => u.name)
  .orElse('Anonymous');

const userEmail = Optional.of(user)
  .map(u => u.email)
  .orElse('no-email@example.com');
```

## Chaining Operations

```typescript
// Filter and transform
const emailDomain = Optional.of(user)
  .map(u => u.email)
  .filter(email => email !== undefined && email.includes('@'))
  .map(email => email!.split('@')[1])
  .orElse('unknown-domain');

// Nested properties
interface UserDTO {
  profile?: {
    address?: {
      city?: string;
    };
  };
}

const city = Optional.of(user)
  .flatMap(u => u.profile?.address?.city)
  .orElse('City unknown');
```

## Using orElseGet for Lazy Evaluation

```typescript
// Expensive operation only runs if needed
const fallbackUser = Optional.of(user)
  .orElseGet(() => {
    console.log('Creating fallback user');
    return createDefaultUser();
  });


