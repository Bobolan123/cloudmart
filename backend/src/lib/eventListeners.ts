import { eventBus, Events } from './events'
import { sendEmail } from './email'
import { prisma } from './prisma'

export function registerEventListeners() {
  eventBus.on(Events.ORDER_CREATED, async (order: { id: string; userId: string; total: number }) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: order.userId } })
      if (!user) return

      await sendEmail({
        to: user.email,
        subject: `Order Confirmed — #${order.id.slice(-8).toUpperCase()}`,
        html: `
          <h2>Thank you for your order!</h2>
          <p>Order ID: <strong>${order.id}</strong></p>
          <p>Total: <strong>${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}</strong></p>
          <p>We will notify you when your order ships.</p>
        `,
      })
    } catch (err) {
      console.error('[EVENT] ORDER_CREATED handler failed:', err)
    }
  })

  eventBus.on(Events.ORDER_STATUS_CHANGED, async (order: { id: string; userId: string; status: string }) => {
    try {
      const user = await prisma.user.findUnique({ where: { id: order.userId } })
      if (!user) return

      await sendEmail({
        to: user.email,
        subject: `Order Update — #${order.id.slice(-8).toUpperCase()}`,
        html: `<p>Your order status has been updated to: <strong>${order.status}</strong></p>`,
      })
    } catch (err) {
      console.error('[EVENT] ORDER_STATUS_CHANGED handler failed:', err)
    }
  })
}
