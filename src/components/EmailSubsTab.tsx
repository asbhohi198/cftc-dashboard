"use client";

import { useState, useEffect } from "react";
import { Mail, Plus, Pencil, Trash2, X, Check, AlertCircle } from "lucide-react";

// Subscription interface for CFTC alerts
export interface EmailSubscription {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  signalTypes: string[]; // "ALL", "rvs", "changes", "extremes"
  sectors: string[]; // "ALL", "ags", "energy", "metals", "equities", "rates", "fx", "crypto"
  minZScore: number; // 1.5, 2.0, 2.5, 3.0
  recipients: string[];
  enabled: boolean;
  createdAt: string;
  lastSentAt: string | null;
}

const SIGNAL_TYPE_OPTIONS = [
  { value: "ALL", label: "All Signals" },
  { value: "rvs", label: "COT RVs (Spread Z-Scores)" },
  { value: "changes", label: "COT Changes (Big Moves)" },
  { value: "extremes", label: "Extreme Positioning" },
];

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

const Z_SCORE_OPTIONS = [
  { value: 1.5, label: "≥1.5σ" },
  { value: 2.0, label: "≥2.0σ" },
  { value: 2.5, label: "≥2.5σ" },
  { value: 3.0, label: "≥3.0σ" },
];

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
  const [formSignalTypes, setFormSignalTypes] = useState<string[]>(["ALL"]);
  const [formSectors, setFormSectors] = useState<string[]>(["ALL"]);
  const [formMinZScore, setFormMinZScore] = useState(2.0);
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
    setFormSignalTypes(["ALL"]);
    setFormSectors(["ALL"]);
    setFormMinZScore(2.0);
    setFormRecipients("");
    setFormEnabled(true);
    setShowModal(true);
  };

  const openEditModal = (sub: EmailSubscription) => {
    setEditingSub(sub);
    setFormName(sub.name);
    setFormFrequency(sub.frequency);
    setFormSignalTypes(sub.signalTypes);
    setFormSectors(sub.sectors);
    setFormMinZScore(sub.minZScore);
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
        signalTypes: formSignalTypes,
        sectors: formSectors,
        minZScore: formMinZScore,
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

  const handleSignalTypeToggle = (value: string) => {
    if (value === "ALL") {
      setFormSignalTypes(["ALL"]);
    } else {
      const newTypes = formSignalTypes.filter(s => s !== "ALL");
      if (newTypes.includes(value)) {
        const filtered = newTypes.filter(s => s !== value);
        setFormSignalTypes(filtered.length > 0 ? filtered : ["ALL"]);
      } else {
        setFormSignalTypes([...newTypes, value]);
      }
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

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                    <div>
                      <span className="text-zinc-500">Signal Types:</span>
                      <span className="text-zinc-300 ml-2">
                        {sub.signalTypes.includes("ALL") ? "All" : sub.signalTypes.map(s => {
                          const opt = SIGNAL_TYPE_OPTIONS.find(o => o.value === s);
                          return opt?.label.split(" ")[0] || s;
                        }).join(", ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Sectors:</span>
                      <span className="text-zinc-300 ml-2">
                        {sub.sectors.includes("ALL") ? "All" : sub.sectors.join(", ")}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500">Min Z-Score:</span>
                      <span className="text-zinc-300 ml-2">≥{sub.minZScore}σ</span>
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
          <div className="bg-zinc-900 rounded-lg border border-zinc-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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

            <div className="p-4 space-y-4">
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

              {/* Signal Types */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Signal Types</label>
                <div className="flex flex-wrap gap-2">
                  {SIGNAL_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => handleSignalTypeToggle(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formSignalTypes.includes(opt.value)
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
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

              {/* Min Z-Score */}
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Minimum Z-Score (for RVs)</label>
                <div className="flex gap-2">
                  {Z_SCORE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFormMinZScore(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        formMinZScore === opt.value
                          ? "bg-orange-500 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-zinc-500 text-xs mt-1">
                  Only include COT RV spreads with z-scores at or above this threshold
                </p>
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
