import { HTTPException } from 'hono/http-exception'

const COINGECKO_CKB_PRICE_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=nervos-network&vs_currencies=usd'

const CACHE_TTL_MS = 60_000

type CoinGeckoPriceResponse = {
  'nervos-network'?: {
    usd?: number
  }
}

let cachedPrice: {
  price: number
  fetchedAt: number
} | null = null

export async function getCkbUsdPrice(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < CACHE_TTL_MS) {
    return cachedPrice.price
  }

  let response: Response

  try {
    response = await fetch(COINGECKO_CKB_PRICE_URL, {
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new HTTPException(502, { message: 'Unable to reach CKB price provider' })
  }

  if (!response.ok) {
    throw new HTTPException(502, { message: 'Unable to fetch CKB price' })
  }

  const data = (await response.json()) as CoinGeckoPriceResponse
  const price = data['nervos-network']?.usd

  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    throw new HTTPException(502, { message: 'CKB price provider returned an invalid price' })
  }

  cachedPrice = { price, fetchedAt: Date.now() }
  return price
}
