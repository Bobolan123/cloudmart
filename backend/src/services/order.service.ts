import { prisma } from '../lib/prisma'
import { getCart, clearCart } from './cart.service'
import { AppError } from '../middlewares/errorHandler'
import { OrderStatus } from '@prisma/client'

export async function createOrder(userId: string, addressId?: string, note?: string) {
  const cartItems = await getCart(userId)
  if (cartItems.length === 0) throw new AppError(400, 'Cart is empty')

  // Verify stock and lock prices from DB
  const productIds = cartItems.map((i) => i.productId)
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } })

  for (const item of cartItems) {
    const product = products.find((p) => p.id === item.productId)
    if (!product || !product.isActive) throw new AppError(400, `Product ${item.name} is no longer available`)
    if (product.stock < item.quantity) throw new AppError(400, `Not enough stock for ${item.name}`)
  }

  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId,
        total,
        addressId,
        note,
        items: {
          create: cartItems.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.price,
          })),
        },
      },
      include: { items: { include: { product: true } }, address: true },
    })

    // Decrement stock
    await Promise.all(
      cartItems.map((i) =>
        tx.product.update({
          where: { id: i.productId },
          data: { stock: { decrement: i.quantity } },
        })
      )
    )

    return created
  })

  await clearCart(userId)

  return order
}

export async function getUserOrders(userId: string, page = 1, limit = 10) {
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: { userId },
      include: { items: { include: { product: { select: { name: true, imageUrl: true } } } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where: { userId } }),
  ])

  return { orders, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getOrder(id: string, userId: string, role: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      address: true,
      user: { select: { email: true, name: true } },
    },
  })

  if (!order) throw new AppError(404, 'Order not found')
  if (role !== 'ADMIN' && order.userId !== userId) throw new AppError(403, 'Forbidden')

  return order
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) throw new AppError(404, 'Order not found')

  const updated = await prisma.order.update({ where: { id }, data: { status } })

  return updated
}
