import RoleShell from '@/components/RoleShell';

// Teachers and admins keep their navigation bar on the test page (they are
// monitoring it). A student sitting the test gets it without the bar: it opens
// in its own tab precisely so nothing else is on screen while they work.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <RoleShell hideFor={['STUDENT']}>{children}</RoleShell>;
}
