"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, query, orderBy } from "firebase/firestore";
import { ShoppingBag, Loader2, ChevronDown, ChevronUp, Clock, CheckCircle, Truck, Package, MapPin, User, Phone } from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    placed:     { label: "Order Placed",  color: "bg-yellow-500/15 text-yellow-300 border-yellow-500/20",  icon: <Package className="h-3 w-3" /> },
    confirmed:  { label: "Confirmed",     color: "bg-blue-500/15 text-blue-300 border-blue-500/20",        icon: <CheckCircle className="h-3 w-3" /> },
    in_transit: { label: "On the Way",    color: "bg-orange-500/15 text-orange-300 border-orange-500/20",  icon: <Truck className="h-3 w-3" /> },
    delivered:  { label: "Delivered",     color: "bg-green-500/15 text-green-300 border-green-500/20",     icon: <CheckCircle className="h-3 w-3" /> },
    cancelled:  { label: "Cancelled",     color: "bg-red-500/15 text-red-300 border-red-500/20",           icon: <Clock className="h-3 w-3" /> },
};

const STATUS_FLOW = ["placed", "confirmed", "in_transit", "delivered"];

// The 6-step tracking flow the customer sees in the app
const TRACKING_STEPS: { value: string; label: string; emoji: string }[] = [
    { value: "headed_to_store", label: "Headed to Store",  emoji: "🚗" },
    { value: "shopping",        label: "Shopping",          emoji: "🛍️" },
    { value: "checking_out",    label: "Checking Out",      emoji: "💳" },
    { value: "on_the_way",      label: "On the Way",        emoji: "🏎️" },
    { value: "almost_there",    label: "Almost There!",     emoji: "📍" },
    { value: "delivered",       label: "Delivered",         emoji: "✅" },
];

const FILTER_OPTIONS = [
    { value: "all",       label: "All Orders" },
    { value: "placed",    label: "Order Placed" },
    { value: "confirmed", label: "Confirmed" },
    { value: "in_transit",label: "On the Way" },
    { value: "delivered", label: "Delivered" },
];

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setOrders(docs);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Orders listener error:", err);
            setError(err.message);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    async function updateStatus(orderId: string, newStatus: string) {
        setUpdatingId(orderId);
        try {
            await updateDoc(doc(db, "orders", orderId), { status: newStatus });
        } catch (e) {
            console.error("Failed to update order status:", e);
        } finally {
            setUpdatingId(null);
        }
    }

    async function updateTracking(orderId: string, fields: Record<string, string>) {
        setUpdatingId(orderId);
        try {
            await updateDoc(doc(db, "orders", orderId), fields);
        } catch (e) {
            console.error("Failed to update tracking:", e);
        } finally {
            setUpdatingId(null);
        }
    }

    const filtered = statusFilter === "all"
        ? orders
        : orders.filter((o) => o.status === statusFilter);

    // KPIs
    const totalRevenue = orders
        .filter(o => o.status !== "cancelled")
        .reduce((sum, o) => sum + (o.total ?? 0), 0);
    const activeCount = orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length;
    const deliveredCount = orders.filter(o => o.status === "delivered").length;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <p className="text-red-400 text-sm font-medium">Failed to load orders</p>
                <p className="text-neutral-500 text-xs max-w-sm text-center">{error}</p>
                <p className="text-neutral-600 text-xs">Make sure Firestore rules are deployed and you are signed in.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Orders</h2>
                <p className="text-neutral-400">Manage and update customer orders in real time.</p>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} sub={`${orders.length} total orders`} />
                <KpiCard label="Active Orders" value={String(activeCount)} sub="pending fulfillment" />
                <KpiCard label="Delivered" value={String(deliveredCount)} sub="completed orders" />
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap">
                {FILTER_OPTIONS.map((opt) => {
                    const count = opt.value === "all"
                        ? orders.length
                        : orders.filter(o => o.status === opt.value).length;
                    return (
                        <button
                            key={opt.value}
                            onClick={() => setStatusFilter(opt.value)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                                statusFilter === opt.value
                                    ? "bg-white text-black border-white"
                                    : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-600"
                            }`}
                        >
                            {opt.label}
                            <span className="ml-1.5 opacity-60">{count}</span>
                        </button>
                    );
                })}
            </div>

            {/* Orders List */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                    <ShoppingBag className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-400 text-sm">No orders found</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((order) => (
                        <OrderRow
                            key={order.id}
                            order={order}
                            isExpanded={expandedId === order.id}
                            isUpdating={updatingId === order.id}
                            onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
                            onStatusChange={(s) => updateStatus(order.id, s)}
                            onTrackingUpdate={(fields) => updateTracking(order.id, fields)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── KPI Card ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <p className="text-sm text-neutral-400">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            <p className="text-xs text-neutral-500 mt-1">{sub}</p>
        </div>
    );
}

// ── Order Row ──────────────────────────────────────────────────────────

function OrderRow({
    order,
    isExpanded,
    isUpdating,
    onToggle,
    onStatusChange,
    onTrackingUpdate,
}: {
    order: any;
    isExpanded: boolean;
    isUpdating: boolean;
    onToggle: () => void;
    onStatusChange: (s: string) => void;
    onTrackingUpdate: (fields: Record<string, string>) => void;
}) {
    const meta = STATUS_META[order.status] ?? STATUS_META["placed"];
    const createdAt = order.createdAt?.toDate?.() ?? new Date();
    const dateStr = createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const timeStr = createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const items: any[] = order.items ?? [];
    const storeNames: string[] = [...new Set<string>(items.map((i: any) => i.storeName))];
    const storeSummary = storeNames.length === 0
        ? "Snatchd Order"
        : storeNames.length === 1
        ? storeNames[0]
        : storeNames.length === 2
        ? `${storeNames[0]}, ${storeNames[1]}`
        : `${storeNames[0]}, ${storeNames[1]} +${storeNames.length - 2} other${storeNames.length - 2 > 1 ? "s" : ""}`;

    const currentIdx = STATUS_FLOW.indexOf(order.status);

    // Local driver info state (initialized from Firestore data)
    const [driverName, setDriverName] = useState<string>(order.driverName ?? "");
    const [driverPhone, setDriverPhone] = useState<string>(order.driverPhone ?? "");
    const [driverSaved, setDriverSaved] = useState(false);

    // Update local state if order data changes (e.g. from snapshot)
    useEffect(() => {
        setDriverName(order.driverName ?? "");
        setDriverPhone(order.driverPhone ?? "");
    }, [order.driverName, order.driverPhone]);

    const currentTrackingStep = TRACKING_STEPS.findIndex(s => s.value === order.trackingStatus);

    function saveDriverInfo() {
        onTrackingUpdate({ driverName, driverPhone });
        setDriverSaved(true);
        setTimeout(() => setDriverSaved(false), 2000);
    }

    function setTrackingStatus(value: string) {
        // Also auto-advance order status based on tracking
        const updates: Record<string, string> = { trackingStatus: value };
        if (value === "headed_to_store" || value === "shopping" || value === "checking_out") {
            updates.status = "confirmed";
        } else if (value === "on_the_way" || value === "almost_there") {
            updates.status = "in_transit";
        } else if (value === "delivered") {
            updates.status = "delivered";
        }
        onTrackingUpdate(updates);
    }

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
            {/* Summary Row */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors"
            >
                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${meta.color} shrink-0`}>
                    {meta.icon}
                    {meta.label}
                </span>

                {/* Store + order number */}
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{storeSummary}</p>
                    <p className="text-neutral-500 text-xs">{order.orderNumber} · {dateStr} at {timeStr}</p>
                </div>

                {/* Total */}
                <span className="text-white font-bold text-sm shrink-0">
                    ${(order.total ?? 0).toFixed(2)}
                </span>

                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-neutral-500 shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-500 shrink-0" />
                )}
            </button>

            {/* Expanded Detail */}
            {isExpanded && (
                <div className="border-t border-neutral-800 p-5 space-y-6">
                    {/* Delivery address */}
                    <div className="flex items-start gap-2 text-sm text-neutral-400">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{order.deliveryAddress || "No address"}</span>
                    </div>

                    {/* Items */}
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Items ({items.length})</p>
                        <div className="space-y-2">
                            {items.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-3">
                                    {item.productImageURL ? (
                                        <img
                                            src={item.productImageURL}
                                            alt={item.productTitle}
                                            className="w-10 h-10 rounded-lg object-cover bg-neutral-800"
                                        />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                                            <ShoppingBag className="h-4 w-4 text-neutral-600" />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-sm font-medium truncate">{item.productTitle}</p>
                                        <p className="text-neutral-500 text-xs">{item.productBrand} · {item.storeName} · Size {item.selectedSize} · Qty {item.quantity}</p>
                                    </div>
                                    <span className="text-white text-sm font-semibold">${(item.productPrice * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Price breakdown */}
                    <div className="rounded-lg bg-neutral-800/50 p-4 space-y-2 text-sm">
                        <PriceRow label="Subtotal"     value={order.subtotal} />
                        <PriceRow label="Delivery Fee" value={order.deliveryFee} />
                        <PriceRow label="Tax"          value={order.tax} />
                        <div className="border-t border-neutral-700 pt-2 flex justify-between font-semibold text-white">
                            <span>Total</span>
                            <span>${(order.total ?? 0).toFixed(2)}</span>
                        </div>
                    </div>

                    {/* ── Driver Info ─────────────────────────────────── */}
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Driver / Snatcher Info</p>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2">
                                    <User className="h-4 w-4 text-neutral-500 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Driver name"
                                        value={driverName}
                                        onChange={e => setDriverName(e.target.value)}
                                        className="bg-transparent text-white text-sm outline-none w-full placeholder:text-neutral-600"
                                    />
                                </div>
                                <div className="flex items-center gap-2 flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2">
                                    <Phone className="h-4 w-4 text-neutral-500 shrink-0" />
                                    <input
                                        type="tel"
                                        placeholder="Phone number"
                                        value={driverPhone}
                                        onChange={e => setDriverPhone(e.target.value)}
                                        className="bg-transparent text-white text-sm outline-none w-full placeholder:text-neutral-600"
                                    />
                                </div>
                                <button
                                    onClick={saveDriverInfo}
                                    disabled={isUpdating}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shrink-0 ${
                                        driverSaved
                                            ? "bg-green-600 text-white"
                                            : "bg-white text-black hover:bg-neutral-200"
                                    }`}
                                >
                                    {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : driverSaved ? "Saved ✓" : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Tracking Status (6-step) ─────────────────────── */}
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">
                            Customer Tracking Status
                            {order.trackingStatus && (
                                <span className="ml-2 normal-case text-neutral-400">
                                    — currently: <span className="text-white">{TRACKING_STEPS.find(s => s.value === order.trackingStatus)?.label ?? order.trackingStatus}</span>
                                </span>
                            )}
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {TRACKING_STEPS.map((step, idx) => {
                                const isCurrent = step.value === order.trackingStatus;
                                const isPast = currentTrackingStep >= 0 && idx < currentTrackingStep;
                                return (
                                    <button
                                        key={step.value}
                                        onClick={() => !isCurrent && setTrackingStatus(step.value)}
                                        disabled={isCurrent || isUpdating}
                                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium border transition-all text-left ${
                                            isCurrent
                                                ? "bg-white text-black border-white"
                                                : isPast
                                                ? "bg-neutral-800/30 text-neutral-600 border-neutral-800 opacity-50 cursor-not-allowed"
                                                : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500 hover:text-white cursor-pointer"
                                        }`}
                                    >
                                        <span className="text-base leading-none">{step.emoji}</span>
                                        <span className="leading-tight">{step.label}</span>
                                        {isCurrent && (
                                            <span className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Order Status (high-level) ────────────────────── */}
                    <div>
                        <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Order Status</p>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_FLOW.map((s, idx) => {
                                const m = STATUS_META[s];
                                const isCurrent = s === order.status;
                                const isPast = idx < currentIdx;
                                return (
                                    <button
                                        key={s}
                                        onClick={() => !isCurrent && onStatusChange(s)}
                                        disabled={isCurrent || isUpdating}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                            isCurrent
                                                ? `${m.color} cursor-default ring-1 ring-white/20`
                                                : isPast
                                                ? "bg-neutral-800/50 text-neutral-600 border-neutral-700 cursor-not-allowed opacity-40"
                                                : "bg-neutral-800 text-neutral-300 border-neutral-700 hover:border-neutral-500 hover:text-white cursor-pointer"
                                        }`}
                                    >
                                        {isUpdating && isCurrent
                                            ? <Loader2 className="h-3 w-3 animate-spin" />
                                            : m.icon
                                        }
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PriceRow({ label, value }: { label: string; value?: number }) {
    return (
        <div className="flex justify-between text-neutral-400">
            <span>{label}</span>
            <span>${(value ?? 0).toFixed(2)}</span>
        </div>
    );
}
