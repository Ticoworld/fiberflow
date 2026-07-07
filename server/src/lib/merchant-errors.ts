import { HTTPException } from 'hono/http-exception'

export type MerchantErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'not_found_error'
  | 'api_error'
  | 'idempotency_error'

export type MerchantErrorBody = {
  error: {
    type: MerchantErrorType
    code: string
    message: string
    param?: string
  }
}

export class MerchantApiException extends Error {
  readonly status: number
  readonly type: MerchantErrorType
  readonly code: string
  readonly param?: string

  constructor(
    status: number,
    type: MerchantErrorType,
    code: string,
    message: string,
    param?: string,
  ) {
    super(message)
    this.name = 'MerchantApiException'
    this.status = status
    this.type = type
    this.code = code
    this.param = param
  }

  toJSON(): MerchantErrorBody {
    return {
      error: {
        type: this.type,
        code: this.code,
        message: this.message,
        ...(this.param ? { param: this.param } : {}),
      },
    }
  }
}

export function invalidRequest(
  message: string,
  param?: string,
  code = 'invalid_request',
): never {
  throw new MerchantApiException(400, 'invalid_request_error', code, message, param)
}

export function notFound(message: string, code = 'resource_missing'): never {
  throw new MerchantApiException(404, 'not_found_error', code, message)
}

export function authenticationError(message: string, code = 'invalid_api_key'): never {
  throw new MerchantApiException(401, 'authentication_error', code, message)
}

export function apiError(message: string, code = 'api_error'): never {
  throw new MerchantApiException(502, 'api_error', code, message)
}

export function idempotencyConflict(message: string, code: string): never {
  throw new MerchantApiException(409, 'idempotency_error', code, message)
}

function statusToErrorType(status: number): MerchantErrorType {
  switch (status) {
    case 401:
      return 'authentication_error'
    case 404:
      return 'not_found_error'
    case 409:
      return 'idempotency_error'
    case 502:
    case 503:
      return 'api_error'
    default:
      return 'invalid_request_error'
  }
}

function messageToCode(message: string, status: number): string {
  const normalized = message.toLowerCase()

  if (normalized.includes('amount') && normalized.includes('greater than 0')) {
    return 'invalid_amount'
  }

  if (normalized.includes('orderid') || normalized.includes('order_id')) {
    return 'missing_order_id'
  }

  if (normalized.includes('customeremail') || normalized.includes('customer_email')) {
    return 'missing_customer_email'
  }

  if (normalized.includes('too small')) {
    return 'amount_too_small'
  }

  if (status === 404) {
    return 'resource_missing'
  }

  if (status === 401) {
    return 'invalid_api_key'
  }

  return 'invalid_request'
}

function messageToParam(message: string): string | undefined {
  const normalized = message.toLowerCase()

  if (normalized.includes('amount')) {
    return 'amount_in_usd'
  }

  if (normalized.includes('order')) {
    return 'order_id'
  }

  if (normalized.includes('customer')) {
    return 'customer_email'
  }

  return undefined
}

export function fromHttpException(error: HTTPException): MerchantApiException {
  const status = error.status
  const message = error.message || 'Request failed'

  return new MerchantApiException(
    status,
    statusToErrorType(status),
    messageToCode(message, status),
    message,
    messageToParam(message),
  )
}

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === '23505'
  )
}
