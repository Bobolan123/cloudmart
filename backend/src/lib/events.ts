import { EventEmitter } from 'events'

/**
 * Local event bus — mirrors what SQS/SNS will handle in production.
 * Swap emit() calls with SQS sendMessage() when deploying to AWS.
 */
export const eventBus = new EventEmitter()

export const Events = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
} as const
