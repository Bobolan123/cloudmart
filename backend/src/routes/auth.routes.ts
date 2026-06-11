import { Router } from 'express'
import * as auth from '../controllers/auth.controller'

const router = Router()

router.post('/register', auth.register)
router.get('/verify-email', auth.verifyEmail)
router.post('/login', auth.login)
router.post('/refresh', auth.refreshToken)
router.post('/logout', auth.logout)
router.post('/forgot-password', auth.forgotPassword)
router.post('/reset-password', auth.resetPassword)

export default router
