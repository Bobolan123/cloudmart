# CloudMart Frontend — CLAUDE.md

## Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4
- **State**: Zustand (`useAuthStore`, `useCartStore`)
- **HTTP**: Axios + interceptors tự động refresh token
- **Auth tokens**: `js-cookie` (accessToken 15m / refreshToken 7d)
- **Font**: Geist Sans (next/font/google)

---

## Commands

```bash
npm run dev        # dev server tại localhost:3000
npm run build      # production build (kiểm tra type errors)
npm run start      # chạy production build
npm run lint       # ESLint
npx tsc --noEmit   # type-check toàn bộ project
```

> Chạy `npm run build` trước khi PR để đảm bảo không có type error.

---

## Architecture

```
src/
  app/              # Next.js App Router — mỗi folder là 1 route segment
    page.tsx        # Trang chủ
    layout.tsx      # Root layout (Providers + Navbar)
    providers.tsx   # Wrap toàn bộ app (Zustand hydration, v.v.)
    login/          # /login
    register/       # /register
    products/[id]/  # /products/:id
    cart/           # /cart
    checkout/       # /checkout
    account/        # /account (layout riêng, protected)
      profile/
      orders/
      orders/[id]/
      addresses/
    admin/          # /admin (layout riêng, ADMIN only)
      products/
  components/       # Shared UI components (Navbar, ProductForm, ...)
  lib/
    api.ts          # Axios instance + interceptors (token inject + refresh)
    auth.ts         # Helper functions liên quan auth
    image.ts        # Helper xử lý image URL (S3)
  store/
    auth.store.ts   # useAuthStore — user state, fetchMe, setUser
    cart.store.ts   # useCartStore — items, total, CRUD actions
```

**Data flow**: `Component → Store action → api (axios) → Backend API → Store update → Re-render`

---

## Code Conventions

### Naming
- **Files/Folders**: `kebab-case` — `auth.store.ts`, `product-card.tsx`
- **Components**: `PascalCase` — `export default function ProductCard()`
- **Hooks/Stores**: `camelCase` — `useAuthStore`, `useCartStore`
- **Types/Interfaces**: `PascalCase` — `interface CartItem`, `type User`
- **Constants**: `UPPER_SNAKE_CASE`

### Components
- Mỗi component 1 file, đặt trong `src/components/` (shared) hoặc cùng thư mục route (local)
- Luôn export default cho page/layout, export named cho shared components
- Props interface đặt ngay trên component, không tách file riêng trừ khi dùng nhiều chỗ

```tsx
// ✅ Đúng
interface Props {
  productId: string
  quantity?: number
}

export function AddToCartButton({ productId, quantity = 1 }: Props) { ... }

// ❌ Sai — inline object type
export function AddToCartButton({ productId }: { productId: string }) { ... }
```

### App Router Rules
- `page.tsx` = routable page (cần export default)
- `layout.tsx` = layout wrapper cho route segment và con của nó
- `loading.tsx` = loading UI (Suspense fallback tự động)
- `error.tsx` = error boundary (phải là Client Component)
- Server Component by default — chỉ thêm `'use client'` khi cần hooks/events

```tsx
// Khi nào dùng 'use client'
// ✅ Cần: useState, useEffect, event handlers, Zustand stores, browser APIs
// ❌ Không cần: fetch data, async operations, chỉ render JSX

'use client'
import { useAuthStore } from '@/store/auth.store'
```

### Data Fetching
- Server Components: dùng `fetch()` hoặc `async/await` trực tiếp
- Client Components: dùng `api` (axios) từ `@/lib/api` + Zustand store actions
- Không gọi `api` trong Server Components — chỉ dùng trong `'use client'` components

### Authentication & Authorization
- Token lưu trong cookies: `accessToken` (15m) + `refreshToken` (7d)
- `api.ts` interceptor tự động inject `Authorization: Bearer <token>` vào mọi request
- Khi 401: interceptor tự refresh token, retry request — component không cần xử lý
- Khi refresh fail: xóa cookies + redirect `/login`
- Protected routes: check `useAuthStore().user` trong layout, redirect nếu null
- Admin routes: check `user.role === 'ADMIN'`

```tsx
// ✅ Check auth trong layout
'use client'
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading])

  if (isLoading || !user) return <LoadingSpinner />
  return <>{children}</>
}
```

### State Management (Zustand)
- Không tạo store mới cho từng feature nhỏ — mở rộng `auth.store` và `cart.store`
- Store chỉ chứa: state, async actions gọi API, setter đơn giản
- Không chứa UI logic (modal open/close, form state) trong Zustand — dùng local `useState`

### Styling (Tailwind)
- Dùng utility classes trực tiếp, không viết custom CSS trừ khi cần thiết
- Không dùng `style={}` inline cho layout/spacing — dùng Tailwind
- Breakpoint mobile-first: `sm:`, `md:`, `lg:`, `xl:`
- Màu sắc theo design system của project, không hardcode hex

### TypeScript
- Không dùng `any` — dùng `unknown` + type narrowing
- Import type rõ ràng: `import type { User } from '@/lib/auth'`
- Path alias `@/` trỏ tới `src/` — luôn dùng alias, không dùng relative path từ xa

```ts
// ✅ Đúng
import { useAuthStore } from '@/store/auth.store'
import type { CartItem } from '@/store/cart.store'

// ❌ Sai
import { useAuthStore } from '../../../store/auth.store'
```

---

## Environment Variables

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000  # Backend API base URL
# Production
NEXT_PUBLIC_API_URL=https://api.cloudmart.vn
```

> Chỉ biến có prefix `NEXT_PUBLIC_` mới expose ra client-side.
> Secret keys không được đặt `NEXT_PUBLIC_`.

---

## API Integration

- Base URL từ `NEXT_PUBLIC_API_URL`
- Mọi request qua `import { api } from '@/lib/api'`
- Response data lấy từ `data` field của axios: `const { data } = await api.get('/cart')`
- Lỗi từ backend có format: `{ error: string }` — handle bằng `error.response?.data?.error`

```ts
// ✅ Pattern chuẩn trong store action
addItem: async (productId, quantity = 1) => {
  try {
    const { data } = await api.post('/cart/items', { productId, quantity })
    set({ items: data.items })
  } catch (err) {
    // handle error, hoặc re-throw để component xử lý
    throw err
  }
}
```

---

## Gotchas

- `useAuthStore` và `useCartStore` là client-side — không dùng trong Server Components
- Token refresh xảy ra tự động trong `api.ts` — không xử lý 401 thủ công ở component
- Image từ S3: dùng helper `getImageUrl()` từ `@/lib/image` thay vì hardcode URL
- Next.js App Router: layout không re-render khi navigate giữa các route cùng layout
- `providers.tsx` dùng để hydrate Zustand từ cookies khi page load (server → client)
