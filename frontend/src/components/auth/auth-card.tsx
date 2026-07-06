import { Link } from '@tanstack/react-router'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'

type AuthCardProps = {
  title: string
  description: string
  children: React.ReactNode
  footer: {
    text: string
    linkText: string
    linkTo: '/login' | '/signup'
  }
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          {footer.text}{' '}
          <Link
            to={footer.linkTo}
            className="ml-1 font-medium text-foreground underline-offset-4 hover:underline"
          >
            {footer.linkText}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
