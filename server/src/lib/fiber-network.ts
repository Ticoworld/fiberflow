import type { InvoiceCurrency } from '../db/schema'

export type FiberNetwork = 'mainnet' | 'testnet' | 'devnet'

const NETWORK_CURRENCY = {
  mainnet: 'fibb',
  testnet: 'fibt',
  devnet: 'fibd',
} as const satisfies Record<FiberNetwork, InvoiceCurrency>

export function getFiberNetwork(): FiberNetwork {
  const raw = (process.env.FIBER_NETWORK ?? 'testnet').trim().toLowerCase()

  switch (raw) {
    case 'mainnet':
      return 'mainnet'
    case 'testnet':
      return 'testnet'
    case 'devnet':
      return 'devnet'
    default:
      throw new Error(`Invalid FIBER_NETWORK "${raw}". Expected mainnet, testnet, or devnet.`)
  }
}

export function getInvoiceCurrencyForNetwork(network: FiberNetwork): InvoiceCurrency {
  return NETWORK_CURRENCY[network]
}

export function getInvoiceCurrency(): InvoiceCurrency {
  return getInvoiceCurrencyForNetwork(getFiberNetwork())
}

/** Fiber RPC expects Fibb, Fibt, or Fibd. */
export function formatRpcCurrency(currency: InvoiceCurrency): string {
  return currency.charAt(0).toUpperCase() + currency.slice(1)
}

export function formatNetworkLabel(network: FiberNetwork): string {
  switch (network) {
    case 'mainnet':
      return 'Mainnet'
    case 'testnet':
      return 'Testnet'
    case 'devnet':
      return 'Devnet'
    default: {
      const exhaustiveCheck: never = network
      return exhaustiveCheck
    }
  }
}
