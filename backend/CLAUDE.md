# CloudMart Backend — CLAUDE.md

## Tech Stack
- **Runtime**: Node.js + TypeScript (ESM)
- **Framework**: Express.js
- **ORM**: Prisma + PostgreSQL 15
- **Auth**: JWT (access 15m / refresh 7d) + bcryptjs
- **Validation**: Zod (in controllers only)
- **Email**: không có (không gửi email — đã bỏ SES, forgot/reset password, verify email)
- **Storage**: AWS S3 (production) / local `/uploads` (development)

---

## Commands

```bash
# Development
npm run dev              # ts-node-dev, hot reload

# Database
npx prisma migrate dev   # tạo migration mới sau khi sửa schema
npx prisma generate      # regenerate Prisma Client (bắt buộc sau migrate)
npx prisma studio        # UI quản lý DB local
npx prisma db seed       # seed dữ liệu mẫu (nếu có)

# Docker (local DB)
docker compose up -d     # khởi động PostgreSQL
docker compose down      # tắt

# Build & Deploy
npm run build            # tsc → dist/
npm start                # chạy dist/index.js (production)
```

> Sau mỗi lần sửa `prisma/schema.prisma` phải chạy `migrate dev` + `generate`.

---

## Architecture

```
src/
  controllers/   # Parse request, gọi service, trả response. Không chứa business logic.
  services/      # Toàn bộ business logic. Giao tiếp với Prisma.
  routes/        # Khai báo Router, wire middleware + controller. Không có logic.
  middlewares/   # authenticate, requireAdmin, errorHandler, validate
  lib/           # prisma.ts, jwt.ts
prisma/
  schema.prisma  # Source of truth cho database schema
```

**Request flow**: `Route → Middleware → Controller → Service → Prisma`

---

## Code Conventions

### Naming
- **Files**: `kebab-case` — `auth.service.ts`, `order.routes.ts`
- **Functions/variables**: `camelCase`
- **Classes/Types/Interfaces**: `PascalCase`
- **Env vars**: `UPPER_SNAKE_CASE`
- **Prisma models**: `PascalCase` (theo Prisma convention)

### TypeScript
- Luôn type rõ ràng cho params và return của public functions
- Không dùng `any` — dùng `unknown` nếu cần, narrowing sau
- Import type khi chỉ cần type: `import type { Foo } from './foo'`
- Dùng `import * as authService from '../services/auth.service'` cho service imports

### Error Handling
- Throw `AppError(statusCode, message)` từ service để báo lỗi nghiệp vụ
- Controller luôn wrap bằng `try/catch` + `next(err)`
- `errorHandler` middleware xử lý tập trung — không `res.status()` trực tiếp trong catch
- HTTP 409 = conflict, 401 = unauthenticated, 403 = forbidden, 404 = not found, 400 = bad request

```ts
// ✅ Đúng
export async function getOrder(req, res, next) {
  try {
    const result = await orderService.getOrder(id, userId, role)
    res.json(result)
  } catch (err) { next(err) }
}

// ❌ Sai — xử lý error trong controller
if (!order) return res.status(404).json({ error: 'Not found' })
```

### Validation
- Dùng **Zod** ở đầu controller để parse + validate `req.body` / `req.query`
- Schema định nghĩa ngay trong file controller (không tách file riêng trừ khi dùng lại)
- `schema.parse()` tự throw ZodError → `errorHandler` bắt và trả 400

### Database (Prisma)
- Luôn dùng `select` để chỉ lấy field cần thiết — không để Prisma trả toàn bộ model
- Dùng `$transaction` cho các thao tác multi-step (vd: tạo order + decrement stock)
- Không để business logic trong `prisma.$transaction` callback — giữ ngắn gọn
- Index theo `@@index` trong schema cho các field query thường xuyên

### Authentication
- `authenticate` middleware attach `req.user = { userId, role }` sau khi verify JWT
- `requireAdmin` check `req.user.role === 'ADMIN'`, đặt sau `authenticate`
- Access token: 15 phút, Refresh token: 7 ngày (stored trong DB)
- Refresh token rotation: delete cũ, tạo mới mỗi lần refresh

### Response format
```ts
// Success
res.json({ message: '...', data: ... })     // hoặc trực tiếp object
res.status(201).json({ ...created })

// Error — do errorHandler tự xử lý
throw new AppError(404, 'Order not found')
```

---

## Environment Variables

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://admin:password@localhost:5432/cloudmart"
JWT_ACCESS_SECRET=...      # min 32 chars
JWT_REFRESH_SECRET=...     # khác ACCESS_SECRET
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
# AWS (production only)
AWS_REGION=ap-southeast-1
S3_BUCKET=cloudmart-media
S3_REGION=ap-southeast-1
```

> `.env` không được commit. Dùng `.env.example` làm template.

---

## Security Rules
- Không bao giờ trả `passwordHash` trong response — luôn dùng `select`
- Revoke tất cả refresh token của user khi đổi mật khẩu
- CORS chỉ cho phép `CLIENT_URL`

---

## AWS Migration Notes
| Local | AWS Production |
|---|---|
| `/uploads` folder | AWS S3 |
| `docker-compose` postgres | RDS PostgreSQL |
| `ts-node-dev` | ECS Fargate / EC2 |
