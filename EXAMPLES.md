# Optional - Usage Examples

## Basic Usage

### Wrapping DTOs from Backend

```typescript
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

// Backend Response
const user: UserDTO | undefined = await fetchUser();

// Without Optional (lots of optional chaining)
const userName = user?.name ?? 'Anonymous';
const userCity = user?.profile?.city ?? 'Unknown';

// With Optional (clean and type-safe)
const userName = Optional.of(user)
  .map(u => u.name)
  .orElse('Anonymous');

const userCity = Optional.of(user)
  .flatMap(u => u.profile?.city)
  .orElse('Unknown');
```

## Vue 3 Composable Integration

### In a Composable with Refs

```typescript
function useUser() {
  const userRef = ref<UserDTO | undefined>();
  
  async function loadUser(id: number) {
    const response = await fetch(`/api/users/${id}`);
    userRef.value = await response.json();
  }
  
  // Wrap the ref in refAsOptional for reactive Optional API
  const user = refAsOptional(userRef);
  
  // Computed Properties with Optional
  const userName = computed(() => 
    user.value.map(u => u.name).orElse('Guest')
  );
  
  const userEmail = computed(() =>
    user.value.map(u => u.email).orElse('no-email@example.com')
  );
  
  const isPremiumUser = computed(() =>
    user.value
      .flatMap(u => u.profile?.premium)
      .orElse(false)
  );
  
  // Writing to the Optional ref
  function setUser(newUser: UserDTO) {
    user.value = Optional.of(newUser);
    // Automatically writes to userRef.value
  }
  
  return { 
    user,
    userName, 
    userEmail,
    isPremiumUser,
    loadUser,
    setUser
  };
}
```

### Using in Components

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useUser } from '@/composables/useUser';
import { Optional } from '@/utils/Optional';

const { user, userName, loadUser } = useUser();

// Working with Optional directly in component
const userCity = computed(() =>
  user.value
    .flatMap(u => u.profile?.city)
    .filter(city => city.length > 0)
    .orElse('City unknown')
);

const userAge = computed(() =>
  user.value
    .flatMap(u => u.profile?.age)
    .map(age => `${age} years`)
    .orElse('Age unknown')
);

onMounted(() => loadUser(123));
</script>

<template>
  <div class="user-profile">
    <h1>{{ userName }}</h1>
    <p>City: {{ userCity }}</p>
    <p>Age: {{ userAge }}</p>
  </div>
</template>
```

## Advanced Patterns

### Chaining with filter and map

```typescript
interface Product {
  id: number;
  name: string;
  price?: number;
  discount?: {
    percentage?: number;
    validUntil?: string;
  };
}

const product: Product | undefined = await fetchProduct();

// Calculate final price with discount
const finalPrice = Optional.of(product)
  .flatMap(p => p.price)
  .filter(price => price > 0)
  .map(price => {
    const discount = Optional.of(product)
      .flatMap(p => p.discount?.percentage)
      .orElse(0);
    return price * (1 - discount / 100);
  })
  .map(price => price.toFixed(2))
  .orElse('Price not available');

console.log(`Final price: €${finalPrice}`);
```

### Email Validation and Extraction

```typescript
const email = Optional.of(user)
  .map(u => u.email)
  .filter(email => email !== undefined && email.includes('@'))
  .filter(email => email!.length > 5);

// Extract domain
const emailDomain = email
  .map(e => e!.split('@')[1])
  .orElse('unknown-domain');

// Action only if email present
email.ifPresent(e => {
  console.log(`Send notification to: ${e}`);
  sendEmail(e);
});

// With alternative
email.ifPresentOrElse(
  e => sendEmail(e),
  () => console.log('No email available')
);
```

### Fallback Chains with or()

```typescript
// Try different data sources
const userName = Optional.of(user)
  .map(u => u.name)
  .or(() => Optional.of(user).map(u => u.email?.split('@')[0]))
  .or(() => Optional.of('User'))
  .orElse('Unknown');
```

### Business Logic with filter

```typescript
interface Order {
  id: number;
  amount?: number;
  status?: 'pending' | 'completed' | 'cancelled';
  customer?: {
    isPremium?: boolean;
  };
}

const order: Order | undefined = await fetchOrder();

// Check if discount should be granted
const discount = Optional.of(order)
  .filter(o => o.status === 'completed')
  .filter(o => (o.amount ?? 0) > 100)
  .flatMap(o => o.customer?.isPremium)
  .filter(isPremium => isPremium === true)
  .map(() => 0.15) // 15% discount
  .orElse(0);

console.log(`Discount: ${discount * 100}%`);
```

### Error Handling with orElseThrow

```typescript
// Critical values that must be present
const userId = Optional.of(user)
  .map(u => u.id)
  .orElseThrow(() => new Error('User ID is required'));

const apiKey = Optional.of(config)
  .map(c => c.apiKey)
  .filter(key => key.length > 10)
  .orElseThrow(() => new Error('Invalid API Key'));

// With get() - throws standard error
const requiredEmail = Optional.of(user)
  .map(u => u.email)
  .filter(email => email !== undefined)
  .get(); // Throws error if not present
```

### Async Operations

```typescript
async function getUserWithFallback(id: number) {
  const user = await fetchUser(id);
  
  // Load default user if not present
  return await orElseGetAsync(
    Optional.of(user),
    async () => await fetchDefaultUser()
  );
}

// In a composable
const user = ref<UserDTO | undefined>();

async function loadUserData(id: number) {
  const data = await fetchUser(id);
  
  user.value = await orElseGetAsync(
    Optional.of(data),
    async () => {
      console.log('User not found, loading fallback...');
      return await fetchGuestUser();
    }
  );
}
```

### Complex Nesting with optionalPath

```typescript
interface Company {
  departments?: {
    engineering?: {
      teams?: {
        frontend?: {
          lead?: {
            name?: string;
            email?: string;
          };
        };
      };
    };
  };
}

const company: Company | undefined = await fetchCompany();

// Safely access deeply nested properties
const frontendLeadName = optionalPath(
  company,
  c => c.departments?.engineering?.teams?.frontend?.lead?.name
).orElse('Not assigned');

const frontendLeadEmail = optionalPath(
  company,
  c => c.departments?.engineering?.teams?.frontend?.lead?.email
).filter(email => email.includes('@'))
  .orElse('no-email@example.com');
```

### List Operations with Array.map

```typescript
interface TodoDTO {
  id: number;
  title?: string;
  completed?: boolean;
}

const todos: TodoDTO[] = await fetchTodos();

// Transform array of DTOs
const todoTitles = todos
  .map(todo => 
    Optional.of(todo)
      .map(t => t.title)
      .filter(title => title !== undefined && title.length > 0)
      .orElse('Untitled')
  );

// Only completed todos
const completedCount = todos
  .filter(todo => 
    Optional.of(todo)
      .flatMap(t => t.completed)
      .orElse(false)
  )
  .length;
```

### Form Validation

```typescript
interface FormData {
  username?: string;
  email?: string;
  age?: number;
}

const formData: FormData = getFormData();

// Validate username
const validUsername = Optional.of(formData)
  .map(f => f.username)
  .filter(name => name !== undefined && name.length >= 3)
  .filter(name => /^[a-zA-Z0-9]+$/.test(name!));

if (validUsername.isEmpty()) {
  showError('Username must be at least 3 characters');
}

// Validate email
const validEmail = Optional.of(formData)
  .map(f => f.email)
  .filter(email => email !== undefined && email.includes('@'));

validEmail.ifPresentOrElse(
  email => submitForm(email),
  () => showError('Valid email required')
);

// Validate age
const age = Optional.of(formData)
  .flatMap(f => f.age)
  .filter(age => age >= 18)
  .orElseThrow(() => new Error('Minimum age: 18 years'));
```

## Testing with Optional

```typescript
import { describe, it, expect } from 'vitest';
import { Optional } from '@/utils/Optional';

describe('UserService', () => {
  it('should return default name for empty user', () => {
    const user = undefined;
    const name = Optional.of(user)
      .map(u => u.name)
      .orElse('Anonymous');
    
    expect(name).toBe('Anonymous');
  });
  
  it('should extract email domain correctly', () => {
    const user = { email: 'test@example.com' };
    const domain = Optional.of(user)
      .map(u => u.email)
      .map(email => email.split('@')[1])
      .orElse('');
    
    expect(domain).toBe('example.com');
  });
});
```

## Best Practices

### ✅ DO: Use Optional for Backend DTOs

```typescript
// ✅ Good
const userName = Optional.of(user).map(u => u.name).orElse('Guest');
```

### ❌ DON'T: Don't use Optional for guaranteed values

```typescript
// ❌ Bad - name is never undefined
const name: string = 'Max';
const wrapped = Optional.of(name); // Unnecessary