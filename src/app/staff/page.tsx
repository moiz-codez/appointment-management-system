import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/auth/guards';

export default async function StaffHome() {
  const user = await requireRole('staff');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>Your counter and waiting list will appear here. (Phase 5.)</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
