import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'

interface ListProductsOptions {
  page: number
  limit: number
  category?: string
  search?: string
}

export async function listProducts({ page, limit, category, search }: ListProductsOptions) {
  const where = {
    isActive: true,
    ...(category && { category: { slug: category } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, isActive: true },
    include: { category: true },
  })
  if (!product) throw new AppError(404, 'Product not found')
  return product
}

export async function createProduct(data: {
  name: string
  description: string
  price: number
  stock: number
  categoryId: string
  imageUrl?: string
}) {
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
  if (!category) throw new AppError(400, 'Category not found')

  return prisma.product.create({
    data,
    include: { category: true },
  })
}

export async function updateProduct(id: string, data: Partial<{
  name: string
  description: string
  price: number
  stock: number
  categoryId: string
  imageUrl: string
  isActive: boolean
}>) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw new AppError(404, 'Product not found')

  return prisma.product.update({ where: { id }, data, include: { category: true } })
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw new AppError(404, 'Product not found')

  await prisma.product.update({ where: { id }, data: { isActive: false } })
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: 'asc' } })
}
