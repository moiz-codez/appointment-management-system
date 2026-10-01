import { requireRole } from '@/lib/auth/guards';

export default async function CustomerHome() {
  const user = await requireRole('customer');
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
      <p className="text-muted-foreground">Book an appointment or take a walk-in token. (Coming in Phases 2-4.)</p>
    </div>
  );
}
