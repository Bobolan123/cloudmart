import { Request, Response, NextFunction } from 'express'
import * as cartService from '../services/cart.service'

export async function getCart(req: Request, res: Response, next: NextFunction) {
  try {
    const cart = await cartService.getCart(req.user!.userId)
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
    res.json({ items: cart, total })
  } catch (err) { next(err) }
}

export async function addItem(req: Request, res: Response, next: NextFunction) {
  try {
    const { productId, quantity = 1 } = req.body
    if (!productId) return res.status(400).json({ error: 'productId required' })
    const cart = await cartService.addItem(req.user!.userId, productId, Number(quantity))
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
    res.json({ items: cart, total })
  } catch (err) { next(err) }
}

export async function updateItem(req: Request<{ productId: string }>, res: Response, next: NextFunction) {
  try {
    const { quantity } = req.body
    if (quantity === undefined) return res.status(400).json({ error: 'quantity required' })
    const cart = await cartService.updateItem(req.user!.userId, req.params.productId, Number(quantity))
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
    res.json({ items: cart, total })
  } catch (err) { next(err) }
}

export async function removeItem(req: Request<{ productId: string }>, res: Response, next: NextFunction) {
  try {
    const cart = await cartService.removeItem(req.user!.userId, req.params.productId)
    const total = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)
    res.json({ items: cart, total })
  } catch (err) { next(err) }
}
