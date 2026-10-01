import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RegisterForm } from './register-form';

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Book appointments and join queues online.</CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Already registered?&nbsp;
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
