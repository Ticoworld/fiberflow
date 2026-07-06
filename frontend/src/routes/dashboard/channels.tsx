import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { DashboardHeader } from '#/components/dashboard/dashboard-header.tsx'
import { Badge } from '#/components/ui/badge.tsx'
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
import {
  fetchChannels,
  formatChannelState,
  truncateMiddle,
} from '#/lib/fiber-api.ts'

export const Route = createFileRoute('/dashboard/channels')({
  component: DashboardChannelsPage,
})

function DashboardChannelsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['channels'],
    queryFn: () => fetchChannels(),
    refetchInterval: 30_000,
  })

  const channels = data?.channels ?? []

  return (
    <>
      <DashboardHeader
        title="Channels"
        description="Open payment channels managed by your Fiber node."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <Card>
          <CardHeader>
            <CardTitle>Channel list</CardTitle>
            <CardDescription>
              {isLoading
                ? 'Loading channels...'
                : `${channels.length} channel${channels.length === 1 ? '' : 's'} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Failed to load channels'}
              </p>
            ) : isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : channels.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No channels yet. Open a channel to start routing payments.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Peer</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Local balance</TableHead>
                    <TableHead>Remote balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map((channel) => (
                    <TableRow key={channel.channel_id}>
                      <TableCell className="font-mono text-xs">
                        {truncateMiddle(channel.channel_id, 8, 6)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {truncateMiddle(channel.pubkey, 8, 6)}
                      </TableCell>
                      <TableCell>{formatChannelState(channel.state)}</TableCell>
                      <TableCell>{String(channel.local_balance)}</TableCell>
                      <TableCell>{String(channel.remote_balance)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={channel.enabled ? 'default' : 'secondary'}>
                            {channel.enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          {channel.is_public ? (
                            <Badge variant="outline">Public</Badge>
                          ) : null}
                        </div>
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
