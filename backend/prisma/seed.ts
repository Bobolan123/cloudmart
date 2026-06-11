import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'electronics' }, update: {}, create: { name: 'Electronics', slug: 'electronics' } }),
    prisma.category.upsert({ where: { slug: 'clothing' }, update: {}, create: { name: 'Clothing', slug: 'clothing' } }),
    prisma.category.upsert({ where: { slug: 'books' }, update: {}, create: { name: 'Books', slug: 'books' } }),
  ])

  const [admin, adminGmail, userGmail] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@cloudmart.dev' },
      update: {},
      create: { email: 'admin@cloudmart.dev', passwordHash: await bcrypt.hash('Admin@123', 10), name: 'CloudMart Admin', role: 'ADMIN', isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'admin@gmail.com' },
      update: {},
      create: { email: 'admin@gmail.com', passwordHash: await bcrypt.hash('admin', 10), name: 'Admin Gmail', role: 'ADMIN', isVerified: true },
    }),
    prisma.user.upsert({
      where: { email: 'user@gmail.com' },
      update: {},
      create: { email: 'user@gmail.com', passwordHash: await bcrypt.hash('user', 10), name: 'Test User', role: 'CUSTOMER', isVerified: true },
    }),
  ])

  const products = await Promise.all([
    prisma.product.upsert({
      where: { id: 'seed-iphone-15-pro' },
      update: {},
      create: { id: 'seed-iphone-15-pro', name: 'iPhone 15 Pro', description: 'Apple iPhone 15 Pro 256GB, chip A17 Pro, camera 48MP', price: 25000000, stock: 50, categoryId: categories[0].id },
    }),
    prisma.product.upsert({
      where: { id: 'seed-macbook-air-m2' },
      update: {},
      create: { id: 'seed-macbook-air-m2', name: 'MacBook Air M2', description: 'Apple MacBook Air M2 8GB/256GB, màn hình Liquid Retina 13.6 inch', price: 32000000, stock: 30, categoryId: categories[0].id },
    }),
    prisma.product.upsert({
      where: { id: 'seed-samsung-s24' },
      update: {},
      create: { id: 'seed-samsung-s24', name: 'Samsung Galaxy S24', description: 'Samsung Galaxy S24 256GB, chip Snapdragon 8 Gen 3', price: 22000000, stock: 40, categoryId: categories[0].id },
    }),
    prisma.product.upsert({
      where: { id: 'seed-airpods-pro' },
      update: {},
      create: { id: 'seed-airpods-pro', name: 'AirPods Pro 2', description: 'Tai nghe Apple AirPods Pro thế hệ 2, chống ồn chủ động', price: 6500000, stock: 80, categoryId: categories[0].id },
    }),
    prisma.product.upsert({
      where: { id: 'seed-tshirt-basic' },
      update: {},
      create: { id: 'seed-tshirt-basic', name: 'T-Shirt Basic', description: 'Áo thun cotton unisex, form regular, nhiều màu', price: 150000, stock: 200, categoryId: categories[1].id },
    }),
    prisma.product.upsert({
      where: { id: 'seed-hoodie' },
      update: {},
      create: { id: 'seed-hoodie', name: 'Hoodie Oversize', description: 'Áo hoodie form oversize, chất liệu nỉ bông dày dặn', price: 450000, stock: 120, categoryId: categories[1].id },
    }),
    prisma.product.upsert({
      where: { id: 'seed-clean-code' },
      update: {},
      create: { id: 'seed-clean-code', name: 'Clean Code', description: 'A Handbook of Agile Software Craftsmanship - Robert C. Martin', price: 350000, stock: 100, categoryId: categories[2].id },
    }),
    prisma.product.upsert({
      where: { id: 'seed-system-design' },
      update: {},
      create: { id: 'seed-system-design', name: 'Designing Data-Intensive Applications', description: 'The big ideas behind reliable, scalable, and maintainable systems', price: 420000, stock: 60, categoryId: categories[2].id },
    }),
  ])

  console.log('✅ Seed complete:')
  console.log(`   Users: ${[admin, adminGmail, userGmail].map(u => u.email).join(', ')}`)
  console.log(`   Categories: ${categories.map(c => c.name).join(', ')}`)
  console.log(`   Products: ${products.length} items`)
  console.log('\n📋 Test accounts:')
  console.log('   admin@cloudmart.dev / Admin@123  [ADMIN]')
  console.log('   admin@gmail.com     / admin      [ADMIN]')
  console.log('   user@gmail.com      / user       [CUSTOMER]')
}

main().catch(console.error).finally(() => prisma.$disconnect())
