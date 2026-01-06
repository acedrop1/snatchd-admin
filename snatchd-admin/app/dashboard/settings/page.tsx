"use client";

import { Settings, Loader2 } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Settings</h2>
                    <p className="text-neutral-400">Configure admin panel preferences and system settings.</p>
                </div>
            </div>

            {/* Coming Soon */}
            <div className="rounded-xl border border-dashed border-neutral-800 p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 mb-4">
                    <Settings className="h-6 w-6 text-neutral-400" />
                </div>
                <h3 className="text-lg font-medium text-white">Settings</h3>
                <p className="text-sm text-neutral-500 mt-1 max-w-sm mx-auto">
                    Admin settings and configuration options coming soon.
                </p>
            </div>
        </div>
    );
}
