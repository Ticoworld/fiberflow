import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { AuthCard } from '#/components/auth/auth-card.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '#/components/ui/field.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Spinner } from '#/components/ui/spinner.tsx'
import { authClient } from '#/lib/auth-client.ts'
import { getAppSession } from '#/lib/auth-session.ts'

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
})

type SignupFormValues = z.infer<typeof signupSchema>

export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    const { data } = await getAppSession()
    if (data?.user) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: SignupFormValues) {
    setIsSubmitting(true)

    const { error } = await authClient.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
    })

    setIsSubmitting(false)

    if (error) {
      toast.error(error.message ?? 'Unable to create account. Please try again.')
      return
    }

    toast.success('Account created successfully')
    await navigate({ to: '/dashboard' })
  }

  return (
    <AuthCard
      title="Create an account"
      description="Enter your details to get started with Fiberflow Gateway."
      footer={{
        text: 'Already have an account?',
        linkText: 'Sign in',
        linkTo: '/login',
      }}
    >
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Field data-invalid={!!form.formState.errors.name}>
            <FieldLabel htmlFor="name">Name</FieldLabel>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              placeholder="Jane Doe"
              aria-invalid={!!form.formState.errors.name}
              {...form.register('name')}
            />
            <FieldError errors={[form.formState.errors.name]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.email}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
            <FieldError errors={[form.formState.errors.email]} />
          </Field>

          <Field data-invalid={!!form.formState.errors.password}>
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!form.formState.errors.password}
              {...form.register('password')}
            />
            <FieldError errors={[form.formState.errors.password]} />
          </Field>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Spinner />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>
        </FieldGroup>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </AuthCard>
  )
}
