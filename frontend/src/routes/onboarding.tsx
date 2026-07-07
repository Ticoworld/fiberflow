import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

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
import { getAppSession } from '#/lib/auth-session.ts'
import { createStore, fetchStores, slugifyStoreName } from '#/lib/stores-api.ts'

const onboardingSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(3, 'Store URL must be at least 3 characters')
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Store URL can only contain lowercase letters, numbers, and hyphens',
    ),
})

type OnboardingFormValues = z.infer<typeof onboardingSchema>

export const Route = createFileRoute('/onboarding')({
  beforeLoad: async () => {
    const { data } = await getAppSession()
    if (!data?.user) {
      throw redirect({ to: '/login' })
    }

    const stores = await fetchStores()
    if (stores.length > 0) {
      throw redirect({
        to: '/dashboard/$storeSlug',
        params: { storeSlug: stores[0].slug },
      })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  const nameValue = form.watch('name')

  useEffect(() => {
    if (slugTouched) {
      return
    }

    form.setValue('slug', slugifyStoreName(nameValue), {
      shouldDirty: true,
      shouldValidate: nameValue.length > 0,
    })
  }, [form, nameValue, slugTouched])

  async function onSubmit(values: OnboardingFormValues) {
    setIsSubmitting(true)

    try {
      const store = await createStore({
        name: values.name,
        slug: values.slug,
      })

      toast.success('Store created successfully')
      await navigate({
        to: '/dashboard/$storeSlug',
        params: { storeSlug: store.slug },
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create store',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your store</CardTitle>
          <CardDescription>
            Set up your FiberFlow store to start accepting payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.name}>
                <FieldLabel htmlFor="name">Store name</FieldLabel>
                <Input
                  id="name"
                  placeholder="Acme Payments"
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register('name')}
                />
                <FieldError errors={[form.formState.errors.name]} />
              </Field>

              <Field data-invalid={!!form.formState.errors.slug}>
                <FieldLabel htmlFor="slug">Store URL</FieldLabel>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/dashboard/</span>
                  <Input
                    id="slug"
                    placeholder="acme-payments"
                    aria-invalid={!!form.formState.errors.slug}
                    {...form.register('slug', {
                      onChange: () => setSlugTouched(true),
                    })}
                  />
                </div>
                <FieldDescription>
                  This is the URL you will use to manage your store.
                </FieldDescription>
                <FieldError errors={[form.formState.errors.slug]} />
              </Field>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Creating store...
                  </>
                ) : (
                  'Create store'
                )}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
