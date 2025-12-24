import { User } from 'lucide-react'
import { useRecipient } from '~/contexts/recipient-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type RecipientSelectorProps = {
  onSelect?: () => void
}

export function RecipientSelector({ onSelect }: RecipientSelectorProps) {
  const { recipients, selectedRecipientId, setSelectedRecipientId } = useRecipient()

  const handleValueChange = (value: string) => {
    setSelectedRecipientId(value)
    onSelect?.()
  }

  if (recipients.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Managing medications for</p>
        <p className="text-sm text-muted-foreground">No care recipients yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Managing medications for</p>
      <Select value={selectedRecipientId ?? undefined} onValueChange={handleValueChange}>
        <SelectTrigger className="w-full">
          <div className="flex items-center gap-2">
            <User className="size-4 text-muted-foreground" />
            <SelectValue placeholder="Select person" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {recipients.map((recipient) => (
            <SelectItem key={recipient.id} value={recipient.id}>
              {recipient.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
