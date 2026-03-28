"use client";

import { BarChart3, TrendingUp, DollarSign, Package, ShoppingBag, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    Timestamp,
} from "firebase/firestore";

interface KpiData {
    totalRevenue: number;
    activeOrdersCount: number;
    productsCount: number;
    totalCustomers: number;
}

interface RecentOrder {
    id: string;
    orderNumber: string;
    total: number;
    createdAt: Date;
    storeSummary: string;
}

export default function DashboardPage() {
    const [isChecking, setIsChecking] = useState(false);
    const [checkResult, setCheckResult] = useState<any>(null);
    const [kpis, setKpis] = useState<KpiData | null>(null);
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
    const [loadingKpis, setLoadingKpis] = useState(true);

    useEffect(() => {
        // ── Active Orders (real-time) ──────────────────────────────────────
        const activeOrdersQuery = query(
            collection(db, "orders"),
            where("isActive", "==", true)
        );
        const unsubActive = onSnapshot(activeOrdersQuery, (snap) => {
            setKpis((prev) => ({ ...(prev ?? { totalRevenue: 0, activeOrdersCount: 0, productsCount: 0, totalCustomers: 0 }), activeOrdersCount: snap.size }));
        });

        // ── Total Revenue + Recent Orders (real-time) ─────────────────────
        const recentOrdersQuery = query(
            collection(db, "orders"),
            orderBy("createdAt", "desc"),
            limit(50)
        );
        const unsubOrders = onSnapshot(recentOrdersQuery, (snap) => {
            let revenue = 0;
            const recent: RecentOrder[] = [];
            snap.forEach((doc) => {
                const data = doc.data();
                revenue += data.total ?? 0;
                if (recent.length < 6) {
                    const rawItems: any[] = data.items ?? [];
                    const storeNames: string[] = Array.from(
                        new Set(rawItems.map((i: any) => i.storeName as string).filter(Boolean))
                    ).sort();
                    let storeSummary = "Snatchd Order";
                    if (storeNames.length === 1) storeSummary = storeNames[0];
                    else if (storeNames.length === 2) storeSummary = `${storeNames[0]}, ${storeNames[1]}`;
                    else if (storeNames.length > 2) storeSummary = `${storeNames[0]}, ${storeNames[1]} +${storeNames.length - 2} other${storeNames.length - 2 > 1 ? "s" : ""}`;

                    recent.push({
                        id: doc.id,
                        orderNumber: data.orderNumber ?? doc.id.slice(0, 6).toUpperCase(),
                        total: data.total ?? 0,
                        createdAt: (data.createdAt as Timestamp)?.toDate() ?? new Date(),
                        storeSummary,
                    });
                }
            });
            setRecentOrders(recent);
            setKpis((prev) => ({ ...(prev ?? { totalRevenue: 0, activeOrdersCount: 0, productsCount: 0, totalCustomers: 0 }), totalRevenue: revenue }));
        });

        // ── Products count (one-time) ──────────────────────────────────────
        getDocs(collection(db, "products")).then((snap) => {
            setKpis((prev) => ({ ...(prev ?? { totalRevenue: 0, activeOrdersCount: 0, productsCount: 0, totalCustomers: 0 }), productsCount: snap.size }));
        });

        // ── Customers count (one-time) ─────────────────────────────────────
        getDocs(collection(db, "users")).then((snap) => {
            setKpis((prev) => ({ ...(prev ?? { totalRevenue: 0, activeOrdersCount: 0, productsCount: 0, totalCustomers: 0 }), totalCustomers: snap.size }));
            setLoadingKpis(false);
        });

        return () => {
            unsubActive();
            unsubOrders();
        };
    }, []);

    const handleStockCheck = async () => {
        setIsChecking(true);
        setCheckResult(null);
        try {
            const response = await fetch('https://us-central1-snatchd-app26.cloudfunctions.net/updateZaraSohoStock', {
                method: 'POST',
            });
            const data = await response.json();
            setCheckResult(data);
        } catch (error: any) {
            setCheckResult({ error: error.message });
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Overview</h2>
                    <p className="text-neutral-400">Live metrics from your NYC operations.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleStockCheck}
                        disabled={isChecking}
                        className="px-4 py-2 bg-white rounded-md text-sm font-medium text-black hover:bg-neutral-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isChecking ? 'Checking Stock...' : 'Check Zara SoHo Stock'}
                    </button>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                    title="Total Revenue"
                    value={loadingKpis ? "..." : `$${(kpis?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    change="From all completed orders"
                    icon={DollarSign}
                    loading={loadingKpis}
                />
                <KpiCard
                    title="Active Orders"
                    value={loadingKpis ? "..." : String(kpis?.activeOrdersCount ?? 0)}
                    change="Currently in progress"
                    icon={Package}
                    loading={loadingKpis}
                />
                <KpiCard
                    title="Products Active"
                    value={loadingKpis ? "..." : (kpis?.productsCount ?? 0).toLocaleString()}
                    change="Total in catalogue"
                    icon={BarChart3}
                    loading={loadingKpis}
                />
                <KpiCard
                    title="Total Customers"
                    value={loadingKpis ? "..." : (kpis?.totalCustomers ?? 0).toLocaleString()}
                    change="Registered users"
                    icon={Users}
                    loading={loadingKpis}
                />
            </div>

            {/* Stock Check Result */}
            {checkResult && (
                <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white mb-4">Stock Check Result</h3>
                    {checkResult.error ? (
                        <p className="text-red-400">Error: {checkResult.error}</p>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-green-400">✅ Success! Updated {checkResult.updatedCount} products</p>
                            <details className="text-neutral-400 text-sm">
                                <summary className="cursor-pointer hover:text-white">View Details</summary>
                                <pre className="mt-2 p-4 bg-black/50 rounded overflow-auto max-h-60">
                                    {JSON.stringify(checkResult.details, null, 2)}
                                </pre>
                            </details>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white mb-4">Revenue Over Time</h3>
                    <div className="h-[200px] flex items-center justify-center text-neutral-500 text-sm italic">
                        [Graph Component Loading...]
                    </div>
                </div>
                <div className="col-span-3 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white mb-4">Recent Orders</h3>
                    <div className="space-y-4">
                        {recentOrders.length === 0 ? (
                            <p className="text-neutral-500 text-sm italic">No recent orders</p>
                        ) : (
                            recentOrders.map((order) => (
                                <SaleItem
                                    key={order.id}
                                    name={order.orderNumber}
                                    subtitle={order.storeSummary}
                                    amount={`$${order.total.toFixed(2)}`}
                                    time={timeAgo(order.createdAt)}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, change, icon: Icon, loading }: any) {
    return (
        <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-sm font-medium text-neutral-400">{title}</span>
                <Icon className="h-4 w-4 text-neutral-400" />
            </div>
            <div className={`text-2xl font-bold ${loading ? "text-neutral-600 animate-pulse" : "text-white"}`}>{value}</div>
            <p className="text-xs text-neutral-500 mt-1">{change}</p>
        </div>
    );
}

function SaleItem({ name, subtitle, amount, time }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-white" />
                </div>
                <div>
                    <p className="text-sm font-medium text-white">{name}</p>
                    <p className="text-xs text-neutral-500">{subtitle} • {time}</p>
                </div>
            </div>
            <div className="font-medium text-white">{amount}</div>
        </div>
    );
}

function timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}
