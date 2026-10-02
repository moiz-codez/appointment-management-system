import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireRole } from '@/lib/auth/guards';

export default async function AdminHome() {
  const user = await requireRole('admin');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>The organisation-wide dashboard will appear here. (Phase 7.)</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
