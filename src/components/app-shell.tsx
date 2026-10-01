import { redirect } from 'next/navigation';
import { logout } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth/guards';
import type { Role } from '@/lib/db/schema';

const TITLES: Record<Role, string> = {
  customer: 'Customer',
  staff: 'Staff Console',
  manager: 'Manager',
  admin: 'Administrator',
};

// Shared frame for every signed-in area: title, current user + role, logout.
export async function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const user = await requireRole(role).catch(() => redirect('/login'));

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="font-semibold">Queue &amp; Appointments</p>
            <p className="text-sm text-muted-foreground">{TITLES[role]}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground capitalize">{user.role}</p>
            </div>
            <form action={logout}>
              <Button type="submit" variant="outline" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
