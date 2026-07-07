import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar.tsx'
import type { StoreSummary } from '#/lib/stores-api.ts'

function getStoreInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  if (parts.length === 0) {
    return 'S'
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

type StoreAvatarProps = {
  store: Pick<StoreSummary, 'name' | 'logo'>
  size?: 'default' | 'sm' | 'lg'
  className?: string
}

export function StoreAvatar({ store, size = 'default', className }: StoreAvatarProps) {
  return (
    <Avatar size={size} className={className}>
      {store.logo ? <AvatarImage src={store.logo} alt={store.name} /> : null}
      <AvatarFallback className="rounded-lg bg-primary/10 text-primary">
        {getStoreInitials(store.name)}
      </AvatarFallback>
    </Avatar>
  )
}
