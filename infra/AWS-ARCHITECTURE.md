# CloudMart — AWS Architecture

> **Region:** ap-southeast-1 (Singapore)
> **Cập nhật:** 2026-06-04

---

## Hai phase học tập

```
Phase 1 (tuần 1-2): EC2 + Docker Compose   ← đang làm
Phase 2 (tuần 3-4): ECS Fargate + ALB      ← sau khi Phase 1 chạy ổn
```

Phase 1 rẻ hơn, setup nhanh hơn, học được Linux + Docker + Nginx.
Phase 2 là cloud-native AWS pattern — làm sau khi đã hiểu hệ thống.

---

# PHASE 1 — EC2 + Docker Compose

## Kiến trúc tổng quan

```
Internet
    │
EC2 t3.small (public subnet, public IP)
    │
  Nginx :80 / :443
    ├── /api/*  →  backend container :4000  (Express)
    └── /*      →  frontend container :3000 (Next.js)
         │
         ├── RDS PostgreSQL (private subnet)  ← tất cả data
         ├── S3                               ← ảnh sản phẩm
         ├── SES                              ← gửi email
         └── SQS → Lambda                    ← xử lý order async
                      │
                      └── SES → email user
```

**Tại sao đơn giản hơn Phase 2:**
- Không có NAT Gateway ($32/tháng) — EC2 ở public subnet, có public IP, ra internet trực tiếp
- Không có ALB ($18/tháng) — Nginx đảm nhiệm thay
- Không có ECR — Docker build và run thẳng trên EC2
- Tổng chi phí: **~$27/tháng** (so với ~$63 của ECS)

---

## VPC Layout

```
VPC: cloudmart-vpc — 10.0.0.0/16

PUBLIC (EC2 đứng ở đây)
  cloudmart-public-1a   10.0.1.0/24   ap-southeast-1a
  → Route: 0.0.0.0/0 → Internet Gateway
  → EC2 được cấp public IP → ra internet trực tiếp, không cần NAT

PRIVATE (RDS đứng ở đây — RDS bắt buộc phải có subnet group ≥ 2 AZ)
  cloudmart-data-1a     10.0.21.0/24  ap-southeast-1a
  cloudmart-data-1b     10.0.22.0/24  ap-southeast-1b
  → Route: local only (không ra internet)
```

**Tại sao chỉ cần 2 tầng thay vì 3:**
- EC2 có public IP → không cần tầng "app private" + NAT Gateway
- RDS vẫn ở private subnet → bảo mật, không expose ra internet
- Đơn giản hơn nhưng vẫn đúng nguyên tắc bảo mật

**Tại sao RDS cần 2 AZ mặc dù không dùng Multi-AZ:**
AWS bắt buộc DB Subnet Group phải span ≥ 2 AZ. RDS instance thực tế chỉ chạy ở 1 AZ (data-1a), nhưng vẫn phải tạo subnet ở 2 AZ.

---

## Security Groups

Chỉ cần 2 security groups:

```
sg-ec2:
  Inbound:
    80   TCP  0.0.0.0/0      HTTP (Nginx)
    443  TCP  0.0.0.0/0      HTTPS (Nginx)
    22   TCP  YOUR_IP/32     SSH — CHỈ IP của bạn, không phải 0.0.0.0/0
  Outbound:
    All  (EC2 cần gọi ra S3, SES, SQS, RDS)

sg-rds:
  Inbound:
    5432 TCP  sg-ec2         Chỉ EC2 kết nối PostgreSQL
  Outbound:
    (không cần)
```

**Lưu ý SSH:** Đừng để port 22 mở cho `0.0.0.0/0` — bot scan liên tục, brute force password. Chỉ whitelist IP của bạn. Nếu IP dynamic, dùng AWS Systems Manager Session Manager thay SSH (không cần mở port 22).

---

## IAM — EC2 Instance Profile

EC2 cần quyền gọi S3, SES, SQS mà không cần access key hardcode trong code.

```json
{
  "Role": "cloudmart-role-ec2",
  "Trust": "ec2.amazonaws.com",
  "Policies": [
    {
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::cloudmart-media-ACCOUNT_ID/*"
    },
    {
      "Action": ["ses:SendEmail", "ses:SendRawEmail"],
      "Resource": "*"
    },
    {
      "Action": ["sqs:SendMessage"],
      "Resource": "arn:aws:sqs:ap-southeast-1:ACCOUNT_ID:cloudmart-order-queue"
    },
    {
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:ap-southeast-1:ACCOUNT_ID:log-group:/ec2/cloudmart*"
    }
  ]
}
```

Attach Instance Profile này vào EC2 khi launch. Code dùng AWS SDK sẽ tự lấy credentials từ instance metadata — không cần `AWS_ACCESS_KEY_ID` trong `.env`.

---

## EC2 Instance

```
Instance Type: t3.small   (2 vCPU, 2 GB RAM)
AMI:           Ubuntu 24.04 LTS
Storage:       20 GB gp3
Subnet:        cloudmart-public-1a
Public IP:     Enabled (Elastic IP để IP không đổi khi restart)
SG:            sg-ec2
IAM Profile:   cloudmart-role-ec2
Key Pair:      Tạo mới, lưu .pem file cẩn thận
```

**Tại sao t3.small thay t3.micro:**
t3.micro (1 GB RAM) thường OOM khi chạy cùng lúc Node.js backend + Next.js SSR + Nginx. t3.small ($17/tháng) đủ thoải mái và gấp đôi RAM.

**Elastic IP:** EC2 mặc định đổi public IP mỗi lần restart. Elastic IP cố định IP đó, miễn phí khi đang gắn vào running instance, tốn $0.005/giờ nếu không dùng.

---

## RDS PostgreSQL

```
Instance:   cloudmart-postgres
Engine:     PostgreSQL 16.x
Class:      db.t3.micro (1 GB RAM — đủ cho học tập)
Storage:    20 GB gp3
Multi-AZ:   Tắt
Subnet:     cloudmart-rds-subnet-group (data-1a + data-1b)
SG:         sg-rds
Public:     Không
Backup:     7 ngày
```

---

## S3 — Image Storage

```
Bucket: cloudmart-media-ACCOUNT_ID
Block Public Access: Bật hoàn toàn
Versioning: Tắt
Encryption: SSE-S3 (default)

CORS:
  AllowedOrigins: ["http://EC2_PUBLIC_IP", "https://yourdomain.com"]
  AllowedMethods: ["GET", "PUT", "POST"]
  MaxAgeSeconds: 3600
```

Để ảnh accessible từ browser: có 2 lựa chọn:
- **Option A:** Bật public-read cho objects (đơn giản, đủ cho học tập)
- **Option B:** Dùng presigned URL (secure hơn, làm sau)

---

## SES — Email

```
1. Verify domain hoặc email trong SES Console
2. Sandbox mode: chỉ gửi đến verified emails
3. Request production access để gửi tự do
4. SES miễn phí: 62k emails/tháng khi gửi từ EC2
```

---

## SQS + Lambda — Order Processing

```
Queue: cloudmart-order-queue (Standard)
  Visibility Timeout: 180s
  Long Polling: 20s
  DLQ: cloudmart-order-queue-dlq (Max Receive: 3, Retention: 7 ngày)

Lambda: cloudmart-order-processor
  Runtime: Node.js 20.x
  Memory: 256 MB
  Timeout: 120s
  KHÔNG chạy trong VPC (Lambda không cần kết nối RDS trực tiếp ở Phase 1)
  → Lambda chỉ gửi SES email, không update RDS
  → ECS/EC2 tự update order status sau khi queue message
```

**Simplified flow cho Phase 1:**
```
1. User đặt hàng → EC2 tạo order (status=PENDING) → SQS
2. EC2 trả 201 về user ngay
3. SQS trigger Lambda
4. Lambda → SES → email confirmation cho user
5. EC2 (background job hoặc webhook) update status = CONFIRMED
```

**Tại sao Lambda không cần VPC ở Phase 1:**
Lambda trong VPC cần ENI, cần sg-lambda, cần subnet — phức tạp hơn. Nếu Lambda không cần kết nối RDS trực tiếp (chỉ gửi email), không cần đặt trong VPC. Đơn giản hơn, cold start nhanh hơn.

---

## CloudWatch — Monitoring cơ bản

```
Log Groups:
  /ec2/cloudmart-backend   (đẩy log từ Docker container lên)
  /aws/lambda/cloudmart-order-processor

Alarms:
  DLQ MessageCount > 0  → Email admin (order processing failed)
  EC2 CPUUtilization > 80%
  RDS CPUUtilization > 80%
```

---

## Chi phí Phase 1

| Service | Config | $/tháng |
|---|---|---|
| EC2 t3.small | On-demand, stop khi không học | ~$8 (8h × 20 ngày) |
| RDS db.t3.micro | Stop khi không học | ~$5 |
| Elastic IP | Miễn phí khi đang dùng | $0 |
| S3 | 5 GB | ~$1 |
| SQS + Lambda | Free tier | $0 |
| SES | Free từ EC2 | $0 |
| CloudWatch | Logs + alarms | ~$2 |
| **Tổng** | | **~$16/tháng** |

> Không có NAT Gateway, không có ALB → tiết kiệm $50/tháng so với ECS setup.

---

## Code cần sửa trước khi deploy

### Fix 1 — Cart: in-memory Map → PostgreSQL (BẮT BUỘC)

`cart.service.ts` đang dùng:
```ts
const carts = new Map<string, CartItem[]>()
```

Với 1 EC2 instance thì vẫn chạy được (1 process), nhưng khi restart server → mất cart. Cần migrate về PostgreSQL để data persistent.

Thêm vào `prisma/schema.prisma`:
```prisma
model CartItem {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  price     Decimal @db.Decimal(10, 2)

  @@unique([userId, productId])
  @@index([userId])
}
```

Cũng cần thêm relation ngược trong User và Product model:
```prisma
model User {
  ...
  cartItems CartItem[]
}

model Product {
  ...
  cartItems CartItem[]
}
```

### Fix 2 — Image upload: multer disk → S3

`upload.ts` hiện lưu file vào local disk `/uploads`. Khi container restart → mất ảnh. Cần swap sang S3.

```ts
// upload.ts — thay multer.diskStorage bằng memoryStorage + S3 SDK
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import multer from 'multer'
import crypto from 'crypto'
import path from 'path'

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })
export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

export async function uploadToS3(file: Express.Multer.File): Promise<string> {
  const ext = path.extname(file.originalname).toLowerCase()
  const key = `products/${crypto.randomUUID()}${ext}`

  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }))

  return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
}
```

Cập nhật route upload trong `product.routes.ts` để gọi `uploadToS3(req.file)` thay vì `getFileUrl`.

### Fix 3 — Order event: EventEmitter → SQS

`order.service.ts` hiện emit local event. Swap sang SQS:

```ts
// Thêm vào đầu order.service.ts
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs'
const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'ap-southeast-1' })

// Trong createOrder(), thay eventBus.emit():
if (process.env.SQS_ORDER_QUEUE_URL) {
  await sqs.send(new SendMessageCommand({
    QueueUrl: process.env.SQS_ORDER_QUEUE_URL,
    MessageBody: JSON.stringify({
      orderId: order.id,
      userId: order.userId,
      userEmail: order.user?.email,
      total: Number(order.total),
    }),
  }))
} else {
  eventBus.emit(Events.ORDER_CREATED, order)  // fallback local dev
}
```

### Fix 4 — Email: console.log → SES

`email.ts` hiện log ra console. Swap sang SES khi production:

```ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

export async function sendEmail({ to, subject, html }: EmailOptions) {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n📧 [EMAIL] To: ${to}\nSubject: ${subject}\n`)
    return
  }

  const ses = new SESClient({ region: process.env.AWS_REGION })
  await ses.send(new SendEmailCommand({
    Source: process.env.EMAIL_FROM!,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  }))
}
```

### Fix 5 — Admin getProduct: bỏ isActive filter

`product.service.ts:38` dùng `where: { id, isActive: true }` cho cả admin — admin không edit được product inactive.

```ts
// Tách thành 2 function
export async function getProduct(id: string) {          // public
  const product = await prisma.product.findFirst({ where: { id, isActive: true }, include: { category: true } })
  if (!product) throw new AppError(404, 'Product not found')
  return product
}

export async function getProductAdmin(id: string) {     // admin
  const product = await prisma.product.findUnique({ where: { id }, include: { category: true } })
  if (!product) throw new AppError(404, 'Product not found')
  return product
}
```

---

## Docker setup cho Phase 1

### frontend/Dockerfile (cần tạo mới)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# NEXT_PUBLIC_* bị bake vào bundle lúc build — phải truyền vào đây
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

> Next.js standalone output cần thêm vào `next.config.ts`:
> ```ts
> const nextConfig = { output: 'standalone' }
> ```
> Standalone mode giảm image size từ ~800MB xuống ~200MB.

### docker-compose.yml (đặt ở root project)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    restart: unless-stopped

  backend:
    build: ./backend
    expose:
      - "4000"
    env_file:
      - ./backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 30s
      timeout: 5s
      retries: 3

  frontend:
    build:
      context: ./frontend
      args:
        - NEXT_PUBLIC_API_URL=http://EC2_PUBLIC_IP/api
    expose:
      - "3000"
    restart: unless-stopped
    depends_on:
      - backend
```

### nginx.conf (đặt ở root project)

```nginx
events {
  worker_connections 1024;
}

http {
  upstream backend {
    server backend:4000;
  }

  upstream frontend {
    server frontend:3000;
  }

  server {
    listen 80;

    # Tăng limit cho file upload
    client_max_body_size 10M;

    location /api/ {
      proxy_pass         http://backend/api/;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade $http_upgrade;
      proxy_set_header   Connection 'upgrade';
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
      proxy_cache_bypass $http_upgrade;
    }

    location / {
      proxy_pass         http://frontend;
      proxy_http_version 1.1;
      proxy_set_header   Upgrade $http_upgrade;
      proxy_set_header   Connection 'upgrade';
      proxy_set_header   Host $host;
      proxy_cache_bypass $http_upgrade;
    }
  }
}
```

### backend/.env (production trên EC2)

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://admin:PASSWORD@RDS_ENDPOINT:5432/cloudmart"
JWT_ACCESS_SECRET=your_32_char_random_string_here
JWT_REFRESH_SECRET=your_other_32_char_random_string
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLIENT_URL=http://EC2_PUBLIC_IP
EMAIL_FROM=noreply@yourdomain.com
AWS_REGION=ap-southeast-1
S3_BUCKET=cloudmart-media-ACCOUNT_ID
SQS_ORDER_QUEUE_URL=https://sqs.ap-southeast-1.amazonaws.com/ACCOUNT_ID/cloudmart-order-queue
```

---

## Kế hoạch 2 tuần — Phase 1

### Tuần 1 — Infrastructure + Backend

#### Ngày 1 — VPC & Network

```
Tạo VPC (10.0.0.0/16)
Tạo Internet Gateway → attach vào VPC
Tạo subnets:
  public-1a  (10.0.1.0/24)
  data-1a    (10.0.21.0/24)
  data-1b    (10.0.22.0/24)
Tạo Route Table public: 0.0.0.0/0 → IGW
Tạo Route Table data: local only
Associate route tables với đúng subnets

Kiểm tra: Route tables đúng chưa?
```

#### Ngày 2 — Security Groups + IAM + RDS

```
Tạo Security Groups:
  sg-ec2  (80, 443, 22 từ YOUR_IP)
  sg-rds  (5432 từ sg-ec2)

Tạo IAM Role + Instance Profile:
  cloudmart-role-ec2 (S3, SES, SQS, CloudWatch Logs)

Tạo RDS:
  DB Subnet Group: data-1a + data-1b
  PostgreSQL 16, db.t3.micro, 20GB gp3
  SG: sg-rds, không public

Kiểm tra: RDS endpoint có hiện ra chưa?
```

#### Ngày 3 — EC2 + Docker

```
Launch EC2:
  AMI: Ubuntu 24.04 LTS
  Type: t3.small
  Subnet: public-1a, enable public IP
  SG: sg-ec2
  IAM Profile: cloudmart-role-ec2
  Key pair: tạo mới

Cấp Elastic IP → associate với EC2

SSH vào EC2:
  ssh -i keypair.pem ubuntu@EC2_PUBLIC_IP

Cài Docker:
  sudo apt update
  sudo apt install -y docker.io docker-compose-v2
  sudo usermod -aG docker ubuntu
  newgrp docker

Kiểm tra: docker --version, docker compose version
```

#### Ngày 4 — Sửa code + Prisma migration

```
Làm các fix trong code (Fix 1-5 ở trên)
Thêm next.config.ts: output: 'standalone'
Thêm frontend/Dockerfile
Thêm docker-compose.yml + nginx.conf ở root

Chạy Prisma migration vào RDS (từ local):
  DATABASE_URL="postgresql://admin:PASSWORD@RDS_ENDPOINT:5432/cloudmart" \
  npx prisma migrate deploy

Kiểm tra: Tables đã tạo trong RDS chưa?
  npx prisma studio (kết nối thử)
```

#### Ngày 5 — Deploy lên EC2

```
# Trên local: push code lên GitHub
git add . && git commit -m "phase1: ec2 docker setup"
git push

# SSH vào EC2
git clone https://github.com/your/cloudmart.git
cd cloudmart

# Tạo backend/.env với production values
nano backend/.env

# Build + run
docker compose build
docker compose up -d

Kiểm tra:
  docker compose ps          (tất cả containers running)
  docker compose logs -f     (xem logs realtime)
  curl http://localhost/health
  curl http://EC2_PUBLIC_IP/health
```

#### Ngày 6 — S3 + SES

```
S3:
  Tạo bucket cloudmart-media-ACCOUNT_ID
  Bật S3 Access từ EC2 Instance Profile (không cần bucket policy phức tạp)
  Test: upload ảnh qua API → xem có lên S3 không

SES:
  Verify email address của bạn trong SES Console
  Test gửi email:
    aws ses send-email \
      --from verified@email.com \
      --to your@email.com \
      --subject "Test" \
      --text "Hello from SES"
  (Test thử rồi request production access)
```

#### Ngày 7 — End-to-end test tuần 1

```
Test toàn bộ flow:
  ✅ Register / Login / Logout
  ✅ Browse products, search, filter
  ✅ Add to cart (kiểm tra cart persistent sau khi restart docker)
  ✅ Checkout → order tạo được
  ✅ Admin: tạo / sửa / xóa product
  ✅ Admin: upload ảnh → hiện trên S3 URL

Fix bugs nếu có
```

### Tuần 2 — SQS + Lambda + Monitoring

#### Ngày 8 — SQS Queue

```
Tạo SQS Queue:
  cloudmart-order-queue (Standard)
  Visibility Timeout: 180s
  Long Polling: 20s

Tạo DLQ:
  cloudmart-order-queue-dlq
  Max Receive Count: 3

Update backend/.env thêm SQS_ORDER_QUEUE_URL
Rebuild + restart:
  docker compose build backend
  docker compose up -d backend

Test: Đặt hàng → kiểm tra SQS Console có message không
```

#### Ngày 9 — Lambda Order Processor

```
Viết Lambda function:
  Runtime: Node.js 20.x
  Trigger: SQS cloudmart-order-queue (batch size 5)
  Code:
    - Nhận event từ SQS
    - Parse order data
    - Gửi email qua SES

Tạo IAM Role cho Lambda:
  SQS: ReceiveMessage, DeleteMessage
  SES: SendEmail
  Logs: CreateLogGroup, CreateLogStream, PutLogEvents

Deploy Lambda (console hoặc zip upload)
Test: Đặt hàng → email nhận được?
```

#### Ngày 10 — CloudWatch Monitoring

```
Tạo Log Group cho EC2:
  /ec2/cloudmart-backend

Cài CloudWatch Agent trên EC2 (optional):
  sudo apt install amazon-cloudwatch-agent

Tạo Alarms:
  DLQ MessageCount > 0 → SNS → Email admin
  EC2 CPUUtilization > 80%
  RDS CPUUtilization > 80%

Tạo SNS Topic cho alerts:
  cloudmart-alerts → subscribe email của bạn
```

#### Ngày 11-12 — HTTPS + Domain (optional)

```
Nếu có domain riêng:
  Route 53 → A record → EC2 Elastic IP

Nếu không có domain: dùng HTTP trên IP tạm, hoặc dùng Caddy thay Nginx
  (Caddy tự lấy SSL certificate Let's Encrypt không cần config gì thêm)

Với Caddy thay Nginx:
  services:
    caddy:
      image: caddy:alpine
      ports: ["80:80", "443:443"]
      volumes:
        - ./Caddyfile:/etc/caddy/Caddyfile
        - caddy_data:/data

  Caddyfile:
    yourdomain.com {
      handle /api/* {
        reverse_proxy backend:4000
      }
      handle {
        reverse_proxy frontend:3000
      }
    }
```

#### Ngày 13-14 — Review + Start/Stop Scripts

```
Test lại toàn bộ:
  ✅ Cart persistent sau restart Docker
  ✅ Ảnh upload lên S3 và hiện đúng
  ✅ Order → SQS → Lambda → email
  ✅ CloudWatch alarms fire khi test
  ✅ HTTPS hoạt động (nếu có domain)

Setup scripts tiết kiệm tiền (xem mục dưới)
Ghi chú những gì học được
Chuẩn bị cho Phase 2 (ECS Fargate)
```

---

## Start/Stop Scripts — Phase 1

EC2 có thể stop/start dễ dàng (khác NAT Gateway). **Stop EC2 khi không học = $0 compute cost.**

### cloudmart-start.ps1

```powershell
$Region     = "ap-southeast-1"
$InstanceId = "i-XXXXXXXXXXXXXXXXX"   # thay bằng EC2 instance ID thật
$RdsId      = "cloudmart-postgres"

Write-Host "Starting RDS..."
aws rds start-db-instance --db-instance-identifier $RdsId --region $Region

Write-Host "Waiting for RDS (~3-5 minutes)..."
aws rds wait db-instance-available --db-instance-identifier $RdsId --region $Region

Write-Host "Starting EC2..."
aws ec2 start-instances --instance-ids $InstanceId --region $Region

Write-Host "Waiting for EC2..."
aws ec2 wait instance-running --instance-ids $InstanceId --region $Region

$ip = (aws ec2 describe-instances `
  --instance-ids $InstanceId `
  --query "Reservations[0].Instances[0].PublicIpAddress" `
  --output text --region $Region)

Write-Host "Done! EC2 IP: $ip"
Write-Host "Wait ~30s for Docker containers to start."
Write-Host "App: http://$ip"
```

### cloudmart-stop.ps1

```powershell
$Region     = "ap-southeast-1"
$InstanceId = "i-XXXXXXXXXXXXXXXXX"
$RdsId      = "cloudmart-postgres"

Write-Host "Stopping EC2..."
aws ec2 stop-instances --instance-ids $InstanceId --region $Region

Write-Host "Stopping RDS..."
aws rds stop-db-instance --db-instance-identifier $RdsId --region $Region

Write-Host "Done. Saving ~$0.50/hour."
```

> **Lưu ý:** Nếu không dùng Elastic IP, public IP của EC2 sẽ thay đổi mỗi lần start. Dùng Elastic IP để giữ IP cố định. Nếu EC2 stop, Elastic IP vẫn miễn phí (chỉ tốn tiền khi allocated nhưng không attached).

---

## Thứ tự phụ thuộc

```
VPC + IGW + Subnets + Route Tables
    ↓
Security Groups (sg-ec2, sg-rds)
    ↓
IAM Role + Instance Profile
    ↓
RDS (cần subnet group + sg-rds)
    ↓
EC2 (cần subnet + sg-ec2 + IAM Profile + Key Pair)
    ↓
Elastic IP → attach EC2
    ↓
S3 bucket
    ↓
SES verify email/domain
    ↓
Code fixes (Fix 1-5) + Dockerfiles + docker-compose.yml
    ↓
SSH EC2 → git clone → docker compose up
    ↓
Prisma migrate deploy → RDS
    ↓
SQS Queue + DLQ
    ↓
Lambda (cần SQS ARN + SES)
    ↓
CloudWatch Alarms
```

---

---

# PHASE 2 — ECS Fargate + ALB

> Làm sau khi Phase 1 chạy ổn. Mục tiêu: học cloud-native AWS pattern.

## Những gì thay đổi từ Phase 1

```
Phase 1                    Phase 2
──────────────────────     ────────────────────────────
EC2 t3.small          →   ECS Fargate (0.5 vCPU, 1GB)
Docker Compose        →   ECR + ECS Task Definition
Nginx (trên EC2)      →   ALB (internet-facing)
EC2 ở public subnet   →   ECS ở private subnet + NAT GW
~$27/tháng            →   ~$63/tháng
```

## Tại sao học Phase 2

| Học được | Phase 1 | Phase 2 |
|---|---|---|
| Linux, Docker, Nginx | ✅ | ❌ |
| RDS, S3, SES, SQS | ✅ | ✅ |
| ECR, ECS, Task Definition | ❌ | ✅ |
| ALB, Target Group, Health Check | ❌ | ✅ |
| VPC 3-tier, NAT Gateway | ❌ | ✅ |
| Auto-scaling containers | ❌ | ✅ |
| Zero-downtime rolling deploy | ❌ | ✅ |
| Secrets Manager inject vào container | ❌ | ✅ |

## VPC Phase 2 (3 tầng)

```
PUBLIC:   ALB + NAT Gateway
APP:      ECS Fargate tasks + Lambda (private)
DATA:     RDS PostgreSQL (private)
```

## Chi phí Phase 2

| Service | $/tháng |
|---|---|
| NAT Gateway | ~$32 |
| ALB | ~$18 |
| ECS Fargate (1 task, 8h/ngày) | ~$4 |
| RDS (stop khi không dùng) | ~$5 |
| S3, SES, SQS, Lambda | ~$1 |
| **Tổng** | **~$60/tháng** |

## Migration từ Phase 1 sang Phase 2

```
1. Tạo ECR repo → push Docker images (backend + frontend)
2. Tạo VPC 3-tier (thêm app subnets + NAT Gateway)
3. Tạo ALB + Target Group (port 4000)
4. Tạo ECS Cluster + Task Definition + Service
   → Secrets từ Secrets Manager (thay .env file)
   → Logs → CloudWatch
5. Frontend → AWS Amplify (thay vì chạy container trên EC2)
6. Tear down EC2 (hoặc giữ lại để so sánh)
```

> Xem chi tiết ECS setup trong document phiên bản ECS (archive).
