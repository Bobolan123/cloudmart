import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'

import authRoutes from './routes/auth.routes'
import productRoutes from './routes/product.routes'
import cartRoutes from './routes/cart.routes'
import orderRoutes from './routes/order.routes'
import userRoutes from './routes/user.routes'
import { errorHandler } from './middlewares/errorHandler'
import { registerEventListeners } from './lib/eventListeners'

const app = express()
const PORT = process.env.PORT ?? 4000

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(morgan('dev'))
app.use(express.json())

const uploadDir = process.env.UPLOAD_DIR ?? 'uploads'
app.use('/uploads', express.static(path.resolve(uploadDir)))

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }))

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/users', userRoutes)

app.use(errorHandler)

registerEventListeners()

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
