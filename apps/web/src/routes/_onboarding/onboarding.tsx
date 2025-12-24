import { useAuth } from '@clerk/clerk-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import * as React from 'react'
import { ArrowLeft, ArrowRight, Check, User, Globe, Heart, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { TimezoneCombobox } from '~/components/timezone-combobox'
import { apiRequest } from '~/lib/api'

export const Route = createFileRoute('/_onboarding/onboarding')({
  component: OnboardingWizard,
})

type OnboardingData = {
  displayName: string
  timezone: string
  isRecipient: boolean
  isCaregiver: boolean
}

const STEPS = [
  { id: 'name', title: 'Your Name', icon: User },
  { id: 'timezone', title: 'Your Timezone', icon: Globe },
  { id: 'roles', title: 'How You Will Use the App', icon: Heart },
]

function OnboardingWizard() {
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = React.useState(0)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Try to detect browser timezone, fallback to America/New_York
  const defaultTimezone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'
    } catch {
      return 'America/New_York'
    }
  }, [])

  const [data, setData] = React.useState<OnboardingData>({
    displayName: '',
    timezone: defaultTimezone,
    isRecipient: false,
    isCaregiver: false,
  })

  const progress = ((currentStep + 1) / STEPS.length) * 100

  const canProceed = React.useMemo(() => {
    switch (currentStep) {
      case 0:
        return data.displayName.trim().length > 0
      case 1:
        return data.timezone.length > 0
      case 2:
        return data.isRecipient || data.isCaregiver
      default:
        return false
    }
  }, [currentStep, data])

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      await apiRequest(
        '/onboarding/complete',
        {
          method: 'POST',
          body: JSON.stringify(data),
        },
        getToken
      )

      // Redirect based on roles
      if (data.isRecipient) {
        navigate({ to: '/my/schedule' })
      } else {
        navigate({ to: '/care/schedule' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span>{STEPS[currentStep].title}</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step content */}
      <Card>
        <CardHeader className="text-center">
          {currentStep === 0 && (
            <>
              <User className="mx-auto size-12 text-primary" />
              <CardTitle className="text-2xl">What's your name?</CardTitle>
              <CardDescription>
                This is how you'll appear in the app and to caregivers.
              </CardDescription>
            </>
          )}
          {currentStep === 1 && (
            <>
              <Globe className="mx-auto size-12 text-primary" />
              <CardTitle className="text-2xl">What's your timezone?</CardTitle>
              <CardDescription>
                We'll use this to show medication schedules at the right times.
              </CardDescription>
            </>
          )}
          {currentStep === 2 && (
            <>
              <Heart className="mx-auto size-12 text-primary" />
              <CardTitle className="text-2xl">How will you use this app?</CardTitle>
              <CardDescription>
                You can be both a care recipient and a caregiver.
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === 0 && (
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Enter your name"
                value={data.displayName}
                onChange={(e) => setData({ ...data, displayName: e.target.value })}
                autoFocus
              />
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-2">
              <Label>Timezone</Label>
              <TimezoneCombobox
                value={data.timezone}
                onValueChange={(value) => setData({ ...data, timezone: value })}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div
                className="flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                onClick={() => setData({ ...data, isRecipient: !data.isRecipient })}
              >
                <Checkbox
                  id="isRecipient"
                  checked={data.isRecipient}
                  onCheckedChange={(checked) =>
                    setData({ ...data, isRecipient: checked === true })
                  }
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="isRecipient"
                    className="cursor-pointer text-base font-medium"
                  >
                    I take medications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Track your own medication schedule and mark doses as taken.
                  </p>
                </div>
              </div>

              <div
                className="flex cursor-pointer items-start space-x-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
                onClick={() => setData({ ...data, isCaregiver: !data.isCaregiver })}
              >
                <Checkbox
                  id="isCaregiver"
                  checked={data.isCaregiver}
                  onCheckedChange={(checked) =>
                    setData({ ...data, isCaregiver: checked === true })
                  }
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="space-y-1">
                  <Label
                    htmlFor="isCaregiver"
                    className="cursor-pointer text-base font-medium"
                  >
                    I help others with medications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Manage medications for family members or people you care for.
                  </p>
                </div>
              </div>

              {!data.isRecipient && !data.isCaregiver && (
                <p className="text-sm text-amber-600">
                  Please select at least one option to continue.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0 || isSubmitting}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed}>
            Next
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Complete
                <Check className="ml-2 size-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
