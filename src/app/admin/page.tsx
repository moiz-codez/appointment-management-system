import { requireRole } from '@/lib/auth/guards';

export default async function AdminHome() {
  const user = await requireRole('admin');
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="text-muted-foreground">The organisation-wide dashboard will appear here. (Phase 7.)</p>
    </div>
  );
}
