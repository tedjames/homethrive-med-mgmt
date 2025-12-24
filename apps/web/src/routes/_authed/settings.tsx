import { createFileRoute } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Check, X, Mail, UserPlus, Users, Clock, Shield, User, Heart } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { ConfirmDialog } from '~/components/confirm-dialog'
import { TimezoneCombobox } from '~/components/timezone-combobox'
import { useUserRole } from '~/contexts/user-role-context'
import * as React from 'react'

export const Route = createFileRoute('/_authed/settings')({
  component: SettingsPage,
})

// Mock data for the settings page
const MOCK_MY_CAREGIVERS = [
  {
    id: 'access-1',
    status: 'approved' as const,
    caregiverDisplayName: 'Alice Johnson',
    caregiverEmail: 'alice@example.com',
    approvedAt: new Date('2024-06-01'),
  },
  {
    id: 'access-2',
    status: 'pending_request' as const,
    caregiverDisplayName: 'Bob Smith',
    caregiverEmail: 'bob@example.com',
    requestedAt: new Date('2024-06-15'),
  },
]

const MOCK_PEOPLE_I_CARE_FOR = [
  {
    id: 'access-3',
    status: 'approved' as const,
    recipientDisplayName: 'Grandma Margaret',
    recipientEmail: 'margaret@example.com',
    approvedAt: new Date('2024-05-15'),
  },
  {
    id: 'access-4',
    status: 'pending_invite' as const,
    recipientDisplayName: 'Uncle John',
    recipientEmail: 'john@example.com',
    requestedAt: new Date('2024-06-14'),
  },
]

function SettingsPage() {
  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div>
        <h1 className="font-['Gambarino'] text-4xl">Settings</h1>
        <p className="text-muted-foreground">Manage your caregivers and access to care recipients</p>
      </div>

      <Tabs defaultValue="my-profile" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="my-profile" className="gap-2">
            <User className="size-4" />
            <span className="hidden sm:inline">My Profile</span>
            <span className="sm:hidden">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="my-caregivers" className="gap-2">
            <Shield className="size-4" />
            <span className="hidden sm:inline">My Caregivers</span>
            <span className="sm:hidden">Caregivers</span>
          </TabsTrigger>
          <TabsTrigger value="people-i-care-for" className="gap-2">
            <Users className="size-4" />
            <span className="hidden sm:inline">People I Care For</span>
            <span className="sm:hidden">Care For</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-profile" className="mt-6">
          <MyProfileTab />
        </TabsContent>

        <TabsContent value="my-caregivers" className="mt-6">
          <MyCaregiversTab />
        </TabsContent>

        <TabsContent value="people-i-care-for" className="mt-6">
          <PeopleICareForTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MyProfileTab() {
  const [displayName, setDisplayName] = React.useState('Ted Werbel')
  const [timezone, setTimezone] = React.useState('America/New_York')
  const { isRecipient, isCaregiver, setIsRecipient, setIsCaregiver } = useUserRole()

  return (
    <div className="space-y-6">
      {/* Header description */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Your profile information is used to personalize your experience and display your name to caregivers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="size-5 text-primary" />
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </div>
          <CardDescription>Update your display name and timezone preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success('Profile saved', {
                description: 'Your profile has been updated successfully.',
              })
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This is how your name will appear to caregivers and in the app.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Timezone</Label>
              <TimezoneCombobox value={timezone} onValueChange={setTimezone} />
              <p className="text-xs text-muted-foreground">
                Medication schedules will be displayed in this timezone.
              </p>
            </div>

            <Button type="submit" disabled={!displayName.trim()}>
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Role Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Heart className="size-5 text-primary" />
            <CardTitle className="text-lg">My Roles</CardTitle>
          </div>
          <CardDescription>Choose how you use this app. You can be both a recipient and a caregiver.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="recipient-switch" className="text-base font-medium">
                I am a care recipient
              </Label>
              <p className="text-sm text-muted-foreground">
                I take medications and want to track my own schedule
              </p>
            </div>
            <Switch
              id="recipient-switch"
              checked={isRecipient}
              onCheckedChange={setIsRecipient}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="caregiver-switch" className="text-base font-medium">
                I am a caregiver
              </Label>
              <p className="text-sm text-muted-foreground">
                I help manage medications for other people
              </p>
            </div>
            <Switch
              id="caregiver-switch"
              checked={isCaregiver}
              onCheckedChange={setIsCaregiver}
            />
          </div>

          {!isRecipient && !isCaregiver && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-700">
                Please select at least one role to use the app.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

type ConfirmAction = {
  type: 'approve' | 'deny' | 'revoke'
  id: string
  name: string
}

function MyCaregiversTab() {
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [confirmAction, setConfirmAction] = React.useState<ConfirmAction | null>(null)

  const approvedCaregivers = MOCK_MY_CAREGIVERS.filter((c) => c.status === 'approved')
  const pendingRequests = MOCK_MY_CAREGIVERS.filter((c) => c.status === 'pending_request')

  const handleConfirm = () => {
    if (!confirmAction) return
    console.log(`${confirmAction.type} action confirmed for ${confirmAction.name}`)

    switch (confirmAction.type) {
      case 'approve':
        toast.success('Caregiver approved', {
          description: `${confirmAction.name} can now manage your medications.`,
        })
        break
      case 'deny':
        toast.success('Request denied', {
          description: `${confirmAction.name}'s request has been denied.`,
        })
        break
      case 'revoke':
        toast.success('Access revoked', {
          description: `${confirmAction.name} no longer has access to your medications.`,
        })
        break
    }
    setConfirmAction(null)
  }

  const getDialogConfig = () => {
    if (!confirmAction) return null

    switch (confirmAction.type) {
      case 'approve':
        return {
          title: 'Approve Caregiver Request',
          description: `Are you sure you want to approve ${confirmAction.name} as your caregiver? They will be able to view and manage your medications.`,
          confirmLabel: 'Approve',
          variant: 'default' as const,
        }
      case 'deny':
        return {
          title: 'Deny Caregiver Request',
          description: `Are you sure you want to deny the request from ${confirmAction.name}? They will not be able to access your care profile.`,
          confirmLabel: 'Deny',
          variant: 'destructive' as const,
        }
      case 'revoke':
        return {
          title: 'Revoke Caregiver Access',
          description: `Are you sure you want to revoke access for ${confirmAction.name}? They will no longer be able to view or manage your medications.`,
          confirmLabel: 'Revoke Access',
          variant: 'destructive' as const,
        }
    }
  }

  const dialogConfig = getDialogConfig()

  return (
    <div className="space-y-6">
      {/* Header description */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Caregivers can view and manage your medications and schedules. You control who has access to your care profile.
        </p>
      </div>

      {/* Pending Requests - shown first if any exist */}
      {pendingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-amber-600" />
              <CardTitle className="text-lg">Pending Requests</CardTitle>
              <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                {pendingRequests.length}
              </Badge>
            </div>
            <CardDescription>These people are requesting access to your care profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-amber-100 text-amber-700">
                      {request.caregiverDisplayName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.caregiverDisplayName}</p>
                    <p className="text-sm text-muted-foreground">{request.caregiverEmail}</p>
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setConfirmAction({ type: 'approve', id: request.id, name: request.caregiverDisplayName })}
                  >
                    <Check className="mr-1.5 size-4" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmAction({ type: 'deny', id: request.id, name: request.caregiverDisplayName })}
                  >
                    <X className="mr-1.5 size-4" />
                    Deny
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Caregivers */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <CardTitle className="text-lg">Active Caregivers</CardTitle>
            {approvedCaregivers.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {approvedCaregivers.length}
              </Badge>
            )}
          </div>
          <CardDescription>People who currently have access to your care profile</CardDescription>
        </CardHeader>
        <CardContent>
          {approvedCaregivers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <Shield className="mb-2 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No caregivers yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Invite someone to help manage your care</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedCaregivers.map((caregiver) => (
                <div
                  key={caregiver.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback>{caregiver.caregiverDisplayName?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{caregiver.caregiverDisplayName}</p>
                      <p className="text-sm text-muted-foreground">{caregiver.caregiverEmail}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-end text-destructive hover:text-destructive sm:self-auto"
                    onClick={() => setConfirmAction({ type: 'revoke', id: caregiver.id, name: caregiver.caregiverDisplayName })}
                  >
                    Revoke Access
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Caregiver */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            <CardTitle className="text-lg">Invite a Caregiver</CardTitle>
          </div>
          <CardDescription>Send an invitation to someone to help manage your care</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success('Invitation sent', {
                description: `An invitation has been sent to ${inviteEmail}.`,
              })
              setInviteEmail('')
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="caregiver@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!inviteEmail} className="sm:w-auto">
              <Mail className="mr-2 size-4" />
              Send Invitation
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {dialogConfig && (
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          confirmLabel={dialogConfig.confirmLabel}
          onConfirm={handleConfirm}
          variant={dialogConfig.variant}
        />
      )}
    </div>
  )
}

type RecipientConfirmAction = {
  type: 'accept' | 'decline' | 'leave'
  id: string
  name: string
}

function PeopleICareForTab() {
  const [requestEmail, setRequestEmail] = React.useState('')
  const [confirmAction, setConfirmAction] = React.useState<RecipientConfirmAction | null>(null)

  const approvedRecipients = MOCK_PEOPLE_I_CARE_FOR.filter((r) => r.status === 'approved')
  const pendingInvites = MOCK_PEOPLE_I_CARE_FOR.filter((r) => r.status === 'pending_invite')

  const handleConfirm = () => {
    if (!confirmAction) return
    console.log(`${confirmAction.type} action confirmed for ${confirmAction.name}`)

    switch (confirmAction.type) {
      case 'accept':
        toast.success('Invitation accepted', {
          description: `You are now a caregiver for ${confirmAction.name}.`,
        })
        break
      case 'decline':
        toast.success('Invitation declined', {
          description: `You declined the invitation from ${confirmAction.name}.`,
        })
        break
      case 'leave':
        toast.success('Left as caregiver', {
          description: `You are no longer a caregiver for ${confirmAction.name}.`,
        })
        break
    }
    setConfirmAction(null)
  }

  const getDialogConfig = () => {
    if (!confirmAction) return null

    switch (confirmAction.type) {
      case 'accept':
        return {
          title: 'Accept Caregiver Invitation',
          description: `Are you sure you want to accept the invitation to be a caregiver for ${confirmAction.name}? You will be able to view and manage their medications.`,
          confirmLabel: 'Accept',
          variant: 'default' as const,
        }
      case 'decline':
        return {
          title: 'Decline Caregiver Invitation',
          description: `Are you sure you want to decline the invitation from ${confirmAction.name}? You can request access again later if needed.`,
          confirmLabel: 'Decline',
          variant: 'destructive' as const,
        }
      case 'leave':
        return {
          title: 'Leave as Caregiver',
          description: `Are you sure you want to stop being a caregiver for ${confirmAction.name}? You will no longer be able to view or manage their medications.`,
          confirmLabel: 'Leave',
          variant: 'destructive' as const,
        }
    }
  }

  const dialogConfig = getDialogConfig()

  return (
    <div className="space-y-6">
      {/* Header description */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          As a caregiver, you can view and manage medications for people who have granted you access.
        </p>
      </div>

      {/* Pending Invites - shown first if any exist */}
      {pendingInvites.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-blue-600" />
              <CardTitle className="text-lg">Pending Invitations</CardTitle>
              <Badge variant="secondary" className="ml-auto bg-blue-100 text-blue-700">
                {pendingInvites.length}
              </Badge>
            </div>
            <CardDescription>You've been invited to be a caregiver for these people</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {invite.recipientDisplayName?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{invite.recipientDisplayName}</p>
                    <p className="text-sm text-muted-foreground">{invite.recipientEmail}</p>
                  </div>
                </div>
                <div className="flex gap-2 self-end sm:self-auto">
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setConfirmAction({ type: 'accept', id: invite.id, name: invite.recipientDisplayName })}
                  >
                    <Check className="mr-1.5 size-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setConfirmAction({ type: 'decline', id: invite.id, name: invite.recipientDisplayName })}
                  >
                    <X className="mr-1.5 size-4" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* People I Care For */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <CardTitle className="text-lg">People I Care For</CardTitle>
            {approvedRecipients.length > 0 && (
              <Badge variant="secondary" className="ml-auto">
                {approvedRecipients.length}
              </Badge>
            )}
          </div>
          <CardDescription>Care recipients you have access to manage</CardDescription>
        </CardHeader>
        <CardContent>
          {approvedRecipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
              <Users className="mb-2 size-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">You're not a caregiver for anyone yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Request access or wait for an invitation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvedRecipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback>{recipient.recipientDisplayName?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{recipient.recipientDisplayName}</p>
                      <p className="text-sm text-muted-foreground">{recipient.recipientEmail}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-end text-destructive hover:text-destructive sm:self-auto"
                    onClick={() => setConfirmAction({ type: 'leave', id: recipient.id, name: recipient.recipientDisplayName })}
                  >
                    Leave
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Access */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-primary" />
            <CardTitle className="text-lg">Request Access</CardTitle>
          </div>
          <CardDescription>Request to become a caregiver for someone</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault()
              toast.success('Request sent', {
                description: `A request has been sent to ${requestEmail}.`,
              })
              setRequestEmail('')
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="request-email">Care recipient's email</Label>
              <Input
                id="request-email"
                type="email"
                placeholder="carerecipient@example.com"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!requestEmail} className="sm:w-auto">
              <UserPlus className="mr-2 size-4" />
              Request Access
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      {dialogConfig && (
        <ConfirmDialog
          open={!!confirmAction}
          onOpenChange={(open) => !open && setConfirmAction(null)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          confirmLabel={dialogConfig.confirmLabel}
          onConfirm={handleConfirm}
          variant={dialogConfig.variant}
        />
      )}
    </div>
  )
}
