import { Router, Request, Response, NextFunction } from 'express'
import * as product from '../controllers/product.controller'
import { authenticate, requireAdmin } from '../middlewares/auth'
import { upload, uploadFile } from '../lib/upload'
import { AppError } from '../middlewares/errorHandler'

const router = Router()

router.get('/', product.list)
router.get('/categories', product.categories)
router.get('/:id', product.getOne)
router.post('/', authenticate, requireAdmin, product.create)
router.put('/:id', authenticate, requireAdmin, product.update)
router.delete('/:id', authenticate, requireAdmin, product.remove)

router.post(
  '/upload-image',
  authenticate,
  requireAdmin,
  upload.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw new AppError(400, 'No image file provided')
      const url = await uploadFile(req.file)
      res.json({ url })
    } catch (err) { next(err) }
  }
)

export default router
