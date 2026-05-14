import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/ui/BottomNav";
import { Disclaimer } from "@/components/ui/Disclaimer";
import { MuteButton } from "@/components/ui/MuteButton";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { DisclaimerModal } from "@/components/ui/DisclaimerModal";
import { createClient } from "@/lib/supabase/server";
import { APP_NAME } from "@/lib/config";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Your personal health companion",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <html lang="en" className="h-full">
      <body className="font-sans bg-gray-50 text-gray-900 antialiased min-h-full">
        <OfflineBanner />
        <DisclaimerModal />
        <div className="flex flex-col min-h-screen max-w-lg mx-auto relative">
          <main className={`flex-1 flex flex-col ${isLoggedIn ? "pb-36" : ""}`}>
            {children}
          </main>
          <div
            className={
              isLoggedIn
                ? "fixed bottom-16 left-0 right-0 z-40 max-w-lg mx-auto w-full"
                : "mt-auto"
            }
          >
            <Disclaimer />
          </div>
          {isLoggedIn && <BottomNav />}
          {isLoggedIn && <MuteButton />}
        </div>
      </body>
    </html>
  );
}
