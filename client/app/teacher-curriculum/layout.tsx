import RoleShell from '@/components/RoleShell';

// The signed-in person's own navigation bar (student, teacher or admin) stays
// on screen on this route — see RoleShell.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleShell>{children}</RoleShell>;
}
