import React from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex" dir="rtl">
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <AppHeader />
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6 lg:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
