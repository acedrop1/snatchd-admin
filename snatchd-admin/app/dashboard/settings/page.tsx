"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Loader2, CheckCircle, FlaskConical } from "lucide-react";
import { db } from "@/lib/firebase";

// Everything the app charges lives in config/fees; the app listens to it live.
export default function SettingsPage() {
    const [standardFee, setStandardFee] = useState("6.00");
    const [priorityFee, setPriorityFee] = useState("6.99");
    const [platformFeePercent, setPlatformFeePercent] = useState("0");
    const [taxRate, setTaxRate] = useState("8.875");
    const [feesLoading, setFeesLoading] = useState(false);
    const [feesSaved, setFeesSaved] = useState(false);

    const [testMode, setTestMode] = useState(false);
    const [testModeLoading, setTestModeLoading] = useState(false);

    useEffect(() => {
        getDoc(doc(db, "config", "fees")).then(snap => {
            const d = snap.data() || {};
            if (d.standardFee != null) setStandardFee(String(d.standardFee));
            if (d.priorityFee != null) setPriorityFee(String(d.priorityFee));
            if (d.platformFeePercent != null) setPlatformFeePercent(String(d.platformFeePercent));
            if (d.taxRate != null) setTaxRate(String(d.taxRate * 100));
        });
        getDoc(doc(db, "config", "app")).then(snap => setTestMode(snap.data()?.testMode ?? false));
    }, []);

    const saveFees = async () => {
        setFeesLoading(true); setFeesSaved(false);
        try {
            await setDoc(doc(db, "config", "fees"), {
                standardFee: parseFloat(standardFee) || 0,
                priorityFee: parseFloat(priorityFee) || 0,
                platformFeePercent: parseFloat(platformFeePercent) || 0,
                taxRate: (parseFloat(taxRate) || 0) / 100,
            }, { merge: true });
            setFeesSaved(true);
        } catch (e: any) { alert("Could not save fees: " + e.message); }
        finally { setFeesLoading(false); }
    };

    const toggleTestMode = async () => {
        setTestModeLoading(true);
        try {
            await setDoc(doc(db, "config", "app"), { testMode: !testMode }, { merge: true });
            setTestMode(!testMode);
        } catch (e: any) { alert("Could not update test mode: " + e.message); }
        finally { setTestModeLoading(false); }
    };

    const field = (label: string, value: string, set: (v: string) => void, hint: string, prefix?: string, suffix?: string) => (
        <div className="grid gap-2">
            <label className="text-sm font-medium text-neutral-300">{label}</label>
            <div className="flex items-center rounded-lg bg-black border border-neutral-800 focus-within:border-white transition">
                {prefix && <span className="pl-4 text-neutral-500">{prefix}</span>}
                <input type="number" step="0.01" min="0" value={value} onChange={e => set(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-white focus:outline-none" />
                {suffix && <span className="pr-4 text-neutral-500">{suffix}</span>}
            </div>
            <p className="text-xs text-neutral-500">{hint}</p>
        </div>
    );

    return (
        <div className="space-y-8 max-w-3xl">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-neutral-400">What customers are charged, and whether payments are real.</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-neutral-900/50 p-6 space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-white">Fees</h3>
                    <p className="text-sm text-neutral-400">Items are always at the store's own price. These are what Snatchd adds. Changes go live in the app instantly.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                    {field("Standard delivery", standardFee, setStandardFee, "Flat, per order.", "$")}
                    {field("Priority delivery", priorityFee, setPriorityFee, "Flat, per order.", "$")}
                    {field("Service fee", platformFeePercent, setPlatformFeePercent, "Percent of the basket. 0 hides the line at checkout.", undefined, "%")}
                    {field("Sales tax", taxRate, setTaxRate, "NYC combined rate is 8.875%.", undefined, "%")}
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={saveFees} disabled={feesLoading}
                        className="px-5 py-2 bg-white text-black rounded-md text-sm font-bold hover:bg-neutral-200 transition disabled:opacity-50">
                        {feesLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Save fees"}
                    </button>
                    {feesSaved && <span className="text-sm text-green-400 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Saved — live in app</span>}
                </div>
            </div>

            <div className={`rounded-xl border p-6 space-y-4 transition-colors ${testMode ? "border-yellow-500/40 bg-yellow-500/5" : "border-white/10 bg-neutral-900/50"}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${testMode ? "bg-yellow-500/20" : "bg-neutral-800"}`}>
                            <FlaskConical className={`h-5 w-5 ${testMode ? "text-yellow-400" : "text-neutral-400"}`} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Test mode</h3>
                            <p className="text-sm text-neutral-400">Shows a banner in the app's checkout. Stripe itself is in test mode until the live keys are set.</p>
                        </div>
                    </div>
                    <button onClick={toggleTestMode} disabled={testModeLoading}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition disabled:opacity-50 ${testMode ? "bg-yellow-400 text-black hover:bg-yellow-300" : "bg-neutral-800 text-white hover:bg-neutral-700"}`}>
                        {testModeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : testMode ? "On" : "Off"}
                    </button>
                </div>
            </div>
        </div>
    );
}
