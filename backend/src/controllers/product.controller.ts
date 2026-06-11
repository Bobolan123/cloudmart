import { Request, Response, NextFunction } from 'express'
import * as productService from '../services/product.service'

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12))
    const category = req.query.category as string | undefined
    const search = req.query.search as string | undefined

    const result = await productService.listProducts({ page, limit, category, search })
    res.json(result)
  } catch (err) { next(err) }
}

export async function getOne(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProduct(req.params.id)
    res.json(product)
  } catch (err) { next(err) }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.createProduct(req.body)
    res.status(201).json(product)
  } catch (err) { next(err) }
}

export async function update(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    const product = await productService.updateProduct(req.params.id, req.body)
    res.json(product)
  } catch (err) { next(err) }
}

export async function remove(req: Request<{ id: string }>, res: Response, next: NextFunction) {
  try {
    await productService.deleteProduct(req.params.id)
    res.status(204).send()
  } catch (err) { next(err) }
}

export async function categories(req: Request, res: Response, next: NextFunction) {
  try {
    const cats = await productService.listCategories()
    res.json(cats)
  } catch (err) { next(err) }
}
