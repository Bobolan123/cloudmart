import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, ShadingType, convertInchesToTwip,
  TableOfContents, StyleLevel, PageBreak,
} from 'docx'
import fs from 'fs'

const BLUE = '2563EB'
const DARK = '111827'
const GRAY = '6B7280'
const LIGHT_BLUE = 'DBEAFE'
const LIGHT_GRAY = 'F9FAFB'
const BORDER_GRAY = 'E5E7EB'
const GREEN = '059669'
const RED = 'DC2626'
const ORANGE = 'D97706'
const CODE_BG = '1E293B'
const CODE_FG = 'E2E8F0'
const WHITE = 'FFFFFF'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const noBorder = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
}

const thinBorder = (color = BORDER_GRAY) => ({
  top: { style: BorderStyle.SINGLE, size: 1, color },
  bottom: { style: BorderStyle.SINGLE, size: 1, color },
  left: { style: BorderStyle.SINGLE, size: 1, color },
  right: { style: BorderStyle.SINGLE, size: 1, color },
})

const h1 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: BLUE } },
})

const h2 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 320, after: 120 },
})

const h3 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 240, after: 80 },
})

const p = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, color: DARK, size: 22, ...opts })],
  spacing: { before: 60, after: 60 },
})

const note = (text) => new Paragraph({
  children: [
    new TextRun({ text: '💡 ', size: 22 }),
    new TextRun({ text, color: GRAY, size: 20, italics: true }),
  ],
  spacing: { before: 60, after: 60 },
  indent: { left: convertInchesToTwip(0.3) },
})

const bullet = (text, level = 0) => new Paragraph({
  children: [new TextRun({ text, color: DARK, size: 22 })],
  bullet: { level },
  spacing: { before: 40, after: 40 },
})

const code = (lines) => [
  new Paragraph({
    children: lines.map((line, i) => new TextRun({
      text: line + (i < lines.length - 1 ? '\n' : ''),
      font: 'Courier New',
      size: 18,
      color: CODE_FG,
    })),
    shading: { type: ShadingType.SOLID, color: CODE_BG },
    spacing: { before: 120, after: 120 },
    indent: { left: convertInchesToTwip(0.2), right: convertInchesToTwip(0.2) },
  }),
]

const inlineCode = (text) => new TextRun({
  text: ` ${text} `,
  font: 'Courier New',
  size: 20,
  color: '0369A1',
  shading: { type: ShadingType.SOLID, color: 'E0F2FE' },
})

const divider = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY } },
  spacing: { before: 200, after: 200 },
  children: [],
})

// ─── Table helpers ────────────────────────────────────────────────────────────

const tableHeader = (texts, widths) => new TableRow({
  tableHeader: true,
  children: texts.map((t, i) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: t, bold: true, color: WHITE, size: 20 })],
    })],
    shading: { type: ShadingType.SOLID, color: BLUE },
    width: { size: widths[i], type: WidthType.PERCENTAGE },
    borders: noBorder,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  })),
})

const tableRow = (texts, widths, shade = false) => new TableRow({
  children: texts.map((t, i) => new TableCell({
    children: [new Paragraph({
      children: parseInline(t),
      spacing: { before: 40, after: 40 },
    })],
    shading: shade ? { type: ShadingType.SOLID, color: LIGHT_GRAY } : undefined,
    width: { size: widths[i], type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER_GRAY },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
    },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  })),
})

const mkTable = (headers, rows, widths) => new Table({
  width: { size: 100, type: WidthType.PERCENTAGE },
  rows: [
    tableHeader(headers, widths),
    ...rows.map((r, i) => tableRow(r, widths, i % 2 === 1)),
  ],
  margins: { top: 100, bottom: 100 },
})

// ─── Inline parser (bold + inline code) ──────────────────────────────────────

function parseInline(text) {
  const runs = []
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|✅|❌|~)/g
  let last = 0, m
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), size: 20, color: DARK }))
    if (m[0].startsWith('`')) {
      runs.push(new TextRun({ text: m[0].slice(1, -1), font: 'Courier New', size: 18, color: '0369A1', shading: { type: ShadingType.SOLID, color: 'E0F2FE' } }))
    } else if (m[0].startsWith('**')) {
      runs.push(new TextRun({ text: m[0].slice(2, -2), bold: true, size: 20, color: DARK }))
    } else if (m[0] === '✅') {
      runs.push(new TextRun({ text: '✅', size: 20, color: GREEN }))
    } else if (m[0] === '❌') {
      runs.push(new TextRun({ text: '❌', size: 20, color: RED }))
    } else {
      runs.push(new TextRun({ text: m[0], size: 20, color: DARK }))
    }
    last = m.index + m[0].length
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), size: 20, color: DARK }))
  return runs.length ? runs : [new TextRun({ text, size: 20, color: DARK })]
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

const coverPage = [
  new Paragraph({ children: [], spacing: { before: 2000 } }),
  new Paragraph({
    children: [new TextRun({ text: 'CloudMart', bold: true, size: 72, color: BLUE, font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: 'AWS Architecture Design Document', size: 36, color: GRAY, font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 400 },
  }),
  new Paragraph({
    children: [new TextRun({ text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', color: BLUE, size: 28 })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }),
  new Paragraph({
    children: [new TextRun({ text: '📍  Region: ap-southeast-1 (Singapore)', size: 24, color: DARK })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: '📅  Date: 2026-05-30', size: 24, color: DARK })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 80 },
  }),
  new Paragraph({
    children: [new TextRun({ text: '🔖  Version: 1.0', size: 24, color: DARK })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 800 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Tech Stack', bold: true, size: 26, color: BLUE })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 120 },
  }),
  mkTable(
    ['Layer', 'Technology'],
    [
      ['Backend', 'Node.js + Express + TypeScript + Prisma'],
      ['Frontend', 'Next.js 14 (App Router) + Tailwind CSS'],
      ['Database', 'PostgreSQL (RDS) + DynamoDB (Cart)'],
      ['Auth', 'Custom JWT (không dùng Cognito)'],
      ['Infra', 'ECS Fargate + ALB + S3 + CloudFront'],
    ],
    [20, 80]
  ),
  new Paragraph({ children: [new PageBreak()] }),
]

// ─── Section 1: Overview ──────────────────────────────────────────────────────

const section1 = [
  h1('1. Kiến trúc tổng quan'),
  ...code([
    'Internet',
    '    │',
    '    ├── Route 53 (DNS)',
    '    │       ├── cloudmart.example.com     → CloudFront FE',
    '    │       └── api.cloudmart.example.com → CloudFront API',
    '    │',
    '    ├── CloudFront FE                  CloudFront API',
    '    │       │                                 │',
    '    │    S3 (Next.js)                        ALB',
    '    │                                         │',
    '    │                        ┌─── ECS Fargate (Node.js) ───┐',
    '    │                        │     Private App Subnet       │',
    '    │               ┌────────┤                              │',
    '    │               │        │                              │',
    '    │              RDS    DynamoDB    S3 Media        Secrets Mgr',
    '    │           PostgreSQL  (Cart)   (Images)         SSM Params',
    '    │           Private Data',
    '    │             Subnet',
    '    │                        │',
    '    │                      SQS (order-queue)',
    '    │                        │',
    '    │                     Lambda (order-processor)',
    '    │                        │',
    '    │              ┌─────────┴──────────┐',
    '    │             SNS               RDS update',
    '    │              │',
    '    │        SQS (email-queue)',
    '    │              │',
    '    │           Lambda (email-sender)',
    '    │              │',
    '    │             SES ──→ User email',
    '    │',
    '    └── Kinesis Data Streams → CloudWatch / X-Ray',
  ]),
]

// ─── Section 2: VPC ───────────────────────────────────────────────────────────

const section2 = [
  h1('2. VPC Layout'),
  h2('CIDR Design'),
  ...code([
    'VPC CIDR: 10.0.0.0/16',
    '',
    'PUBLIC SUBNETS (ALB, NAT Gateway):',
    '  cloudmart-subnet-public-1a   10.0.1.0/24   ap-southeast-1a',
    '  cloudmart-subnet-public-1b   10.0.2.0/24   ap-southeast-1b',
    '',
    'PRIVATE APP SUBNETS (ECS Fargate, Lambda):',
    '  cloudmart-subnet-app-1a      10.0.11.0/24  ap-southeast-1a',
    '  cloudmart-subnet-app-1b      10.0.12.0/24  ap-southeast-1b',
    '',
    'PRIVATE DATA SUBNETS (RDS):',
    '  cloudmart-subnet-data-1a     10.0.21.0/24  ap-southeast-1a',
    '  cloudmart-subnet-data-1b     10.0.22.0/24  ap-southeast-1b',
  ]),
  h2('Route Tables'),
  mkTable(
    ['Route Table', 'Subnet', 'Routes'],
    [
      ['cloudmart-rt-public', 'public-1a, public-1b', '0.0.0.0/0 → IGW'],
      ['cloudmart-rt-app', 'app-1a, app-1b', '0.0.0.0/0 → NAT GW'],
      ['cloudmart-rt-data', 'data-1a, data-1b', 'Local only (không có outbound internet)'],
    ],
    [28, 32, 40]
  ),
  h2('Tại sao thiết kế này?'),
  bullet('Blast radius containment — Nếu ECS bị compromise, attacker không reach thẳng RDS vì data subnet có SG riêng'),
  bullet('Defense in depth — Mỗi tier là 1 lớp bảo vệ độc lập'),
  bullet('2 AZ tối thiểu — ALB yêu cầu ≥ 2 AZ; minimum viable HA'),
  bullet('Octet thứ 3 phân tầng — 10.0.1.x = public, 10.0.11.x = app, 10.0.21.x = data; nhìn IP biết tier khi đọc log'),
  p(''),
  note('NAT Gateway: Dùng 1 (học tập, tiết kiệm ~$32/tháng). Production: 2 NAT GW (1 per AZ) để HA.'),
]

// ─── Section 3: Security Groups ───────────────────────────────────────────────

const section3 = [
  h1('3. Security Groups'),
  note('Nguyên tắc: Chỉ allow inbound tối thiểu cần thiết. Không dùng 0.0.0.0/0 cho inbound trừ ALB.'),
  h2('cloudmart-sg-alb (Application Load Balancer)'),
  mkTable(
    ['Direction', 'Port', 'Source/Dest', 'Lý do'],
    [
      ['Inbound', '443 TCP', '0.0.0.0/0', 'HTTPS từ internet'],
      ['Inbound', '80 TCP', '0.0.0.0/0', 'HTTP để redirect sang HTTPS (301)'],
      ['Outbound', '8080 TCP', 'sg-ecs', 'Forward đến ECS tasks'],
    ],
    [15, 15, 30, 40]
  ),
  h2('cloudmart-sg-ecs (ECS Fargate Tasks)'),
  mkTable(
    ['Direction', 'Port', 'Source/Dest', 'Lý do'],
    [
      ['Inbound', '8080 TCP', 'sg-alb', 'Chỉ nhận traffic từ ALB'],
      ['Outbound', '5432 TCP', 'sg-rds', 'Kết nối PostgreSQL'],
      ['Outbound', '443 TCP', '0.0.0.0/0', 'AWS APIs (ECR, CloudWatch, SQS, DynamoDB)'],
    ],
    [15, 15, 30, 40]
  ),
  h2('cloudmart-sg-rds (RDS PostgreSQL)'),
  mkTable(
    ['Direction', 'Port', 'Source/Dest', 'Lý do'],
    [
      ['Inbound', '5432 TCP', 'sg-ecs', 'ECS tasks kết nối DB'],
      ['Inbound', '5432 TCP', 'sg-lambda', 'Lambda order processor query DB'],
      ['Outbound', '—', '—', 'Không cần — RDS không chủ động connect đi'],
    ],
    [15, 15, 30, 40]
  ),
  h2('cloudmart-sg-lambda (Lambda Functions)'),
  mkTable(
    ['Direction', 'Port', 'Source/Dest', 'Lý do'],
    [
      ['Inbound', '—', '—', 'Lambda invoke bởi SQS trigger, không phải network'],
      ['Outbound', '5432 TCP', 'sg-rds', 'Update order status trong PostgreSQL'],
      ['Outbound', '443 TCP', '0.0.0.0/0', 'AWS APIs (SES, Secrets Manager, SNS)'],
    ],
    [15, 15, 30, 40]
  ),
  note('Lambda phải deploy trong VPC (private app subnet) mới reach được RDS.'),
]

// ─── Section 4: IAM ───────────────────────────────────────────────────────────

const section4 = [
  h1('4. IAM Roles & Policies'),
  h2('Phân biệt Task Execution Role vs Task Role'),
  mkTable(
    ['Role', 'Ai sử dụng', 'Khi nào'],
    [
      ['Task Execution Role', 'ECS Agent (infrastructure)', 'Pull Docker image từ ECR, inject secrets vào env vars, push logs'],
      ['Task Role', 'Application code trong container', 'Runtime — gọi DynamoDB, SQS, Kinesis, X-Ray từ code'],
    ],
    [30, 30, 40]
  ),
  h2('cloudmart-role-ecs-task-execution'),
  ...code([
    'Permissions:',
    '  ecr:GetAuthorizationToken, BatchCheckLayerAvailability,',
    '  ecr:GetDownloadUrlForLayer, BatchGetImage     → Resource: *',
    '',
    '  logs:CreateLogStream, PutLogEvents',
    '  → Resource: arn:aws:logs:...:log-group:/ecs/cloudmart-backend:*',
    '',
    '  secretsmanager:GetSecretValue',
    '  → Resource: arn:aws:secretsmanager:...:secret:cloudmart/*',
  ]),
  note('ecr:GetAuthorizationToken bắt buộc Resource: * — đây là API-level action, AWS không cho phép restrict.'),
  h2('cloudmart-role-ecs-task'),
  ...code([
    'Permissions:',
    '  dynamodb: GetItem, PutItem, UpdateItem, DeleteItem, Query',
    '  → Resource: table/cloudmart-cart và table/cloudmart-cart/index/*',
    '',
    '  sqs:SendMessage',
    '  → Resource: queue/cloudmart-order-queue',
    '',
    '  kinesis: PutRecord, PutRecords',
    '  → Resource: stream/cloudmart-user-events',
    '',
    '  xray: PutTraceSegments, PutTelemetryRecords → Resource: *',
    '',
    '  ssm: GetParameter, GetParametersByPath',
    '  → Resource: parameter/cloudmart/*',
  ]),
  h2('cloudmart-role-lambda-order-processor'),
  ...code([
    'Permissions:',
    '  sqs: ReceiveMessage, DeleteMessage, GetQueueAttributes, ChangeMessageVisibility',
    '  → Resource: queue/cloudmart-order-queue',
    '',
    '  sns:Publish → Resource: topic/cloudmart-order-notifications',
    '',
    '  secretsmanager:GetSecretValue → Resource: secret:cloudmart/db*',
    '',
    '  logs: CreateLogGroup, CreateLogStream, PutLogEvents',
    '',
    '  ec2: CreateNetworkInterface, DescribeNetworkInterfaces, DeleteNetworkInterface',
    '  → Resource: * (bắt buộc khi Lambda chạy trong VPC)',
  ]),
]

// ─── Section 5: RDS ───────────────────────────────────────────────────────────

const section5 = [
  h1('5. RDS PostgreSQL'),
  mkTable(
    ['Parameter', 'Value', 'Lý do'],
    [
      ['Engine', 'PostgreSQL 16.x', 'LTS version, Prisma support tốt'],
      ['Instance class', 'db.t3.micro', 'Burstable, đủ cho dev/học tập'],
      ['Storage', '20 GB gp3, autoscale 100 GB', 'gp3 rẻ hơn gp2 ~20%, 3000 IOPS baseline miễn phí'],
      ['Multi-AZ', 'Tắt (học tập)', 'Bật Multi-AZ = gấp đôi chi phí'],
      ['Backup retention', '7 ngày', 'Point-in-time recovery'],
      ['Deletion protection', 'Bật', 'Tránh xóa nhầm'],
      ['Subnet group', 'Private data subnets', 'Không expose ra internet'],
    ],
    [28, 32, 40]
  ),
  h2('Custom Parameter Group: cloudmart-pg16'),
  ...code([
    'max_connections = 100',
    'log_min_duration_statement = 1000   # log query > 1 giây',
    'log_checkpoints = on',
    'shared_preload_libraries = pg_stat_statements',
    'pg_stat_statements.track = all      # query performance monitoring',
  ]),
  h2('Tại sao gp3 thay gp2?'),
  mkTable(
    ['Storage Type', '20 GB IOPS', 'Chi phí/GB'],
    [
      ['gp2', '100 IOPS (3 IOPS/GB)', '$0.115'],
      ['gp3', '3,000 IOPS baseline miễn phí', '$0.092'],
    ],
    [25, 45, 30]
  ),
]

// ─── Section 6: DynamoDB ──────────────────────────────────────────────────────

const section6 = [
  h1('6. DynamoDB — Cart Table'),
  h2('Table Schema'),
  ...code([
    'Table Name:    cloudmart-cart',
    'Billing Mode:  PAY_PER_REQUEST',
    '',
    'Partition Key: userId   (String)',
    'Sort Key:      itemId   (String)',
    '',
    'Attributes:',
    '  userId       String   PK',
    '  itemId       String   SK',
    '  productId    String',
    '  productName  String',
    '  quantity     Number',
    '  price        Number   (giá tại thời điểm add vào cart)',
    '  addedAt      String   (ISO 8601)',
    '  expiresAt    Number   (Unix timestamp — TTL attribute)',
    '',
    'TTL: expiresAt = now() + 7 ngày  →  auto-expire abandoned carts',
  ]),
  h2('Tại sao DynamoDB thay RDS cho Cart?'),
  mkTable(
    ['Tiêu chí', 'DynamoDB', 'RDS PostgreSQL'],
    [
      ['TTL (expire cart)', '✅ Native, built-in', '❌ Cần cron job DELETE'],
      ['Access pattern', '✅ Key-value, predictable', 'Overkill — flexible queries không cần'],
      ['Latency', '✅ Single-digit ms P99', '10-50ms'],
      ['Scale khi flash sale', '✅ Seamless auto-scale', '❌ Connection pool exhaustion'],
      ['Chi phí (dev)', '✅ Free tier 25GB mãi mãi', '❌ Phải trả instance cost'],
      ['Schema flexible', '✅ Không cần migration', '❌ Cần ALTER TABLE'],
    ],
    [28, 36, 36]
  ),
]

// ─── Section 7: ECS ───────────────────────────────────────────────────────────

const section7 = [
  h1('7. ECS Fargate'),
  h2('Cluster & Service Configuration'),
  ...code([
    'Cluster:          cloudmart-cluster',
    'Service:          cloudmart-backend-service',
    'Launch Type:      FARGATE',
    'Desired Count:    2          # 1 task mỗi AZ — HA',
    'Min Healthy %:    100        # zero-downtime deploy',
    'Max %:            200        # cho phép double khi rolling update',
    'Subnets:          private-app-1a, private-app-1b',
    'Assign Public IP: DISABLED',
  ]),
  h2('Task Definition'),
  ...code([
    'CPU:    512  (0.5 vCPU)',
    'Memory: 1024 MB',
    'Image:  ACCOUNT_ID.dkr.ecr.ap-southeast-1.amazonaws.com/cloudmart-backend:latest',
    '',
    'Secrets (injected từ Secrets Manager):',
    '  DATABASE_URL     ← cloudmart/db-credentials:connection_string',
    '  JWT_ACCESS_SECRET ← cloudmart/jwt-secret:access',
    '  JWT_REFRESH_SECRET ← cloudmart/jwt-secret:refresh',
    '',
    'Health Check:',
    '  Command:   curl -f http://localhost:8080/health',
    '  Interval:  30s | Timeout: 5s | Retries: 3 | StartPeriod: 60s',
  ]),
  h2('Auto Scaling'),
  mkTable(
    ['Parameter', 'Value'],
    [
      ['Min Tasks', '1 (tiết kiệm ngoài giờ)'],
      ['Max Tasks', '4'],
      ['Scale Out', 'ECS CPU > 70% sustained 5 phút → +1 task'],
      ['Scale In', 'ECS CPU < 30% sustained 15 phút → -1 task'],
      ['Scale In Cooldown', '300s (tránh flapping)'],
    ],
    [35, 65]
  ),
  h2('Tại sao Fargate thay EC2 Launch Type?'),
  mkTable(
    ['Tiêu chí', 'Fargate', 'EC2 Launch Type'],
    [
      ['Quản lý OS', '✅ AWS lo hoàn toàn', '❌ Tự patch, update'],
      ['Security isolation', '✅ Mỗi task = 1 microVM', '❌ Shared EC2 instance'],
      ['Capacity planning', '✅ Không cần', '❌ Phải chọn instance type'],
      ['Chi phí model', 'Per-task (vCPU + RAM giờ)', 'Per-instance (trả kể cả idle)'],
    ],
    [30, 35, 35]
  ),
]

// ─── Section 8: ALB ───────────────────────────────────────────────────────────

const section8 = [
  h1('8. Application Load Balancer'),
  ...code([
    'Name:           cloudmart-alb',
    'Scheme:         internet-facing',
    'Subnets:        public-1a, public-1b',
    '',
    'Listeners:',
    '  HTTP  :80  → Redirect to HTTPS (301)',
    '  HTTPS :443 → Forward to cloudmart-backend-tg',
    '',
    'SSL Policy: ELBSecurityPolicy-TLS13-1-2-2021-06  (TLS 1.2+)',
    '',
    'Target Group: cloudmart-backend-tg',
    '  Target Type: ip   (bắt buộc cho Fargate — awsvpc mode)',
    '  Protocol:    HTTP, Port: 8080',
    '  Health Check: GET /health → 200, Interval: 30s',
  ]),
  h2('Tại sao ALB thay API Gateway?'),
  mkTable(
    ['Tiêu chí', 'ALB', 'API Gateway'],
    [
      ['Chi phí', '~$0.008/LCU', '$3.50/million requests'],
      ['Latency overhead', '< 1ms', '10-50ms'],
      ['Container integration', '✅ Native', 'Cần thêm config'],
      ['Request body limit', 'Không giới hạn', '10 MB'],
      ['Built-in Auth', 'Không (dùng custom JWT)', 'Có (Cognito — không dùng)'],
    ],
    [28, 36, 36]
  ),
]

// ─── Section 9: S3 ────────────────────────────────────────────────────────────

const section9 = [
  h1('9. S3 Bucket Design'),
  h2('Tại sao tách 3 buckets?'),
  mkTable(
    ['Bucket', 'Mục đích', 'Lifecycle'],
    [
      ['cloudmart-media-{account}', 'Ảnh sản phẩm, uploads', 'Move sang IA sau 30 ngày'],
      ['cloudmart-frontend-{account}', 'Next.js static build', 'Không cần'],
      ['cloudmart-pipeline-artifacts-{account}', 'CodePipeline artifacts', 'Delete sau 30 ngày'],
    ],
    [38, 32, 30]
  ),
  p('Mỗi bucket có policy, lifecycle, và cache strategy khác nhau → tách biệt là best practice.'),
  h2('Upload ảnh — Presigned URL Pattern'),
  ...code([
    '1. Admin → POST /api/media/presign → ECS',
    '2. ECS   → S3 GeneratePresignedUrl (PUT, TTL 10 phút)',
    '3. ECS   → trả presigned URL về client',
    '4. Client browser → PUT trực tiếp lên S3 (không qua ECS)',
    '5. S3 lưu file → CloudFront serve khi cần',
    '',
    'Lợi ích: File đi thẳng browser → S3,',
    '         không tốn bandwidth và CPU của ECS.',
  ]),
  note('Tất cả buckets đều Block Public Access — CloudFront dùng OAC (Origin Access Control) để đọc, không phải public URL.'),
]

// ─── Section 10: CloudFront ───────────────────────────────────────────────────

const section10 = [
  h1('10. CloudFront'),
  h2('Distribution 1: Frontend (cloudmart.example.com)'),
  ...code([
    'Origin:       S3 cloudmart-frontend (via OAC)',
    'Cache Policy: CachingOptimized',
    'Compress:     true',
    'Price Class:  PriceClass_200  (US, EU, Asia — không dùng All)',
    '',
    'Custom Error Pages:',
    '  404 → /index.html (return 200)   # Next.js SPA routing',
    '  403 → /index.html (return 200)',
    '',
    'SSL Cert: ACM us-east-1  (CloudFront bắt buộc cert ở us-east-1)',
  ]),
  h2('Distribution 2: API (api.cloudmart.example.com)'),
  ...code([
    'Origin:               ALB cloudmart-alb (HTTPS)',
    'Cache Policy:         CachingDisabled   (API không cache)',
    'Origin Request Policy: AllViewer         (forward tất cả headers, cookies)',
    'Allowed Methods:      GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE',
  ]),
  h2('Tại sao đặt CloudFront trước ALB?'),
  mkTable(
    ['Benefit', 'Mô tả'],
    [
      ['DDoS protection', 'AWS Shield Standard miễn phí, tích hợp sẵn'],
      ['Edge SSL termination', 'SSL handshake tại edge gần user, giảm latency'],
      ['AWS backbone', 'CloudFront → ALB qua mạng nội bộ AWS, không qua public internet'],
      ['WAF ready', 'Dễ dàng thêm WAF rules sau này nếu cần'],
      ['Cost', 'CloudFront data transfer rẻ hơn trực tiếp từ ALB'],
    ],
    [30, 70]
  ),
]

// ─── Section 11: SQS + Lambda ─────────────────────────────────────────────────

const section11 = [
  h1('11. SQS + Lambda Order Processor'),
  h2('SQS Queue Configuration'),
  mkTable(
    ['Parameter', 'Value', 'Lý do'],
    [
      ['Type', 'Standard', 'Không cần FIFO vì processing idempotent'],
      ['Visibility Timeout', '300s', 'Phải ≥ Lambda timeout, tránh double-processing'],
      ['Receive Wait Time', '20s', 'Long Polling — giảm ~90% API calls'],
      ['DLQ Max Receive Count', '3', 'Thử 3 lần rồi mới vào DLQ'],
      ['DLQ Retention', '14 ngày', 'Đủ thời gian investigate + replay'],
    ],
    [28, 22, 50]
  ),
  h2('Lambda Configuration'),
  mkTable(
    ['Parameter', 'Value', 'Lý do'],
    [
      ['Memory', '256 MB', 'Đủ cho order processing logic'],
      ['Timeout', '180s', '3 phút, < Visibility Timeout'],
      ['Reserved Concurrency', '10', 'Tránh overwhelm RDS connections'],
      ['VPC', 'private-app-1a/1b', 'Cần reach RDS trong private subnet'],
      ['Batch Size', '10', 'Xử lý 10 messages/invocation'],
      ['Bisect On Error', 'true', 'Tìm message xấu, không retry cả batch'],
    ],
    [30, 22, 48]
  ),
  h2('Order Processing Flow'),
  ...code([
    '1. ECS Backend  →  SQS SendMessage (order JSON)',
    '2. SQS          →  Lambda trigger (batch 10)',
    '3. Lambda:',
    '   a. Secrets Manager → get DB connection string',
    '   b. RDS → UPDATE order SET status = PROCESSING',
    '   c. Business logic (inventory check, payment)',
    '   d. RDS → UPDATE order SET status = CONFIRMED',
    '   e. SNS Publish → cloudmart-order-notifications',
    '   f. Return success → SQS delete message',
    '',
    '4. Nếu Lambda throw exception:',
    '   - Message invisible trong Visibility Timeout',
    '   - Retry tối đa 3 lần',
    '   - Sau 3 lần → DLQ',
    '',
    '5. CloudWatch Alarm khi DLQ > 0 → SNS → Email admin',
  ]),
]

// ─── Section 12: SNS ──────────────────────────────────────────────────────────

const section12 = [
  h1('12. SNS Topic Design'),
  h2('Topics'),
  mkTable(
    ['Topic', 'Subscribers', 'Filter'],
    [
      ['cloudmart-order-notifications', 'SQS email-queue, SQS analytics-queue', 'Theo event_type'],
      ['cloudmart-system-alerts', 'Email admin', 'Không filter'],
    ],
    [38, 35, 27]
  ),
  h2('Tại sao SNS → SQS thay vì Lambda trực tiếp?'),
  mkTable(
    ['Pattern', 'Vấn đề'],
    [
      ['SNS → Lambda (trực tiếp)', 'Nếu Lambda throttle → SNS retry 3 lần → DROP message. Không có buffer.'],
      ['SNS → SQS → Lambda ✅', 'SQS là buffer. Messages giữ lại, Lambda retry tự động, có DLQ. Không bao giờ mất message.'],
    ],
    [35, 65]
  ),
]

// ─── Section 13: Secrets ──────────────────────────────────────────────────────

const section13 = [
  h1('13. Secrets Manager vs SSM Parameter Store'),
  mkTable(
    ['Secret', 'Nơi lưu', 'Lý do'],
    [
      ['DB password / connection string', 'Secrets Manager', 'Sensitive, hỗ trợ auto-rotation với RDS'],
      ['JWT secret keys', 'Secrets Manager', 'Cryptographic secret'],
      ['SES credentials', 'Secrets Manager', '3rd party credentials'],
      ['NODE_ENV, PORT', 'SSM Parameter Store', 'Không sensitive, free'],
      ['S3 bucket names', 'SSM Parameter Store', 'Không sensitive, free'],
      ['SQS URL, SNS ARN', 'SSM Parameter Store', 'Không sensitive, free'],
      ['Feature flags', 'SSM Parameter Store', 'Không sensitive, free'],
    ],
    [40, 30, 30]
  ),
  mkTable(
    ['Tiêu chí', 'Secrets Manager', 'SSM Parameter Store'],
    [
      ['Chi phí', '$0.40/secret/tháng', '✅ Free (Standard tier)'],
      ['Auto rotation', '✅ Tích hợp với RDS', '❌ Không có'],
      ['Encryption', 'KMS bắt buộc', 'Optional (SecureString)'],
      ['Use case', 'Credentials, API keys', 'Config values, feature flags'],
    ],
    [25, 37, 38]
  ),
]

// ─── Section 14: Naming ───────────────────────────────────────────────────────

const section14 = [
  h1('14. Naming Convention'),
  p('Format: cloudmart-{resource-type}-{qualifier}'),
  ...code([
    'VPC & Network:',
    '  cloudmart-vpc',
    '  cloudmart-subnet-public-1a/1b',
    '  cloudmart-subnet-app-1a/1b',
    '  cloudmart-subnet-data-1a/1b',
    '  cloudmart-igw | cloudmart-nat-gw',
    '  cloudmart-rt-public | cloudmart-rt-app | cloudmart-rt-data',
    '',
    'Security Groups:',
    '  cloudmart-sg-alb | cloudmart-sg-ecs',
    '  cloudmart-sg-rds | cloudmart-sg-lambda',
    '',
    'Compute:',
    '  cloudmart-cluster          (ECS Cluster)',
    '  cloudmart-backend-service  (ECS Service)',
    '  cloudmart-backend          (ECR Repository)',
    '  cloudmart-order-processor  (Lambda)',
    '  cloudmart-email-sender     (Lambda)',
    '',
    'Database:',
    '  cloudmart-postgres         (RDS Instance)',
    '  cloudmart-cart             (DynamoDB Table)',
    '',
    'Messaging:',
    '  cloudmart-order-queue      (SQS)',
    '  cloudmart-order-queue-dlq  (SQS DLQ)',
    '  cloudmart-email-queue      (SQS)',
    '  cloudmart-order-notifications (SNS)',
    '  cloudmart-system-alerts    (SNS)',
    '  cloudmart-user-events      (Kinesis)',
    '',
    'CI/CD:',
    '  cloudmart-backend-pipeline (CodePipeline)',
    '  cloudmart-backend-build    (CodeBuild)',
    '',
    'CloudWatch Log Groups:',
    '  /ecs/cloudmart-backend',
    '  /aws/lambda/cloudmart-order-processor',
    '  /aws/lambda/cloudmart-email-sender',
  ]),
]

// ─── Section 15: Network Flows ────────────────────────────────────────────────

const section15 = [
  h1('15. Network Flow'),
  h2('Flow 1: User xem trang (Frontend)'),
  ...code([
    'Browser → Route 53 → CloudFront edge (Singapore)',
    'CloudFront check cache:',
    '  HIT  → trả từ edge cache',
    '  MISS → CloudFront → S3 cloudmart-frontend (OAC) → cache → trả user',
  ]),
  h2('Flow 2: API Call (Thêm vào giỏ hàng)'),
  ...code([
    'Next.js client → CloudFront API (edge SSL termination)',
    '→ ALB (qua AWS backbone) → ECS Task (private-app subnet, :8080)',
    '',
    'ECS:',
    '  a. Validate JWT',
    '  b. DynamoDB PutItem (cart) via VPC Endpoint',
    '',
    'Response: ECS → ALB → CloudFront → User',
  ]),
  h2('Flow 3: Đặt hàng (Order Flow)'),
  ...code([
    'User → CloudFront → ALB → ECS',
    '',
    'ECS (sync):',
    '  a. Write order → RDS PostgreSQL (private-data subnet)',
    '  b. SQS SendMessage → cloudmart-order-queue',
    '  c. Kinesis PutRecord (user event)',
    '  d. Response 202 Accepted → User',
    '',
    'Lambda (async):',
    '  a. Secrets Manager → DB connection string',
    '  b. RDS → UPDATE order = PROCESSING',
    '  c. Process order logic',
    '  d. RDS → UPDATE order = CONFIRMED',
    '  e. SNS Publish → cloudmart-order-notifications',
    '',
    'SNS fan-out:',
    '  → SQS email-queue → Lambda → SES → Email user',
    '  → SQS analytics-queue → Lambda → analytics update',
  ]),
  h2('Flow 4: CI/CD Deploy'),
  ...code([
    'Developer push → GitHub → CodePipeline trigger',
    '',
    'Stage Build (CodeBuild):',
    '  npm install && npm run build',
    '  docker build -t cloudmart-backend .',
    '  docker push → ECR (:latest + :git-sha)',
    '',
    'Stage Deploy:',
    '  Register new ECS Task Definition revision',
    '  ECS rolling update (Min 100%, Max 200%)',
    '  ALB health check mới tasks trước khi terminate cũ',
    '  → Zero-downtime deployment',
  ]),
]

// ─── Section 16: Cost ─────────────────────────────────────────────────────────

const section16 = [
  h1('16. Cost Optimization'),
  h2('Ước tính chi phí tháng'),
  mkTable(
    ['Service', 'Config', '$/tháng'],
    [
      ['ECS Fargate', '2 tasks × 0.5vCPU × 1GB', '~$14'],
      ['RDS PostgreSQL', 'db.t3.micro, 20GB gp3', '~$15'],
      ['NAT Gateway', '1 NAT + ~10GB transfer', '~$35'],
      ['ALB', 'Base + LCUs', '~$18'],
      ['CloudFront', '100GB transfer', '~$9'],
      ['Kinesis', '1 shard', '~$15'],
      ['S3', '10GB storage', '~$2'],
      ['Secrets Manager', '3 secrets', '~$1.2'],
      ['CloudWatch', 'Logs + metrics', '~$5'],
      ['SQS + SNS + Lambda', 'Free tier', '~$0'],
      ['Route 53', 'Hosted zone', '~$1'],
      ['**Tổng**', '', '**~$116/tháng**'],
    ],
    [35, 40, 25]
  ),
  h2('Start/Stop Scripts — tiết kiệm khi học'),
  ...code([
    '# cloudmart-stop.ps1',
    'aws ecs update-service `',
    '  --cluster cloudmart-cluster `',
    '  --service cloudmart-backend-service `',
    '  --desired-count 0',
    '',
    'aws rds stop-db-instance `',
    '  --db-instance-identifier cloudmart-postgres',
    '',
    '# Tiết kiệm ~$1.50/ngày',
  ]),
  ...code([
    '# cloudmart-start.ps1',
    'aws rds start-db-instance `',
    '  --db-instance-identifier cloudmart-postgres',
    '',
    'aws rds wait db-instance-available `',
    '  --db-instance-identifier cloudmart-postgres',
    '',
    'aws ecs update-service `',
    '  --cluster cloudmart-cluster `',
    '  --service cloudmart-backend-service `',
    '  --desired-count 2',
  ]),
  h2('Cost Saving Summary'),
  mkTable(
    ['Action', 'Tiết kiệm/tháng'],
    [
      ['Stop RDS 16h/ngày', '~$10'],
      ['Scale ECS về 0 ngoài giờ', '~$9'],
      ['VPC Endpoints thay NAT cho AWS APIs', '~$14'],
      ['Bỏ Kinesis, dùng SQS thay thế', '~$15'],
      ['**Tổng nếu áp dụng tất cả**', '**~$48/tháng**'],
    ],
    [70, 30]
  ),
]

// ─── Section 17: ADR ──────────────────────────────────────────────────────────

const section17 = [
  h1('17. Architecture Decision Records'),
  mkTable(
    ['#', 'Quyết định', 'Lựa chọn', 'Lý do chính'],
    [
      ['ADR-01', 'Container orchestration', 'ECS Fargate', 'Không quản lý OS, mỗi task = 1 microVM'],
      ['ADR-02', 'Database chính', 'RDS PostgreSQL', 'Managed backup, Multi-AZ, monitoring'],
      ['ADR-03', 'Cart storage', 'DynamoDB', 'TTL native, schema flexible, free tier'],
      ['ADR-04', 'API endpoint', 'ALB', 'Rẻ hơn, latency thấp hơn, không cần Cognito'],
      ['ADR-05', 'Frontend hosting', 'S3 + CloudFront', 'Control hoàn toàn, rẻ hơn Amplify'],
      ['ADR-06', 'Auth', 'Custom JWT', 'Đơn giản, đủ cho project'],
      ['ADR-07', 'Secret management', 'Secrets Mgr + SSM', 'Cost-efficient theo độ nhạy cảm'],
      ['ADR-08', 'Order processing', 'SQS + Lambda', 'Decoupled, auto-retry, serverless'],
      ['ADR-09', 'Notification', 'SNS → SQS → Lambda', 'Buffer, DLQ, không drop message'],
      ['ADR-10', 'ALB exposure', 'CloudFront trước ALB', 'Shield Standard miễn phí, edge SSL'],
      ['ADR-11', 'Network', '3-tier VPC', 'Defense in depth, blast radius containment'],
      ['ADR-12', 'S3 access', 'OAC (không OAI)', 'OAI là legacy, OAC là official replacement'],
      ['ADR-13', 'Cache', 'Bỏ ElastiCache', 'Tiết kiệm $15/tháng, dùng in-process cache'],
      ['ADR-14', 'Search', 'Bỏ OpenSearch', 'Dùng PostgreSQL ILIKE, đủ cho project'],
    ],
    [8, 24, 24, 44]
  ),
]

// ─── Build Document ───────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Calibri', size: 22, color: DARK },
        paragraph: { spacing: { line: 276 } },
      },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1',
        run: { bold: true, size: 32, color: BLUE, font: 'Calibri' },
        paragraph: { spacing: { before: 400, after: 160 } },
      },
      {
        id: 'Heading2', name: 'Heading 2',
        run: { bold: true, size: 26, color: DARK, font: 'Calibri' },
        paragraph: { spacing: { before: 280, after: 100 } },
      },
      {
        id: 'Heading3', name: 'Heading 3',
        run: { bold: true, size: 23, color: GRAY, font: 'Calibri' },
        paragraph: { spacing: { before: 200, after: 80 } },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.1),
          right: convertInchesToTwip(1.1),
        },
      },
    },
    children: [
      ...coverPage,
      ...section1,
      ...section2,
      ...section3,
      ...section4,
      ...section5,
      ...section6,
      ...section7,
      ...section8,
      ...section9,
      ...section10,
      ...section11,
      ...section12,
      ...section13,
      ...section14,
      ...section15,
      ...section16,
      ...section17,
    ],
  }],
})

const buffer = await Packer.toBuffer(doc)
fs.writeFileSync('infra/AWS-ARCHITECTURE.docx', buffer)
console.log('✅ Generated: infra/AWS-ARCHITECTURE.docx')
