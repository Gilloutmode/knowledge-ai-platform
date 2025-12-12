import React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface LayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  notificationCount?: number;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  pageTitle,
  notificationCount = 0,
}) => {
  return (
    <div className="min-h-screen dark:bg-black bg-light-200 transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar notificationCount={notificationCount} />

      {/* Main Content */}
      <div className="ml-[260px] min-h-screen transition-all duration-300">
        {/* Header */}
        <Header title={pageTitle} notificationCount={notificationCount} />

        {/* Page Content */}
        <main className="p-6">{children}</main>
      </div>

      {/* Background Gradient Effects - Dark mode only */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden dark:block hidden">
        {/* Top right glow */}
        <div
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(171,244,63,0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Bottom left glow */}
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(63,244,229,0.3) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>
    </div>
  );
};

export default Layout;
