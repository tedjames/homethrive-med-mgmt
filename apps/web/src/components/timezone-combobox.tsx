import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

// Get all IANA timezones
const ALL_TIMEZONES = Intl.supportedValuesOf('timeZone').map((tz) => {
  // Format the timezone for display
  const parts = tz.split('/')
  const city = parts[parts.length - 1].replace(/_/g, ' ')
  const region = parts.length > 1 ? parts[0].replace(/_/g, ' ') : ''

  return {
    value: tz,
    label: region ? `${city} (${region})` : city,
    searchTerms: tz.toLowerCase().replace(/_/g, ' '),
  }
})

type TimezoneComboboxProps = {
  value: string
  onValueChange: (value: string) => void
}

export function TimezoneCombobox({ value, onValueChange }: TimezoneComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedTimezone = ALL_TIMEZONES.find((tz) => tz.value === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between sm:w-80"
        >
          {selectedTimezone ? selectedTimezone.label : 'Select timezone...'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 sm:w-80">
        <Command>
          <CommandInput placeholder="Search timezone..." />
          <CommandList>
            <CommandEmpty>No timezone found.</CommandEmpty>
            <CommandGroup>
              {ALL_TIMEZONES.map((tz) => (
                <CommandItem
                  key={tz.value}
                  value={tz.searchTerms}
                  onSelect={() => {
                    onValueChange(tz.value)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 size-4',
                      value === tz.value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {tz.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
