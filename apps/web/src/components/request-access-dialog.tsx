import * as React from 'react'
import { Loader2, Mail, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useRequestAccess } from '~/lib/api-hooks'

type RequestAccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RequestAccessDialog({ open, onOpenChange }: RequestAccessDialogProps) {
  const [email, setEmail] = React.useState('')
  const requestAccess = useRequestAccess()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    requestAccess.mutate(email, {
      onSuccess: () => {
        setEmail('')
        onOpenChange(false)
      },
    })
  }

  // Reset email when dialog closes
  React.useEffect(() => {
    if (!open) {
      setEmail('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <DialogTitle>Request Access</DialogTitle>
          </div>
          <DialogDescription>
            Request to become a caregiver for someone. They will need to approve your request before you can manage their medications.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="request-email">Care recipient's email</Label>
            <Input
              id="request-email"
              type="email"
              placeholder="carerecipient@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={requestAccess.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!email || requestAccess.isPending}
            >
              {requestAccess.isPending ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 size-4" />
              )}
              Request Access
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
