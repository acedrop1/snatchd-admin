"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import {
    Users, Loader2, Search, Phone, Mail, Calendar, ShoppingBag, ChevronDown, ChevronUp
} from "lucide-react";

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            setCustomers(docs);
            setLoading(false);
            setError(null);
        }, (err) => {
            console.error("Customers listener error:", err);
            setError(err.message);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filtered = customers.filter((c) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (c.fullName ?? "").toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            (c.phoneNumber ?? "").toLowerCase().includes(q)
        );
    });

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
                <p className="text-red-400 text-sm font-medium">Failed to load customers</p>
                <p className="text-neutral-500 text-xs max-w-sm text-center">{error}</p>
                <p className="text-neutral-600 text-xs">Check that Firestore rules are deployed and you are signed in.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Customers</h2>
                    <p className="text-neutral-400">All registered customer accounts, updated in real time.</p>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <KpiCard label="Total Customers" value={String(customers.length)} sub="registered accounts" />
                <KpiCard
                    label="This Week"
                    value={String(customers.filter((c) => {
                        const d = c.createdAt?.toDate?.() ?? new Date(0);
                        return (Date.now() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
                    }).length)}
                    sub="new sign-ups"
                />
                <KpiCard
                    label="With Phone"
                    value={String(customers.filter((c) => c.phoneNumber).length)}
                    sub="verified numbers"
                />
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 rounded-lg bg-neutral-900 border border-neutral-800 px-4 py-2.5 max-w-sm">
                <Search className="h-4 w-4 text-neutral-500 shrink-0" />
                <input
                    type="text"
                    placeholder="Search by name, email, or phone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent text-white text-sm outline-none w-full placeholder:text-neutral-600"
                />
            </div>

            {/* Customer List */}
            {filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                    <Users className="h-8 w-8 text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-400 text-sm">
                        {search ? "No customers match your search" : "No customers yet"}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((customer) => (
                        <CustomerRow
                            key={customer.id}
                            customer={customer}
                            isExpanded={expandedId === customer.id}
                            onToggle={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── KPI Card ───────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <p className="text-sm text-neutral-400">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            <p className="text-xs text-neutral-500 mt-1">{sub}</p>
        </div>
    );
}

// ── Customer Row ───────────────────────────────────────────────────────────

function CustomerRow({
    customer,
    isExpanded,
    onToggle,
}: {
    customer: any;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const createdAt = customer.createdAt?.toDate?.() ?? null;
    const dateStr = createdAt
        ? createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "Unknown";
    const initials = getInitials(customer.fullName ?? customer.firstName ?? "?");

    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
            {/* Summary row */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-colors"
            >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-semibold">{initials}</span>
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">
                        {customer.fullName || `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Unnamed Customer"}
                    </p>
                    <p className="text-neutral-500 text-xs truncate">{customer.email || "No email"}</p>
                </div>

                {/* Joined date */}
                <div className="text-right shrink-0 hidden sm:block">
                    <p className="text-neutral-500 text-xs">Joined</p>
                    <p className="text-white text-xs font-medium">{dateStr}</p>
                </div>

                {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-neutral-500 shrink-0" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-neutral-500 shrink-0" />
                )}
            </button>

            {/* Expanded detail */}
            {isExpanded && (
                <div className="border-t border-neutral-800 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow icon={Mail} label="Email" value={customer.email || "—"} />
                    <InfoRow icon={Phone} label="Phone" value={customer.phoneNumber || "—"} />
                    <InfoRow icon={Calendar} label="Joined" value={dateStr} />
                    <InfoRow
                        icon={ShoppingBag}
                        label="User ID"
                        value={customer.uid || customer.id}
                        mono
                    />
                </div>
            )}
        </div>
    );
}

function InfoRow({
    icon: Icon,
    label,
    value,
    mono = false,
}: {
    icon: any;
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <Icon className="h-4 w-4 text-neutral-500 mt-0.5 shrink-0" />
            <div>
                <p className="text-neutral-500 text-xs">{label}</p>
                <p className={`text-white text-sm ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
            </div>
        </div>
    );
}

function getInitials(name: string): string {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}
