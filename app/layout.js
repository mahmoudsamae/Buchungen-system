import "./globals.css";
import { LanguageProvider } from "@/components/i18n/language-provider";

export const metadata = {
  title: "BookFlow Platform",
  description: "Premium multi-business appointment booking UI"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
