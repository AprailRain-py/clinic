import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./screening.css";

const ipSans = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--ip-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ipMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--ip-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

// Scopes the screening module's distinct teal + IBM Plex look. The wrapper sets
// the fonts and the screening token set; nothing leaks into the rest of the app.
export default function ScreeningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${ipSans.variable} ${ipMono.variable} screening-root`}>
      {children}
    </div>
  );
}
