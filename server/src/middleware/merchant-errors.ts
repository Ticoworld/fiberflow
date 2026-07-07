import type { ErrorHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

import { fromHttpException, MerchantApiException } from '../lib/merchant-errors'

function toStatusCode(status: number): ContentfulStatusCode {
  return status as ContentfulStatusCode
}

export const merchantErrorHandler: ErrorHandler = (error, c) => {
  if (error instanceof MerchantApiException) {
    return c.json(error.toJSON(), toStatusCode(error.status))
  }

  if (error instanceof HTTPException) {
    const merchantError = fromHttpException(error)
    return c.json(merchantError.toJSON(), toStatusCode(merchantError.status))
  }

  console.error(error)
  return c.json(
    {
      error: {
        type: 'api_error',
        code: 'internal_error',
        message: 'Internal server error',
      },
    },
    500,
  )
}
