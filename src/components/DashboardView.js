import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  DollarSign,
  ShoppingBag,
  BarChart3,
  Wallet,
  RefreshCcw,
  Zap,
} from "lucide-react";

export default function DashboardView() {
  const [stats, setStats] = useState({
    // EchoData specific stats
    dailyRevenue: 0,
    todaysOrders: 0,
    totalRevenue: 0,
    totalOrders: 0,
    // Moolre specific stats
    moolreDailyRev: 0,
    moolreDailyOrders: 0,
    moolreTotalRev: 0,
    moolreTotalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  // Independent Date & Time Filter States for EchoData
  const [echoStart, setEchoStart] = useState("");
  const [echoEnd, setEchoEnd] = useState("");

  // Independent Date & Time Filter States for Moolre
  const [moolreStart, setMoolreStart] = useState("");
  const [moolreEnd, setMoolreEnd] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // --- EchoData Range Handling (Defaults to Today 00:00 - 23:59 if blank) ---
      let echoStartBound = echoStart ? new Date(echoStart) : new Date();
      if (!echoStart) echoStartBound.setHours(0, 0, 0, 0);

      let echoEndBound = echoEnd ? new Date(echoEnd) : new Date();
      if (!echoEnd) echoEndBound.setHours(23, 59, 59, 999);

      // --- Moolre Range Handling (Defaults to Today 00:00 - 23:59 if blank) ---
      let moolreStartBound = moolreStart ? new Date(moolreStart) : new Date();
      if (!moolreStart) moolreStartBound.setHours(0, 0, 0, 0);

      let moolreEndBound = moolreEnd ? new Date(moolreEnd) : new Date();
      if (!moolreEnd) moolreEndBound.setHours(23, 59, 59, 999);

      // --- Queries for echodata_purchases ---
      const dailyQ = query(
        collection(db, "echodata_purchases"),
        where("status", "==", "success"),
        where("createdAt", ">=", echoStartBound),
        where("createdAt", "<=", echoEndBound),
      );
      const totalQ = query(
        collection(db, "echodata_purchases"),
        where("status", "==", "success"),
      );

      // --- Queries for echo_sales (Moolre) ---
      const moolreDailyQ = query(
        collection(db, "echo_sales"),
        where("status", "==", "success"),
        where("createdAt", ">=", moolreStartBound),
        where("createdAt", "<=", moolreEndBound),
      );
      const moolreTotalQ = query(
        collection(db, "echo_sales"),
        where("status", "==", "success"),
      );

      // Execute all 4 fetches parallelly
      const [snapDaily, snapTotal, snapMoolreDaily, snapMoolreTotal] =
        await Promise.all([
          getDocs(dailyQ),
          getDocs(totalQ),
          getDocs(moolreDailyQ),
          getDocs(moolreTotalQ),
        ]);

      // Process EchoData Metrics
      let revDaily = 0;
      snapDaily.forEach((d) => (revDaily += Number(d.data().amount || 0)));

      let revTotal = 0;
      snapTotal.forEach((d) => (revTotal += Number(d.data().amount || 0)));

      // Process Moolre Metrics
      let mRevDaily = 0;
      snapMoolreDaily.forEach(
        (d) => (mRevDaily += Number(d.data().amount || 0)),
      );

      let mRevTotal = 0;
      snapMoolreTotal.forEach(
        (d) => (mRevTotal += Number(d.data().amount || 0)),
      );

      setStats({
        dailyRevenue: revDaily.toFixed(2),
        todaysOrders: snapDaily.size,
        totalRevenue: revTotal.toFixed(2),
        totalOrders: snapTotal.size,
        moolreDailyRev: mRevDaily.toFixed(2),
        moolreDailyOrders: snapMoolreDaily.size,
        moolreTotalRev: mRevTotal.toFixed(2),
        moolreTotalOrders: snapMoolreTotal.size,
      });
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [echoStart, echoEnd, moolreStart, moolreEnd]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading)
    return (
      <div className="p-8 text-slate-400 animate-pulse flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCcw className="animate-spin mb-4" size={32} />
        <p className="font-medium tracking-tight">Syncing channel data...</p>
      </div>
    );

  return (
    <div className="space-y-12">
      {/* Top Main Title Banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Isolated system reconciliation and channel logs.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all active:scale-95"
          title="Refresh All Fields"
        >
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* --- SYSTEM BLOCK 1: EchoData Purchases --- */}
      <div className="bg-slate-900/10 border border-slate-850 p-6 rounded-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <ShoppingBag size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">
                EchoData Channel
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                echodata_purchases
              </span>
            </div>
          </div>

          {/* EchoData Specific Date Picker Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 w-full lg:w-auto">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">
              Reconcile Range:
            </span>
            <input
              type="datetime-local"
              value={echoStart}
              onChange={(e) => setEchoStart(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            />
            <span className="text-slate-600 text-xs">to</span>
            <input
              type="datetime-local"
              value={echoEnd}
              onChange={(e) => setEchoEnd(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
            />
            {(echoStart || echoEnd) && (
              <button
                onClick={() => {
                  setEchoStart("");
                  setEchoEnd("");
                }}
                className="text-xs text-red-400 hover:text-red-300 px-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={
              echoStart || echoEnd ? "Echo Filtered Rev" : "Echo Daily Rev"
            }
            value={`GH¢ ${stats.dailyRevenue}`}
            icon={<DollarSign size={20} />}
            color="emerald"
          />
          <StatCard
            label={
              echoStart || echoEnd
                ? "Echo Filtered Orders"
                : "Echo Daily Orders"
            }
            value={stats.todaysOrders}
            icon={<ShoppingBag size={20} />}
            color="blue"
          />
          <StatCard
            label="Echo All-Time Rev"
            value={`GH¢ ${stats.totalRevenue}`}
            icon={<Wallet size={20} />}
            color="purple"
          />
          <StatCard
            label="Echo Total Volume"
            value={stats.totalOrders}
            icon={<BarChart3 size={20} />}
            color="amber"
          />
        </div>
      </div>

      {/* --- SYSTEM BLOCK 2: Moolre Sales --- */}
      <div className="bg-slate-900/10 border border-slate-850 p-6 rounded-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-orange-500/10 rounded-lg">
              <Zap size={18} className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-200">
                Moolre Channel
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">
                echo_sales
              </span>
            </div>
          </div>

          {/* Moolre Specific Date Picker Controls */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 w-full lg:w-auto">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider px-1">
              Reconcile Range:
            </span>
            <input
              type="datetime-local"
              value={moolreStart}
              onChange={(e) => setMoolreStart(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-500"
            />
            <span className="text-slate-600 text-xs">to</span>
            <input
              type="datetime-local"
              value={moolreEnd}
              onChange={(e) => setMoolreEnd(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-orange-500"
            />
            {(moolreStart || moolreEnd) && (
              <button
                onClick={() => {
                  setMoolreStart("");
                  setMoolreEnd("");
                }}
                className="text-xs text-red-400 hover:text-red-300 px-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={
              moolreStart || moolreEnd
                ? "Moolre Filtered Rev"
                : "Moolre Daily Rev"
            }
            value={`GH¢ ${stats.moolreDailyRev}`}
            icon={<DollarSign size={20} />}
            color="emerald"
          />
          <StatCard
            label={
              moolreStart || moolreEnd
                ? "Moolre Filtered Orders"
                : "Moolre Daily Orders"
            }
            value={`${stats.moolreDailyOrders} orders`}
            icon={<ShoppingBag size={20} />}
            color="blue"
          />
          <StatCard
            label="Moolre Total Revenue"
            value={`GH¢ ${stats.moolreTotalRev}`}
            icon={<Wallet size={20} />}
            color="purple"
          />
          <StatCard
            label="Moolre Total Volume"
            value={`${stats.moolreTotalOrders} orders`}
            icon={<BarChart3 size={20} />}
            color="amber"
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  const colors = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    purple: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };
  return (
    <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-5 shadow-xl backdrop-blur-md hover:border-slate-700/80 transition-colors">
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          {label}
        </span>
        <div className={`p-2 rounded-xl border ${colors[color]}`}>{icon}</div>
      </div>
      <h3 className={`text-2xl font-bold mt-4 ${colors[color].split(" ")[0]}`}>
        {value}
      </h3>
    </div>
  );
}
