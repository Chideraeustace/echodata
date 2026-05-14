import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// Move constants outside component
const networks = ["mtn", "tigo", "telecel"];
const periods = ["daily", "weekly", "monthly"];

export default function PricingView() {
  // Navigation tabs state
  const [selectedNetwork, setSelectedNetwork] = useState("mtn");
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");

  // Core data states
  const [bundlesData, setBundlesData] = useState({
    mtn: { daily: [], weekly: [], monthly: [] },
    tigo: { daily: [], weekly: [], monthly: [] },
    telecel: { daily: [], weekly: [], monthly: [] },
  });

  const [bundlesLoading, setBundlesLoading] = useState(true);
  const [bundlesError, setBundlesError] = useState(null);

  // Changes state
  const [priceChanges, setPriceChanges] = useState({});
  const [activeChanges, setActiveChanges] = useState({});

  // Fetch all bundles
  const fetchBundles = useCallback(async () => {
    setBundlesLoading(true);
    setBundlesError(null);

    try {
      const newData = {
        mtn: { daily: [], weekly: [], monthly: [] },
        tigo: { daily: [], weekly: [], monthly: [] },
        telecel: { daily: [], weekly: [], monthly: [] },
      };

      for (const network of networks) {
        for (const period of periods) {
          const colRef = collection(db, "echo-bundles", network, period);

          const q = query(colRef, orderBy("price", "asc"));

          const snap = await getDocs(q);

          newData[network][period] = snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
        }
      }

      setBundlesData(newData);
    } catch (err) {
      console.error("Bundles fetch failed:", err);
      setBundlesError(err.message);
    } finally {
      setBundlesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBundles();
  }, [fetchBundles]);

  // Handle price changes
  const handlePriceChange = (network, period, planId, value) => {
    const key = `${network}/${period}/${planId}`;

    const numValue = parseFloat(value);

    setPriceChanges((prev) => ({
      ...prev,
      [key]: isNaN(numValue) ? (prev[key] ?? 0) : numValue,
    }));
  };

  // Handle active toggle
  const handleActiveToggle = (network, period, planId, current) => {
    const key = `${network}/${period}/${planId}`;

    setActiveChanges((prev) => {
      const updatedValue = prev.hasOwnProperty(key) ? !prev[key] : !current;

      const newChanges = {
        ...prev,
        [key]: updatedValue,
      };

      // Remove change if it matches original value
      if (updatedValue === current) {
        delete newChanges[key];
      }

      return newChanges;
    });
  };

  // Save changes
  const saveBundleChanges = async () => {
    if (
      Object.keys(priceChanges).length === 0 &&
      Object.keys(activeChanges).length === 0
    ) {
      alert("No changes to save");
      return;
    }

    if (!window.confirm("Save all changes?")) return;

    setBundlesLoading(true);

    try {
      const batch = writeBatch(db);

      // Save prices
      Object.entries(priceChanges).forEach(([key, newPrice]) => {
        const [network, period, planId] = key.split("/");

        const ref = doc(db, "echo-bundles", network, period, planId);

        batch.update(ref, {
          price: newPrice,
          updatedAt: serverTimestamp(),
        });
      });

      // Save active states
      Object.entries(activeChanges).forEach(([key, newActive]) => {
        const [network, period, planId] = key.split("/");

        const ref = doc(db, "echo-bundles", network, period, planId);

        batch.update(ref, {
          active: newActive,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      alert("Changes saved successfully");

      setPriceChanges({});
      setActiveChanges({});

      await fetchBundles();
    } catch (err) {
      console.error(err);
      alert("Save failed: " + err.message);
    } finally {
      setBundlesLoading(false);
    }
  };

  const hasUnsavedChanges =
    Object.keys(priceChanges).length > 0 ||
    Object.keys(activeChanges).length > 0;

  const activePlansList = bundlesData[selectedNetwork]?.[selectedPeriod] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Data Bundle Matrix
          </h1>

          <p className="text-sm text-slate-400 mt-1">
            Configure real-time retail rates and network status rules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBundles}
            disabled={bundlesLoading}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl transition-all"
          >
            <RefreshCw
              size={20}
              className={bundlesLoading ? "animate-spin" : ""}
            />
          </button>

          <button
            onClick={saveBundleChanges}
            disabled={bundlesLoading || !hasUnsavedChanges}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              hasUnsavedChanges
                ? "bg-blue-600 hover:bg-blue-500 text-white"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            <Save size={18} />
            Save Changes
          </button>
        </div>
      </div>

      {/* Warning */}
      {hasUnsavedChanges && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-400 text-sm">
          <AlertCircle size={18} />
          <span>You have unsaved configuration changes.</span>
        </div>
      )}

      {/* Network Tabs */}
      <div className="flex border-b border-slate-800/80 gap-2">
        {networks.map((net) => (
          <button
            key={net}
            onClick={() => setSelectedNetwork(net)}
            className={`px-5 py-3 text-sm font-bold capitalize border-b-2 transition-all ${
              selectedNetwork === net
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {net === "tigo" ? "AirtelTigo" : net}
          </button>
        ))}
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 bg-slate-950/40 p-1.5 rounded-xl border border-slate-800/40 max-w-md">
        {periods.map((per) => (
          <button
            key={per}
            onClick={() => setSelectedPeriod(per)}
            className={`flex-1 py-2 text-xs font-semibold capitalize rounded-lg transition-all ${
              selectedPeriod === per
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {per}
          </button>
        ))}
      </div>

      {/* Content */}
      {bundlesLoading && activePlansList.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          Loading bundles...
        </div>
      ) : bundlesError ? (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center text-red-400">
          Error: {bundlesError}
        </div>
      ) : activePlansList.length === 0 ? (
        <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
          No configurations found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activePlansList.map((plan) => {
            const changeKey = `${selectedNetwork}/${selectedPeriod}/${plan.id}`;

            const currentPrice = priceChanges.hasOwnProperty(changeKey)
              ? priceChanges[changeKey]
              : plan.price;

            const currentIsActive = activeChanges.hasOwnProperty(changeKey)
              ? activeChanges[changeKey]
              : plan.active;

            const isPriceChanged = priceChanges.hasOwnProperty(changeKey);

            const isActiveChanged = activeChanges.hasOwnProperty(changeKey);

            return (
              <div
                key={plan.id}
                className={`bg-slate-950/40 border rounded-2xl p-5 transition-all relative ${
                  currentIsActive
                    ? "border-slate-800/60"
                    : "border-red-950/50 bg-red-950/5"
                }`}
              >
                {(isPriceChanged || isActiveChanged) && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-bl-lg" />
                )}

                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-slate-100">
                    {plan.name || plan.id}
                  </h3>

                  <button
                    onClick={() =>
                      handleActiveToggle(
                        selectedNetwork,
                        selectedPeriod,
                        plan.id,
                        plan.active,
                      )
                    }
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      currentIsActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {currentIsActive ? (
                      <>
                        <CheckCircle2 size={12} />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle size={12} />
                        Disabled
                      </>
                    )}
                  </button>
                </div>

                {plan.value && (
                  <div className="text-xs text-slate-400 mb-4">
                    Data Allocation:
                    <span className="ml-2 text-slate-200 font-bold">
                      {plan.value}
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    Retail Price
                  </label>

                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-500 text-xs">
                      GHS
                    </span>

                    <input
                      type="number"
                      step="0.01"
                      value={currentPrice}
                      onChange={(e) =>
                        handlePriceChange(
                          selectedNetwork,
                          selectedPeriod,
                          plan.id,
                          e.target.value,
                        )
                      }
                      className={`w-full pl-12 pr-4 py-2 bg-slate-950 border rounded-xl text-sm font-mono focus:outline-none ${
                        isPriceChanged
                          ? "border-amber-500 text-amber-400"
                          : "border-slate-800 text-slate-100"
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
