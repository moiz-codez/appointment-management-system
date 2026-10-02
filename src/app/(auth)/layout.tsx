import { AppLogo } from '@/components/app-logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <div className="flex flex-col items-center gap-2 text-center">
        <AppLogo />
        <p className="max-w-xs text-sm text-muted-foreground">
          Book appointments, take a queue token and track your turn from your phone.
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
