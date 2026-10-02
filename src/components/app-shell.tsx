import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { logout } from '@/actions/auth';
import { AppLogo } from '@/components/app-logo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { requireRole } from '@/lib/auth/guards';
import type { Role } from '@/lib/db/schema';

const AREA: Record<Role, string> = {
  customer: 'Customer',
  staff: 'Staff Console',
  manager: 'Manager',
  admin: 'Administrator',
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// Shared frame for every signed-in area: brand, current user + role, logout.
export async function AppShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const user = await requireRole(role).catch(() => redirect('/login'));

  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-3">
            <AppLogo />
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {AREA[role]}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="hidden text-sm leading-tight sm:block">
              <p className="font-medium">{user.name}</p>
              <p className="text-muted-foreground capitalize">{user.role}</p>
            </div>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Log out">
                <LogOut />
                <span className="hidden sm:inline">Log out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
