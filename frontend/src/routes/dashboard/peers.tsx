import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardHeader } from '#/components/dashboard/dashboard-header.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { fetchPeers, truncateMiddle } from '#/lib/fiber-api.ts'

export const Route = createFileRoute('/dashboard/peers')({
  component: DashboardPeersPage,
})

function DashboardPeersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['peers'],
    queryFn: fetchPeers,
    refetchInterval: 30_000,
  })

  const peers = data?.peers ?? []

  return (
    <>
      <DashboardHeader
        title="Peers"
        description="Peers currently connected to your Fiber node."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Connected peers</CardTitle>
            <CardDescription>
              {isLoading
                ? 'Loading peers...'
                : `${peers.length} peer${peers.length === 1 ? '' : 's'} connected`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Failed to load peers'}
              </p>
            ) : isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : peers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No peers connected. Use connect_peer to add a peer.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Public key</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {peers.map((peer) => (
                    <TableRow key={`${peer.pubkey}-${peer.address}`}>
                      <TableCell className="font-mono text-xs">
                        {truncateMiddle(peer.pubkey, 12, 10)}
                      </TableCell>
                      <TableCell className="font-mono text-xs break-all">
                        {peer.address}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
