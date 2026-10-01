import { requireRole } from '@/lib/auth/guards';

export default async function ManagerHome() {
  const user = await requireRole('manager');
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="text-muted-foreground">Your department dashboard will appear here. (Phase 7.)</p>
    </div>
  );
}
