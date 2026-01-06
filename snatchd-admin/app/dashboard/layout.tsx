"use client";

import { Layers, Package, ShoppingBag, BarChart3, Users, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push(`/?redirect=${encodeURIComponent(pathname)}`);
        }
    }, [user, loading, router, pathname]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black text-white">
                <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                    <p className="mt-4 text-neutral-400">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="flex h-screen bg-black text-white">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-neutral-950/50 p-6 hidden md:block flex flex-col">
                <div className="flex items-center justify-center mb-10">
                    <div className="relative h-12 w-full">
                        <Image
                            src="/snatchd_logo.png"
                            alt="Snatchd"
                            fill
                            className="object-contain"
                            priority
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    </div>
                </div>

                <nav className="space-y-1 flex-1">
                    <NavItem href="/dashboard" icon={BarChart3} label="Overview" active={pathname === "/dashboard"} />
                    <NavItem href="/dashboard/stores" icon={Layers} label="Stores" active={pathname?.startsWith("/dashboard/stores")} />
                    <NavItem href="/dashboard/products" icon={Package} label="Products" active={pathname?.startsWith("/dashboard/products")} />
                    <NavItem href="/dashboard/orders" icon={ShoppingBag} label="Orders" active={pathname?.startsWith("/dashboard/orders")} />
                    <NavItem href="/dashboard/customers" icon={Users} label="Customers" active={pathname?.startsWith("/dashboard/customers")} />
                    <div className="pt-8">
                        <NavItem href="/dashboard/settings" icon={Settings} label="Settings" active={pathname?.startsWith("/dashboard/settings")} />
                    </div>
                </nav>

                {/* User Info & Logout */}
                <div className="pt-4 border-t border-white/10">
                    <div className="px-3 py-2 mb-2">
                        <p className="text-xs text-neutral-500 mb-1">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-400 hover:bg-neutral-900 hover:text-white transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-black p-8">
                {children}
            </main>
        </div>
    );
}

function NavItem({ icon: Icon, label, href, active = false }: { icon: any; label: string; href: string; active?: boolean }) {
    return (
        <Link
            href={href}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
            }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </Link>
    );
}
