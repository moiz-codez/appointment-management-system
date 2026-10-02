import { Ticket } from 'lucide-react';

// App mark + name, used in the header and on the auth pages.
export function AppLogo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Ticket className="size-4" aria-hidden />
      </span>
      <span className="truncate font-semibold">Queue &amp; Appointments</span>
    </div>
  );
}
