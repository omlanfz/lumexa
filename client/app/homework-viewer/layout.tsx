import RoleShell from '@/components/RoleShell';

// The signed-in person's own navigation bar stays on the file viewer — see RoleShell.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleShell>{children}</RoleShell>;
}
