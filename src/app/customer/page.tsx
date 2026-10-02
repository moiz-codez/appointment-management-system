import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/auth/guards';

export default async function CustomerHome() {
  const user = await requireRole('customer');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Book an appointment or take a walk-in token. (Coming in Phases 2-4.)</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
