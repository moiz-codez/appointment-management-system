import { requireRole } from '@/lib/auth/guards';

export default async function StaffHome() {
  const user = await requireRole('staff');
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="text-muted-foreground">Your counter and waiting list will appear here. (Phase 5.)</p>
    </div>
  );
}
