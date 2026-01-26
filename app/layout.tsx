import "./globals.css"
import Header from "../components/header"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body cz-shortcut-listen="true">
            {children}
      </body>
    </html>
  );
}
