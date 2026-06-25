import "./globals.css";

export const metadata = {
  title: "PMU Matching",
  description: "ระบบจับคู่โครงการกับแหล่งทุน",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th" data-theme="light">
      <body>{children}</body>
    </html>
  );
}