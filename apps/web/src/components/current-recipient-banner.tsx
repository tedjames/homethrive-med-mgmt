import { User } from 'lucide-react'
import { useRecipient } from '~/contexts/recipient-context'

export function CurrentRecipientBanner() {
  const { selectedRecipient } = useRecipient()

  if (!selectedRecipient) {
    return null
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 md:hidden">
      <User className="size-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        Managing medications for{' '}
        <span className="font-medium text-foreground">{selectedRecipient.displayName}</span>
      </span>
    </div>
  )
}
