import { Router } from 'express'
import { authenticate } from '../middlewares/auth'
import * as cart from '../controllers/cart.controller'

const router = Router()

router.use(authenticate)
router.get('/', cart.getCart)
router.post('/items', cart.addItem)
router.put('/items/:productId', cart.updateItem)
router.delete('/items/:productId', cart.removeItem)

export default router
