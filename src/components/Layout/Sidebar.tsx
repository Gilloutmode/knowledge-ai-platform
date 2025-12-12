import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Link,
  Sparkles,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Plus,
} from "lucide-react";

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  notificationCount?: number;
}

const mainNavItems: NavItem[] = [
  {
    id: "dashboard",
    path: "/",
    label: "Dashboard",
    icon: <LayoutDashboard size={20} />,
  },
  {
    id: "contents",
    path: "/contents",
    label: "Contents",
    icon: <FileText size={20} />,
  },
  {
    id: "sources",
    path: "/sources",
    label: "Sources",
    icon: <Link size={20} />,
  },
  {
    id: "analyses",
    path: "/analyses",
    label: "Analyses",
    icon: <Sparkles size={20} />,
  },
  {
    id: "chat",
    path: "/chat",
    label: "Chat",
    icon: <MessageSquare size={20} />,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ notificationCount = 0 }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const NavButton: React.FC<{ item: NavItem }> = ({ item }) => {
    return (
      <NavLink
        to={item.path}
        className={({ isActive }) => `
          group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
          transition-all duration-200 ease-out
          ${
            isActive
              ? "bg-gradient-to-r from-lime/20 to-lime/5 dark:text-white text-gray-900"
              : "dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-700 hover:bg-light-300"
          }
        `}
      >
        {({ isActive }) => (
          <>
            {/* Active indicator */}
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-lime rounded-r-full" />
            )}

            {/* Icon */}
            <span
              className={`flex-shrink-0 ${isActive ? "dark:text-lime text-lime-dark" : "dark:group-hover:text-lime group-hover:text-lime-dark"}`}
            >
              {item.icon}
            </span>

            {/* Label */}
            {!isCollapsed && (
              <span className="font-medium text-sm truncate">{item.label}</span>
            )}

            {/* Badge */}
            {item.badge && item.badge > 0 && !isCollapsed && (
              <span className="ml-auto bg-lime text-black text-xs font-semibold px-2 py-0.5 rounded-full">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    );
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen dark:bg-dark-900 bg-light-100 border-r dark:border-dark-border border-light-border
        flex flex-col transition-all duration-300 ease-out z-50
        ${isCollapsed ? "w-[72px]" : "w-[260px]"}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b dark:border-dark-border border-light-border">
        <NavLink to="/" className="flex items-center gap-3">
          {/* Logo Icon */}
          <div className="w-9 h-9 bg-gradient-to-br from-lime to-cyan rounded-xl flex items-center justify-center">
            <span className="text-black font-bold text-lg">K</span>
          </div>

          {!isCollapsed && (
            <span className="font-semibold dark:text-white text-gray-900 tracking-tight">
              Knowledge AI
            </span>
          )}
        </NavLink>

        {/* Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Déplier le menu" : "Replier le menu"}
          className="p-1.5 rounded-lg dark:hover:bg-dark-700 hover:bg-light-300 dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Quick Action */}
      {!isCollapsed && (
        <div className="px-4 py-4">
          <button
            onClick={() => navigate("/add-source")}
            className="
              w-full flex items-center justify-center gap-2 py-2.5 px-4
              bg-lime hover:bg-lime-hover text-black font-medium text-sm
              rounded-xl transition-all duration-200
              hover:shadow-lime-glow
            "
          >
            <Plus size={18} />
            <span>Ajouter une source</span>
          </button>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* Main Section */}
        <div className="mb-6">
          {!isCollapsed && (
            <p className="px-3 mb-2 text-xs font-medium dark:text-gray-500 text-gray-400 uppercase tracking-wider">
              Main
            </p>
          )}
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom Section */}
      <div className="px-3 py-4 border-t dark:border-dark-border border-light-border space-y-1">
        {/* Notifications */}
        <NavLink
          to="/notifications"
          className={({ isActive }) => `
            group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            transition-all duration-200 ease-out
            ${
              isActive
                ? "dark:bg-dark-700 bg-light-300 dark:text-white text-gray-900"
                : "dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-700 hover:bg-light-300"
            }
          `}
        >
          <span className="relative flex-shrink-0">
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-lime text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </span>
          {!isCollapsed && (
            <span className="font-medium text-sm">Notifications</span>
          )}
        </NavLink>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) => `
            group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            transition-all duration-200 ease-out
            ${
              isActive
                ? "dark:bg-dark-700 bg-light-300 dark:text-white text-gray-900"
                : "dark:text-gray-400 text-gray-600 dark:hover:text-white hover:text-gray-900 dark:hover:bg-dark-700 hover:bg-light-300"
            }
          `}
        >
          <Settings size={20} />
          {!isCollapsed && (
            <span className="font-medium text-sm">Paramètres</span>
          )}
        </NavLink>

        {/* Logout */}
        <button
          aria-label="Déconnexion"
          className="
            group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            dark:text-gray-400 text-gray-600 hover:text-red-400 hover:bg-red-500/10
            transition-all duration-200 ease-out
          "
        >
          <LogOut size={20} />
          {!isCollapsed && (
            <span className="font-medium text-sm">Déconnexion</span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
