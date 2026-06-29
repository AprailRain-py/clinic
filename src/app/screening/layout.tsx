import "./screening.css";

// The screening module lives inside the main app shell and inherits the app's
// fonts/tokens (set on <html> by the root layout). This wrapper only scopes the
// screening-specific component classes under .screening-root. Individual pages
// render the shared AppShell header/footer so screening feels like one product.
export default function ScreeningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="screening-root">{children}</div>;
}
