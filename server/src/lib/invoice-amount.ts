import { HTTPException } from 'hono/http-exception'

import { getCkbUsdPrice } from './ckb-price'

const SHANNONS_PER_CKB = 100_000_000

export function usdToCents(usd: number): number {
  return Math.round(usd * 100)
}

export async function usdToShannons(usd: number): Promise<string> {
  const ckbUsdPrice = await getCkbUsdPrice()
  const shannons = Math.ceil((usd / ckbUsdPrice) * SHANNONS_PER_CKB)

  if (shannons <= 0) {
    throw new HTTPException(400, {
      message: 'amountInUSD is too small for the current CKB price',
    })
  }

  return String(shannons)
}
