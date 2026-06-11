import { Router } from 'express'
import { authenticate, requireAdmin } from '../middlewares/auth'
import * as order from '../controllers/order.controller'

const router = Router()

router.use(authenticate)
router.post('/', order.checkout)
router.get('/', order.listMyOrders)
router.get('/:id', order.getOne)
router.patch('/:id/status', requireAdmin, order.updateStatus)

export default router
