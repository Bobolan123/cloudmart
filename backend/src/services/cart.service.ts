import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'

export interface CartItem {
  productId: string
  name: string
  price: number
  imageUrl: string | null
  quantity: number
}

function formatCart(items: Awaited<ReturnType<typeof fetchRaw>>): CartItem[] {
  return items.map((i) => ({
    productId: i.productId,
    name: i.product.name,
    price: Number(i.price),
    imageUrl: i.product.imageUrl,
    quantity: i.quantity,
  }))
}

function fetchRaw(userId: string) {
  return prisma.cartItem.findMany({
    where: { userId },
    include: { product: { select: { name: true, imageUrl: true } } },
    orderBy: { id: 'asc' },
  })
}

export async function getCart(userId: string): Promise<CartItem[]> {
  return formatCart(await fetchRaw(userId))
}

export async function addItem(userId: string, productId: string, quantity: number): Promise<CartItem[]> {
  const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } })
  if (!product) throw new AppError(404, 'Product not found')
  if (product.stock < quantity) throw new AppError(400, 'Not enough stock')

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId, quantity, price: product.price },
    update: { quantity: { increment: quantity } },
  })

  return formatCart(await fetchRaw(userId))
}

export async function updateItem(userId: string, productId: string, quantity: number): Promise<CartItem[]> {
  if (quantity <= 0) return removeItem(userId, productId)

  const item = await prisma.cartItem.findUnique({ where: { userId_productId: { userId, productId } } })
  if (!item) throw new AppError(404, 'Item not in cart')

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (product && product.stock < quantity) throw new AppError(400, 'Not enough stock')

  await prisma.cartItem.update({
    where: { userId_productId: { userId, productId } },
    data: { quantity },
  })

  return formatCart(await fetchRaw(userId))
}

export async function removeItem(userId: string, productId: string): Promise<CartItem[]> {
  await prisma.cartItem.deleteMany({ where: { userId, productId } })
  return formatCart(await fetchRaw(userId))
}

export async function clearCart(userId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { userId } })
}
