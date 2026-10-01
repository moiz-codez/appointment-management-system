import { AppShell } from '@/components/app-shell';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="staff">{children}</AppShell>;
}
