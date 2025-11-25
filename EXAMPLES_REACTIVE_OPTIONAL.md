## ReactiveOptional (For Vue Composables with Backend DTOs)

### In a Composable

```typescript
import { computed } from 'vue';
import { useReactiveOptional } from './ReactiveOptional';

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
  return { id: undefined, name: undefined, email: undefined };
}

function useUser() {
  // Initialize with empty DTO for immediate rendering
  const user = useReactiveOptional<UserDTO>(createEmptyUserDTO());

  // Computed properties using Optional API
  const userName = computed(() =>
    user.optional.value.map(u => u.name).orElse('Loading...')
  );

  const userEmail = computed(() =>
    user.optional.value.map(u => u.email).orElse('no-email@example.com')
  );

  const userCity = computed(() =>
    user.optional.value
      .flatMap(u => u.address?.city)
      .orElse('City unknown')
  );

  // Load from backend
  async function loadUser(id: number) {
    await user.setAsync(fetchUserFromAPI(id));
  }

  // Update local changes (e.g., from form)
  function updateUserName(newName: string) {
    if (user.raw.value) {
      user.raw.value.name = newName;
    }
  }

  return {
    user: user.optional,
    userName,
    userEmail,
    userCity,
    loadUser,
    updateUserName
  };
}
```

### In a Component

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useUser } from '@/composables/useUser';

const { userName, userEmail, userCity, loadUser } = useUser();

onMounted(() => {
  loadUser(123);
});
</script>

<template>
  <div class="user-profile">
    <h1>{{ userName }}</h1>
    <p>Email: {{ userEmail }}</p>
    <p>City: {{ userCity }}</p>
  </div>
</template>
```

### Form Binding with Raw Ref

```vue
<script setup lang="ts">
import { useReactiveOptional } from '@/utils/ReactiveOptional';

interface FormData {
  username?: string;
  email?: string;
  age?: number;
}

const form = useReactiveOptional<FormData>({
  username: '',
  email: '',
  age: undefined
});

const isValid = computed(() =>
  form.optional.value
    .map(f => f.username)
    .filter(name => name !== undefined && name.length >= 3)
    .isPresent()
);

async function submitForm() {
  if (!isValid.value) return;

  // Send to backend
  await saveFormData(form.raw.value);
}
</script>

<template>
  <form @submit.prevent="submitForm">
    <!-- Direct binding to raw ref for v-model -->
    <input v-model="form.raw.username" placeholder="Username" />
    <input v-model="form.raw.email" type="email" placeholder="Email" />
    <input v-model.number="form.raw.age" type="number" placeholder="Age" />

    <button :disabled="!isValid">Submit</button>
  </form>
</template>
```

## Real-World Example: Product Management

```typescript
interface ProductDTO {
  id?: number;
  name?: string;
  price?: number;
  stock?: number;
  category?: {
    id?: number;
    name?: string;
  };
}

function useProduct(productId: number) {
  const product = useReactiveOptional<ProductDTO>({
    id: productId,
    name: 'Loading...',
    price: 0,
    stock: 0
  });

  // Display values with fallbacks
  const displayName = computed(() =>
    product.optional.value.map(p => p.name).orElse('Unknown Product')
  );

  const displayPrice = computed(() =>
    product.optional.value
      .flatMap(p => p.price)
      .map(price => `€${price.toFixed(2)}`)
      .orElse('Price not available')
  );

  const isInStock = computed(() =>
    product.optional.value
      .flatMap(p => p.stock)
      .map(stock => stock > 0)
      .orElse(false)
  );

  const categoryName = computed(() =>
    product.optional.value
      .flatMap(p => p.category?.name)
      .orElse('Uncategorized')
  );

  // Load product from backend
  async function loadProduct() {
    await product.setAsync(fetchProduct(productId));
  }

  // Update product locally (e.g., admin panel)
  function updatePrice(newPrice: number) {
    if (product.raw.value) {
      product.raw.value.price = newPrice;
    }
  }

  async function saveProduct() {
    if (!product.raw.value) return;

    await updateProductAPI(product.raw.value);
  }

  return {
    product: product.optional,
    displayName,
    displayPrice,
    isInStock,
    categoryName,
    loadProduct,
    updatePrice,
    saveProduct
  };
}
```

## Pattern: Initial Empty DTO + Async Load

This is the recommended pattern for avoiding `?.` chains in your components:

```typescript
function useOrder(orderId: number) {
  // 1. Start with empty DTO - component can render immediately
  const order = useReactiveOptional<OrderDTO>(createEmptyOrderDTO());

  // 2. All computed properties use Optional API with sensible fallbacks
  const orderStatus = computed(() =>
    order.optional.value
      .map(o => o.status)
      .orElse('pending')
  );

  const orderTotal = computed(() =>
    order.optional.value
      .flatMap(o => o.totalAmount)
      .map(amount => `€${amount.toFixed(2)}`)
      .orElse('€0.00')
  );

  const customerName = computed(() =>
    order.optional.value
      .flatMap(o => o.customer?.name)
      .orElse('Guest')
  );

  // 3. Load real data asynchronously
  async function loadOrder() {
    await order.setAsync(fetchOrderFromAPI(orderId));
  }

  // 4. Component can immediately render with loading states,
  //    then automatically updates when data arrives
  return {
    order: order.optional,
    orderStatus,
    orderTotal,
    customerName,
    loadOrder
  };
}
```
