import { Router } from 'express'
import { Request, Response, NextFunction } from 'express'
import { authenticate } from '../middlewares/auth'
import { prisma } from '../lib/prisma'
import { AppError } from '../middlewares/errorHandler'

const router = Router()

router.use(authenticate)

router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })
    if (!user) throw new AppError(404, 'User not found')
    res.json(user)
  } catch (err) { next(err) }
})

router.put('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { ...(name && { name }) },
      select: { id: true, email: true, name: true, role: true },
    })
    res.json(user)
  } catch (err) { next(err) }
})

router.get('/me/addresses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const addresses = await prisma.address.findMany({ where: { userId: req.user!.userId } })
    res.json(addresses)
  } catch (err) { next(err) }
})

router.post('/me/addresses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fullName, phone, street, city, province, country, isDefault } = req.body
    const address = await prisma.address.create({
      data: { userId: req.user!.userId, fullName, phone, street, city, province, country: country ?? 'Vietnam', isDefault: isDefault ?? false },
    })
    res.status(201).json(address)
  } catch (err) { next(err) }
})

export default router
