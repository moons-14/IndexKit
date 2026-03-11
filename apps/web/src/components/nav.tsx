"use client";

import { BookOpen, Home, LogOut, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Nav() {
  const { data: session } = useSession();
  const pathname = usePathname();


  const navLinks = [
    { href: "/", label: "Library", icon: Home },
    { href: "/authors", label: "Authors", icon: Users },
    { href: "/settings/libraries", label: "Settings", icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BookOpen className="h-5 w-5" />
          <span>IndexKit</span>
        </Link>

        <Separator orientation="vertical" className="h-6" />

        <nav className="flex items-center gap-1">
          {navLinks.map(({ href, label, icon: Icon }) => (
            <Button
              key={href}
              variant={pathname === href || (href !== "/" && pathname.startsWith(href)) ? "secondary" : "ghost"}
              size="sm"
              asChild
            >
              <Link href={href} className="flex items-center gap-1.5">
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {session?.user && (
            <>
              <span className="text-sm text-muted-foreground hidden sm:block">
                {session.user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="gap-1.5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
