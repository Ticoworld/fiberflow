import { apiFetch } from '#/lib/api.ts'

export type NodeInfo = {
  version: string
  commit_hash: string
  pubkey: string
  features: string[]
  node_name?: string | null
  addresses: string[]
  chain_hash: string
  channel_count: number | string
  pending_channel_count: number | string
  peers_count: number | string
}

export type Channel = {
  channel_id: string
  is_public: boolean
  pubkey: string
  state: string | Record<string, unknown>
  local_balance: number | string
  remote_balance: number | string
  enabled: boolean
  created_at: number
}

export type ListChannelsResult = {
  channels: Channel[]
}

export type PeerInfo = {
  pubkey: string
  address: string
}

export type ListPeersResult = {
  peers: PeerInfo[]
}

async function fetchRpc<T>(path: string): Promise<T> {
  const response = await apiFetch(path)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function fetchNodeInfo() {
  return fetchRpc<NodeInfo>('/rpc/node-info')
}

export function fetchChannels(includeClosed = false) {
  const params = new URLSearchParams()
  if (includeClosed) {
    params.set('include_closed', 'true')
  }

  const query = params.toString()
  return fetchRpc<ListChannelsResult>(
    `/rpc/list-channels${query ? `?${query}` : ''}`,
  )
}

export function fetchPeers() {
  return fetchRpc<ListPeersResult>('/rpc/list-peers')
}

export function truncateMiddle(value: string, head = 8, tail = 6) {
  if (value.length <= head + tail + 3) {
    return value
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`
}

export function formatChannelState(state: Channel['state']) {
  if (typeof state === 'string') {
    return state
  }

  const [variant] = Object.keys(state)
  return variant ?? 'Unknown'
}
