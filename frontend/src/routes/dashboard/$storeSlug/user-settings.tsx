import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { DashboardHeader } from '#/components/dashboard/dashboard-header.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { authClient } from '#/lib/auth-client.ts'
import { getAppSession } from '#/lib/auth-session.ts'

const userSettingsSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  image: z.union([z.string().url('Enter a valid image URL'), z.literal('')]),
})

type UserSettingsFormValues = z.infer<typeof userSettingsSchema>

export const Route = createFileRoute('/dashboard/$storeSlug/user-settings')({
  loader: async () => {
    const { data } = await getAppSession()
    return { user: data?.user ?? null }
  },
  component: UserSettingsPage,
})

function UserSettingsPage() {
  const { user } = Route.useLoaderData()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<UserSettingsFormValues>({
    resolver: zodResolver(userSettingsSchema),
    defaultValues: {
      name: user?.name ?? '',
      image: user?.image ?? '',
    },
  })

  async function onSubmit(values: UserSettingsFormValues) {
    setIsSubmitting(true)

    try {
      const { error } = await authClient.updateUser({
        name: values.name,
        image: values.image.trim() || null,
      })

      if (error) {
        throw new Error(error.message ?? 'Unable to update profile')
      }

      toast.success('User settings saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save user settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <DashboardHeader
        title="User settings"
        description="Manage your account profile"
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>
              Update your personal account details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" value={user?.email ?? ''} disabled />
                  <FieldDescription>Your email address cannot be changed here.</FieldDescription>
                </Field>

                <Field data-invalid={!!form.formState.errors.name}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    aria-invalid={!!form.formState.errors.name}
                    {...form.register('name')}
                  />
                  <FieldError errors={[form.formState.errors.name]} />
                </Field>

                <Field data-invalid={!!form.formState.errors.image}>
                  <FieldLabel htmlFor="image">Profile image URL</FieldLabel>
                  <Input
                    id="image"
                    placeholder="https://example.com/avatar.png"
                    aria-invalid={!!form.formState.errors.image}
                    {...form.register('image')}
                  />
                  <FieldDescription>Optional image URL for your profile avatar.</FieldDescription>
                  <FieldError errors={[form.formState.errors.image]} />
                </Field>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Spinner />
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
