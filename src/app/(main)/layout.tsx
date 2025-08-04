import LayoutShell from "../components/LayoutShell";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <LayoutShell>{children}</LayoutShell>;
}
