const FIBER_RPC_URL = process.env.FIBER_RPC_URL ?? 'http://127.0.0.1:8227'

type JsonRpcError = {
  code: number
  message: string
}

type JsonRpcResponse<T> = {
  id: number
  jsonrpc: '2.0'
  result?: T
  error?: JsonRpcError
}

export class FiberRpcError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message)
    this.name = 'FiberRpcError'
  }
}

export async function fiberRpc<T>(
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const response = await fetch(FIBER_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method,
      params,
    }),
  })

  if (!response.ok) {
    throw new FiberRpcError(`Fiber RPC HTTP ${response.status}`)
  }

  const data = (await response.json()) as JsonRpcResponse<T>

  if (data.error) {
    throw new FiberRpcError(data.error.message, data.error.code)
  }

  if (data.result === undefined) {
    throw new FiberRpcError('Fiber RPC returned no result')
  }

  return data.result
}
