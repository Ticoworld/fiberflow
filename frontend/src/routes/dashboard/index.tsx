import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Activity, Network, Radio, Users } from 'lucide-react'

import { DashboardHeader } from '#/components/dashboard/dashboard-header.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { fetchNodeInfo, truncateMiddle } from '#/lib/fiber-api.ts'

export const Route = createFileRoute('/dashboard/')({
  component: DashboardOverviewPage,
})

function DashboardOverviewPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['node-info'],
    queryFn: fetchNodeInfo,
    refetchInterval: 30_000,
  })

  return (
    <>
      <DashboardHeader
        title="Overview"
        description="Monitor your Fiber node status and connectivity."
      />

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Unable to load node info</CardTitle>
              <CardDescription>
                Make sure the gateway server is running and connected to your
                Fiber node.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {error instanceof Error ? error.message : 'Unknown error'}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Channels"
                value={data?.channel_count}
                icon={Radio}
                loading={isLoading}
              />
              <StatCard
                title="Pending channels"
                value={data?.pending_channel_count}
                icon={Activity}
                loading={isLoading}
              />
              <StatCard
                title="Peers"
                value={data?.peers_count}
                icon={Users}
                loading={isLoading}
              />
              <StatCard
                title="Addresses"
                value={data?.addresses.length}
                icon={Network}
                loading={isLoading}
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Node identity</CardTitle>
                  <CardDescription>
                    Software version and public key for this node.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {isLoading ? (
                    <OverviewSkeleton />
                  ) : (
                    <>
                      <InfoRow label="Name" value={data?.node_name || 'Unnamed node'} />
                      <InfoRow label="Version" value={data?.version ?? '—'} />
                      <InfoRow
                        label="Commit"
                        value={truncateMiddle(data?.commit_hash ?? '—', 10, 8)}
                      />
                      <InfoRow
                        label="Public key"
                        value={truncateMiddle(data?.pubkey ?? '—', 12, 10)}
                      />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Network</CardTitle>
                  <CardDescription>
                    Chain and advertised multi-addresses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {isLoading ? (
                    <OverviewSkeleton />
                  ) : (
                    <>
                      <InfoRow
                        label="Chain hash"
                        value={truncateMiddle(data?.chain_hash ?? '—', 10, 8)}
                      />
                      <div className="space-y-2">
                        <p className="text-muted-foreground">Addresses</p>
                        {data?.addresses.length ? (
                          <ul className="space-y-2">
                            {data.addresses.map((address) => (
                              <li
                                key={address}
                                className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs break-all"
                              >
                                {address}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">
                            No addresses advertised.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  )
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string
  value?: number | string
  icon: typeof Radio
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-semibold">{value ?? '—'}</div>
        )}
      </CardContent>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium break-all">{value}</span>
    </div>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}
