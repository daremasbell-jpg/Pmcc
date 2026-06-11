export const metadata = {
  title: "PMCC Analyzer",
  description: "Free real-time Poor Man's Covered Call analyzer powered by Yahoo Finance.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#0a0c10', color: '#fff', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
