"use client";

import { useState, useEffect } from "react";
import { Mail, Plus, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";

// Signal configuration with individual thresholds
interface SignalConfig {
  enabled: boolean;
  threshold: number;
}

// Subscription interface for CFTC alerts
export interface EmailSubscription {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  sectors: string[]; // "ALL", "ags", "energy", "metals", "equities", "rates", "fx", "crypto"
  // Individual signal configs with thresholds
  signals: {
    mmPctHistMax: SignalConfig;      // Net MM as % historical max (% threshold)
    mmPctOI: SignalConfig;           // Net MM as % of OI (z-score threshold)
    weeklyMmChange: SignalConfig;    // Weekly net MM change (z-score threshold)
    tradersPctLongShort: SignalConfig; // COT traders % long/short (% threshold)
    cotRvs: SignalConfig;            // COT - RVs (z-score threshold)
    cotVsSpreads: SignalConfig;      // COT vs Spreads (z-score threshold)
  };
  recipients: string[];
  enabled: boolean;
  createdAt: string;
  lastSentAt: string | null;
}

const SECTOR_OPTIONS = [
  { value: "ALL", label: "All Sectors" },
  { value: "ags", label: "Ags" },
  { value: "energy", label: "Energy" },
  { value: "metals", label: "Metals" },
  { value: "equities", label: "Equities" },
  { value: "rates", label: "Rates" },
  { value: "fx", label: "FX" },
  { value: "crypto", label: "Crypto" },
];

// Signal definitions with threshold options
const SIGNAL_DEFINITIONS = {
  mmPctHistMax: {
    label: "Net MM as % Historical Max",
    description: "Alert when MM positioning reaches X% of historical max",
    thresholdType: "percent" as const,
    options: [70, 80, 85, 90, 95],
    defaultThreshold: 80,
  },
  mmPctOI: {
    label: "Net MM as % of Open Interest",
    description: "Alert when MM % of OI z-score exceeds threshold",
    thresholdType: "zscore" as const,
    options: [1.5, 2.0, 2.5, 3.0],
    defaultThreshold: 2.0,
  },
  weeklyMmChange: {
    label: "Weekly Net MM Change",
    description: "Alert when weekly MM change z-score exceeds threshold",
    thresholdType: "zscore" as const,
    options: [1.5, 2.0, 2.5, 3.0],
    defaultThreshold: 2.0,
  },
  tradersPctLongShort: {
    label: "COT Traders % Long/Short",
    description: "Alert when trader % long or short exceeds threshold",
    thresholdType: "percent" as const,
    options: [60, 65, 70, 75, 80],
    defaultThreshold: 70,
  },
  cotRvs: {
    label: "COT - RVs (Spread Z-Scores)",
    description: "Alert when RV spread z-score exceeds threshold",
    thresholdType: "zscore" as const,
    options: [1.5, 2.0, 2.5, 3.0],
    defaultThreshold: 2.0,
  },
  cotVsSpreads: {
    label: "COT vs Spreads",
    description: "Alert when COT vs price spread z-score exceeds threshold",
    thresholdType: "zscore" as const,
    options: [1.5, 2.0, 2.5, 3.0],
    defaultThreshold: 2.0,
  },
};

type SignalKey = keyof typeof SIGNAL_DEFINITIONS;

const DEFAULT_SIGNALS: EmailSubscription["signals"] = {
  mmPctHistMax: { enabled: false, threshold: 80 },
  mmPctOI: { enabled: false, threshold: 2.0 },
  weeklyMmChange: { enabled: false, threshold: 2.0 },
  tradersPctLongShort: { enabled: false, threshold: 70 },
  cotRvs: { enabled: true, threshold: 2.0 },
  cotVsSpreads: { enabled: false, threshold: 2.0 },
};

export function EmailSubsTab() {
  const [subscriptions, setSubscriptions] = useState<EmailSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingSub, setEditingSub] = useState<EmailSubscription | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formFrequency, setFormFrequency] = useState<"daily" | "weekly">("weekly");
  const [formSectors, setFormSectors] = useState<string[]>(["ALL"]);
  const [formSignals, setFormSignals] = useState<EmailSubscription["signals"]>(DEFAULT_SIGNALS);
  const [formRecipients, setFormRecipients] = useState("");
  const [formEnabled, setFormEnabled] = useState(true);

  // Load subscriptions
  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      const data = await res.json();
      setSubscriptions(data.subscriptions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSub(null);
    setFormName("");
    setFormFrequency("weekly");
    setFormSectors(["ALL"]);
    setFormSignals(DEFAULT_SIGNALS);
    setFormRecipients("");
    setFormEnabled(true);
    setShowModal(true);
  };

  const openEditModal = (sub: EmailSubscription) => {
    setEditingSub(sub);
    setFormName(sub.name);
    setFormFrequency(sub.frequency);
    setFormSectors(sub.sectors);
    setFormSignals(sub.signals || DEFAULT_SIGNALS);
    setFormRecipients(sub.recipients.join(", "));
    setFormEnabled(sub.enabled);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      alert("Please enter a subscription name");
      return;
    }
    if (!formRecipients.trim()) {
      alert("Please enter at least one recipient email");
      return;
    }

    // Check at least one signal is enabled
    const hasEnabledSignal = Object.values(formSignals).some(s => s.enabled);
    if (!hasEnabledSignal) {
      alert("Please enable at least one signal type");
      return;
    }

    const recipients = formRecipients.split(",").map(e => e.trim()).filter(e => e);
    if (recipients.length === 0) {
      alert("Please enter valid email addresses");
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<EmailSubscription> = {
        name: formName.trim(),
        frequency: formFrequency,
        sectors: formSectors,
        signals: formSignals,
        recipients,
        enabled: formEnabled,
      };

      if (editingSub) {
        payload.id = editingSub.id;
      }

      const res = await fetch("/api/subscriptions", {
        method: editingSub ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save subscription");
      }

      await fetchSubscriptions();
      setShowModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save subscription");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription?")) return;

    try {
      const res = await fetch(`/api/subscriptions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete subscription");
      await fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete subscription");
    }
  };

  const toggleEnabled = async (sub: EmailSubscription) => {
    try {
      const res = await fetch("/api/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sub, enabled: !sub.enabled }),
      });
      if (!res.ok) throw new Error("Failed to update subscription");
      await fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update subscription");
    }
  };

  const handleSectorToggle = (value: string) => {
    if (value === "ALL") {
      setFormSectors(["ALL"]);
    } else {
      const newSectors = formSectors.filter(c => c !== "ALL");
      if (newSectors.includes(value)) {
        const filtered = newSectors.filter(c => c !== value);
        setFormSectors(filtered.length > 0 ? filtered : ["ALL"]);
      } else {
        setFormSectors([...newSectors, value]);
      }
    }
  };

  const toggleSignal = (key: SignalKey) => {
    setFormSignals(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const setSignalThreshold = (key: SignalKey, threshold: number) => {
    setFormSignals(prev => ({
      ...prev,
      [key]: { ...prev[key], threshold },
    }));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatThreshold = (key: SignalKey, threshold: number) => {
    const def = SIGNAL_DEFINITIONS[key];
    return def.thresholdType === "percent" ? `≥${threshold}%` : `≥${threshold}σ`;
  };

  const getEnabledSignalsSummary = (signals: EmailSubscription["signals"]) => {
    const enabled = (Object.keys(signals) as SignalKey[])
      .filter(key => signals[key].enabled)
      .map(key => {
        const def = SIGNAL_DEFINITIONS[key];
        const shortLabel = def.label.split(" ")[0];
        return `${shortLabel} (${formatThreshold(key, signals[key].threshold)})`;
      });
    return enabled.length > 0 ? enabled.join(", ") : "None";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading subscriptions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-orange-500" />
            Email Subscriptions
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Set up automated email alerts for CFTC positioning signals
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Subscription
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Subscriptions List */}
      {subscriptions.length === 0 ? (
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-8 text-center">
          <Mail className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-400">No subscriptions yet</h3>
          <p className="text-zinc-500 text-sm mt-2">
            Create your first email subscription to receive CFTC positioning alerts
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className={`bg-zinc-900 rounded-lg border ${
                sub.enabled ? "border-zinc-700" : "border-zinc-800 opacity-60"
              } p-4`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{sub.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sub.frequency === "daily"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-purple-500/20 text-purple-400"
                      }`}
                    >
                      {sub.frequency === "daily" ? "Daily" : "Weekly (Sat)"}
                    </span>
                    <button
                      onClick={() => toggleEnabled(sub)}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        sub.enabled
                          ? "bg-green-500/20 text-green-400"
                          : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {sub.enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div>
                      <span className="text-zinc-500">Signals:</span>
                      <span className="text-zinc-300 ml-2">
                        {sub.signals ? getEnabledSignalsSummary(sub.signals) : "Legacy format"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Sectors:</span>
                      <span className="text-zinc-300 ml-2">
                        {sub.sectors.includes("ALL") ? "All" : sub.sectors.join(", ")}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-zinc-500">Recipients:</span>
                      <span className="text-zinc-300 ml-2">{sub.recipients.join(", ")}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Last sent:</span>
                      <span className="text-zinc-400 ml-2">{formatDate(sub.lastSentAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => openEditModal(sub)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(sub.id)}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg border border-zinc-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {editingSub ? "Edit Subscription" : "Create Subscription"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Subscription Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Weekly CFTC Extremes"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Frequency</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFormFrequency("daily")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formFrequency === "daily"
                        ? "bg-orange-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    Daily (after COT release)
                  </button>
                  <button
                    onClick={() => setFormFrequency("weekly")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      formFrequency === "weekly"
                        ? "bg-orange-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    }`}
                  >
                    Weekly (Saturday 9am ET)
                  </button>
                </div>
                <p className="text-zinc-500 text-xs mt-1">
                  COT data is released Friday 3:30pm ET
                </p>
              </div>

              {/* Signal Types with Individual Thresholds */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Signal Types & Thresholds</label>
                <div className="space-y-3">
                  {(Object.keys(SIGNAL_DEFINITIONS) as SignalKey[]).map((key) => {
                    const def = SIGNAL_DEFINITIONS[key];
                    const signal = formSignals[key];

                    return (
                      <div
                        key={key}
                        className={`rounded-lg border p-3 transition-colors ${
                          signal.enabled
                            ? "bg-zinc-800/70 border-orange-500/50"
                            : "bg-zinc-800/30 border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Toggle */}
                            <button
                              onClick={() => toggleSignal(key)}
                              className={`mt-0.5 w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
                                signal.enabled ? "bg-orange-500" : "bg-zinc-600"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  signal.enabled ? "translate-x-5" : "translate-x-0.5"
                                }`}
                              />
                            </button>

                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{def.label}</div>
                              <div className="text-zinc-500 text-xs mt-0.5">{def.description}</div>
                            </div>
                          </div>

                          {/* Threshold selector */}
                          <div className="flex gap-1">
                            {def.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => setSignalThreshold(key, opt)}
                                disabled={!signal.enabled}
                                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                  signal.threshold === opt && signal.enabled
                                    ? "bg-orange-500 text-white"
                                    : signal.enabled
                                    ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                }`}
                              >
                                {def.thresholdType === "percent" ? `${opt}%` : `${opt}σ`}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sectors */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Sectors</label>
                <div className="flex flex-wrap gap-2">
                  {SECTOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSectorToggle(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formSectors.includes(opt.value)
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Recipients (comma-separated)</label>
                <input
                  type="text"
                  value={formRecipients}
                  onChange={(e) => setFormRecipients(e.target.value)}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Enabled Toggle */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setFormEnabled(!formEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    formEnabled ? "bg-green-500" : "bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      formEnabled ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-zinc-400 text-sm">
                  {formEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {editingSub ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
