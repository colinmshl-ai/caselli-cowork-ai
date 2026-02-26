import { NavLink, useLocation, Outlet } from "react-router-dom";
import { MessageSquare, FileText, Users, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

const navItems = [
  { to: "/chat", icon: MessageSquare, label: "Chat" },
  { to: "/deals", icon: FileText, label: "Deals" },
  { to: "/contacts", icon: Users, label: "Contacts" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const AppLayout = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const initial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() ?? "?";

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop nav rail */}
      <nav className="hidden md:flex flex-col items-center border-r border-border w-[52px] min-w-[52px] py-5">
        <span className="text-sm font-semibold text-foreground tracking-tight mb-8">
          C
        </span>

        <div className="flex flex-col items-center gap-6 flex-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <Tooltip key={to}>
              <TooltipTrigger asChild>
                <NavLink to={to} className="flex items-center justify-center">
                  <Icon
                    size={20}
                    className={`transition-colors ${
                      isActive(to) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                {label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-medium text-foreground">
                {initial}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {user?.user_metadata?.full_name || user?.email}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={signOut}
                className="flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut size={18} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Sign out
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 pb-14 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around border-t border-border bg-background h-14">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] py-1"
          >
            <Icon
              size={20}
              className={`transition-colors ${
                isActive(to) ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <span
              className={`text-[10px] ${
                isActive(to) ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default AppLayout;
