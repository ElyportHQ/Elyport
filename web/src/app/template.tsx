/** Re-mounts on every navigation, so each page arrives with the "through the gate" transition. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="portal-enter">{children}</div>;
}
