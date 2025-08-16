"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  Calendar,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Inbox",
    href: "/inbox",
    icon: MessageSquare,
  },
  {
    name: "Sessions",
    href: "/sessions",
    icon: Users,
  },
  {
    name: "Calendar",
    href: "/settings/organization",
    icon: Calendar,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="glass flex h-full w-64 flex-col border-r border-border/30">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <h1 className="text-xl font-bold text-foreground">Qify</h1>
      </div>

      <Separator className="bg-border/30" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Button
              key={item.name}
              asChild
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start glass-hover",
                isActive && "bg-primary/10 text-primary"
              )}
            >
              <Link href={item.href}>
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
            </Button>
          );
        })}
      </nav>

      <Separator className="bg-border/30" />

      {/* Footer */}
      <div className="p-4">
        <div className="glass p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Connected</span>
          </div>
        </div>
      </div>
    </div>
  );
}