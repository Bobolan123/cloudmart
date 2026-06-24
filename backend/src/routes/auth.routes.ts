import { Router } from 'express'
import * as auth from '../controllers/auth.controller'

const router = Router()

router.post('/register', auth.register)
router.post('/login', auth.login)
router.post('/refresh', auth.refreshToken)
router.post('/logout', auth.logout)

export default router
