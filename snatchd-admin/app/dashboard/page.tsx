"use client";

import { BarChart3, TrendingUp, DollarSign, Package } from "lucide-react";
import { useState } from "react";

export default function DashboardPage() {
    const [isChecking, setIsChecking] = useState(false);
    const [checkResult, setCheckResult] = useState<any>(null);

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
                <KpiCard title="Total Revenue" value="$45,231.89" change="+20.1% from last month" icon={DollarSign} />
                <KpiCard title="Active Orders" value="+573" change="+201 since last hour" icon={Package} />
                <KpiCard title="Products Active" value="12,234" change="+19 new added today" icon={BarChart3} />
                <KpiCard title="Growth Rate" value="+12.5%" change="+4.1% from last week" icon={TrendingUp} />
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

            {/* Additional Sections (Placeholders) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <div className="col-span-4 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white mb-4">Revenue Over Time</h3>
                    <div className="h-[200px] flex items-center justify-center text-neutral-500 text-sm italic">
                        [Graph Component Loading...]
                    </div>
                </div>
                <div className="col-span-3 rounded-xl border border-white/10 bg-neutral-900/50 p-6">
                    <h3 className="font-semibold text-white mb-4">Recent Sales</h3>
                    <div className="space-y-4">
                        <SaleItem name="Nike Air Force 1" amount="$120.00" time="2m ago" />
                        <SaleItem name="Aesop Hand Wash" amount="$45.00" time="15m ago" />
                        <SaleItem name="Supreme T-Shirt" amount="$55.00" time="42m ago" />
                        <SaleItem name="Kith Hoodie" amount="$160.00" time="1h ago" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ title, value, change, icon: Icon }: any) {
    return (
        <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 backdrop-blur-sm">
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <span className="text-sm font-medium text-neutral-400">{title}</span>
                <Icon className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            <p className="text-xs text-neutral-500 mt-1">{change}</p>
        </div>
    )
}

function SaleItem({ name, amount, time }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-xs text-white">U</span>
                </div>
                <div>
                    <p className="text-sm font-medium text-white">{name}</p>
                    <p className="text-xs text-neutral-500">User via iOS • {time}</p>
                </div>
            </div>
            <div className="font-medium text-white">{amount}</div>
        </div>
    )
}
