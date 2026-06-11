import { Request, Response, NextFunction } from 'express'
import { OrderStatus } from '@prisma/client'
import * as orderService from '../services/order.service'

export async function checkout(req: Request, res: Response, next: NextFunction) {
  try {
    const { addressId, note } = req.body
    const order = await orderService.createOrder(req.user!.userId, addressId, note)
    res.status(201).json(order)
  } catch (err) { next(err) }
}

export async function listMyOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Number(req.query.limit) || 10)
    const result = await orderService.getUserOrders(req.user!.userId, page, limit)
    res.json(result)
  } catch (err) { next(err) }
}

export async function getOne(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const order = await orderService.getOrder(req.params.id, req.user!.userId, req.user!.role)
    res.json(order)
  } catch (err) { next(err) }
}

export async function updateStatus(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const { status } = req.body
    if (!Object.values(OrderStatus).includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    const order = await orderService.updateOrderStatus(req.params.id, status)
    res.json(order)
  } catch (err) { next(err) }
}
