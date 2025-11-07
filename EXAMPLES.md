# Optional - Verwendungsbeispiele

## Grundlegende Verwendung

### DTOs vom Backend wrappen

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

// Ohne Optional (viel optional chaining)
const userName = user?.name ?? 'Anonymous';
const userCity = user?.profile?.city ?? 'Unknown';

// Mit Optional (clean und typsicher)
const userName = Optional.of(user)
  .map(u => u.name)
  .orElse('Anonymous');

const userCity = Optional.of(user)
  .flatMap(u => u.profile?.city)
  .orElse('Unknown');
```

## Vue 3 Composable Integration

### In einem Composable mit Refs

```typescript
function useUser() {
  const userRef = ref<UserDTO | undefined>();
  
  async function loadUser(id: number) {
    const response = await fetch(`/api/users/${id}`);
    userRef.value = await response.json();
  }
  
  // Wrapp den Ref in refAsOptional für reaktive Optional-API
  const user = refAsOptional(userRef);
  
  // Computed Properties mit Optional
  const userName = computed(() => 
    user.value.map(u => u.name).orElse('Gast')
  );
  
  const userEmail = computed(() =>
    user.value.map(u => u.email).orElse('keine-email@example.com')
  );
  
  const isPremiumUser = computed(() =>
    user.value
      .flatMap(u => u.profile?.premium)
      .orElse(false)
  );
  
  // Schreiben in den Optional-Ref
  function setUser(newUser: UserDTO) {
    user.value = Optional.of(newUser);
    // Schreibt automatisch in userRef.value
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

### In Components verwenden

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useUser } from '@/composables/useUser';
import { Optional } from '@/utils/Optional';

const { user, userName, loadUser } = useUser();

// Direkt im Component mit Optional arbeiten
const userCity = computed(() =>
  user.value
    .flatMap(u => u.profile?.city)
    .filter(city => city.length > 0)
    .orElse('Stadt unbekannt')
);

const userAge = computed(() =>
  user.value
    .flatMap(u => u.profile?.age)
    .map(age => `${age} Jahre`)
    .orElse('Alter unbekannt')
);

onMounted(() => loadUser(123));
</script>

<template>
  <div class="user-profile">
    <h1>{{ userName }}</h1>
    <p>Stadt: {{ userCity }}</p>
    <p>Alter: {{ userAge }}</p>
  </div>
</template>
```

## Fortgeschrittene Patterns

### Chaining mit filter und map

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

// Berechne finalen Preis mit Rabatt
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
  .orElse('Preis nicht verfügbar');

console.log(`Endpreis: €${finalPrice}`);
```

### Email-Validierung und Extraktion

```typescript
const email = Optional.of(user)
  .map(u => u.email)
  .filter(email => email !== undefined && email.includes('@'))
  .filter(email => email!.length > 5);

// Domain extrahieren
const emailDomain = email
  .map(e => e!.split('@')[1])
  .orElse('unknown-domain');

// Aktion nur bei vorhandener Email
email.ifPresent(e => {
  console.log(`Sende Benachrichtigung an: ${e}`);
  sendEmail(e);
});

// Mit Alternative
email.ifPresentOrElse(
  e => sendEmail(e),
  () => console.log('Keine Email vorhanden')
);
```

### Fallback-Ketten mit or()

```typescript
// Versuche verschiedene Datenquellen
const userName = Optional.of(user)
  .map(u => u.name)
  .or(() => Optional.of(user).map(u => u.email?.split('@')[0]))
  .or(() => Optional.of('Benutzer'))
  .orElse('Unbekannt');
```

### Business Logic mit filter

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

// Prüfe ob Rabatt gewährt werden soll
const discount = Optional.of(order)
  .filter(o => o.status === 'completed')
  .filter(o => (o.amount ?? 0) > 100)
  .flatMap(o => o.customer?.isPremium)
  .filter(isPremium => isPremium === true)
  .map(() => 0.15) // 15% Rabatt
  .orElse(0);

console.log(`Rabatt: ${discount * 100}%`);
```

### Fehlerbehandlung mit orElseThrow

```typescript
// Kritische Werte die vorhanden sein müssen
const userId = Optional.of(user)
  .map(u => u.id)
  .orElseThrow(() => new Error('User ID ist erforderlich'));

const apiKey = Optional.of(config)
  .map(c => c.apiKey)
  .filter(key => key.length > 10)
  .orElseThrow(() => new Error('Ungültiger API Key'));

// Mit get() - wirft Standard-Error
const requiredEmail = Optional.of(user)
  .map(u => u.email)
  .filter(email => email !== undefined)
  .get(); // Wirft Error wenn nicht vorhanden
```

### Async Operations

```typescript
async function getUserWithFallback(id: number) {
  const user = await fetchUser(id);
  
  // Lade Default-User wenn nicht vorhanden
  return await orElseGetAsync(
    Optional.of(user),
    async () => await fetchDefaultUser()
  );
}

// In einem Composable
const user = ref<UserDTO | undefined>();

async function loadUserData(id: number) {
  const data = await fetchUser(id);
  
  user.value = await orElseGetAsync(
    Optional.of(data),
    async () => {
      console.log('User nicht gefunden, lade Fallback...');
      return await fetchGuestUser();
    }
  );
}
```

### Komplexe Verschachtelung mit optionalPath

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

// Tief verschachtelte Properties sicher zugreifen
const frontendLeadName = optionalPath(
  company,
  c => c.departments?.engineering?.teams?.frontend?.lead?.name
).orElse('Nicht zugewiesen');

const frontendLeadEmail = optionalPath(
  company,
  c => c.departments?.engineering?.teams?.frontend?.lead?.email
).filter(email => email.includes('@'))
  .orElse('keine-email@example.com');
```

### List Operations mit Array.map

```typescript
interface TodoDTO {
  id: number;
  title?: string;
  completed?: boolean;
}

const todos: TodoDTO[] = await fetchTodos();

// Transformiere Array von DTOs
const todoTitles = todos
  .map(todo => 
    Optional.of(todo)
      .map(t => t.title)
      .filter(title => title !== undefined && title.length > 0)
      .orElse('Unbenannt')
  );

// Nur completed Todos
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

// Validiere Username
const validUsername = Optional.of(formData)
  .map(f => f.username)
  .filter(name => name !== undefined && name.length >= 3)
  .filter(name => /^[a-zA-Z0-9]+$/.test(name!));

if (validUsername.isEmpty()) {
  showError('Username muss mindestens 3 Zeichen haben');
}

// Validiere Email
const validEmail = Optional.of(formData)
  .map(f => f.email)
  .filter(email => email !== undefined && email.includes('@'));

validEmail.ifPresentOrElse(
  email => submitForm(email),
  () => showError('Gültige Email erforderlich')
);

// Validiere Alter
const age = Optional.of(formData)
  .flatMap(f => f.age)
  .filter(age => age >= 18)
  .orElseThrow(() => new Error('Mindestalter: 18 Jahre'));
```

## Testing mit Optional

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

### ✅ DO: Verwende Optional für Backend DTOs

```typescript
// ✅ Gut
const userName = Optional.of(user).map(u => u.name).orElse('Guest');
```

### ❌ DON'T: Verwende Optional nicht für guaranteed values

```typescript
// ❌ Schlecht - name ist nie undefined
const name: string = 'Max';
const wrapped = Optional.of(