import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
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
import type { StoreSummary } from '#/lib/stores-api.ts'
import { updateStore } from '#/lib/stores-api.ts'

const storeSettingsSchema = z.object({
  name: z.string().min(2, 'Store name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(3, 'Store URL must be at least 3 characters')
    .max(50)
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Store URL can only contain lowercase letters, numbers, and hyphens',
    ),
  logo: z.union([z.string().url('Enter a valid image URL'), z.literal('')]),
})

type StoreSettingsFormValues = z.infer<typeof storeSettingsSchema>

type StoreDetailsCardProps = {
  store: StoreSummary
}

export function StoreDetailsCard({ store }: StoreDetailsCardProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<StoreSettingsFormValues>({
    resolver: zodResolver(storeSettingsSchema),
    defaultValues: {
      name: store.name,
      slug: store.slug,
      logo: store.logo ?? '',
    },
  })

  async function onSubmit(values: StoreSettingsFormValues) {
    setIsSubmitting(true)

    try {
      const updated = await updateStore(store.id, {
        name: values.name,
        slug: values.slug,
        logo: values.logo.trim() || null,
      })

      toast.success('Store settings saved')
      await router.invalidate()

      if (updated.slug !== store.slug) {
        await navigate({
          to: '/dashboard/$storeSlug/settings',
          params: { storeSlug: updated.slug },
        })
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save store settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto w-full">
      <CardHeader>
        <CardTitle>Store details</CardTitle>
        <CardDescription>
          Update your store name, URL, and logo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <Field data-invalid={!!form.formState.errors.name}>
              <FieldLabel htmlFor="name">Store name</FieldLabel>
              <Input
                id="name"
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
                  aria-invalid={!!form.formState.errors.slug}
                  {...form.register('slug')}
                />
              </div>
              <FieldDescription>
                Changing the URL will update your dashboard path.
              </FieldDescription>
              <FieldError errors={[form.formState.errors.slug]} />
            </Field>

            <Field data-invalid={!!form.formState.errors.logo}>
              <FieldLabel htmlFor="logo">Logo URL</FieldLabel>
              <Input
                id="logo"
                placeholder="https://example.com/logo.png"
                aria-invalid={!!form.formState.errors.logo}
                {...form.register('logo')}
              />
              <FieldDescription>Optional image URL for your store avatar.</FieldDescription>
              <FieldError errors={[form.formState.errors.logo]} />
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
  )
}
