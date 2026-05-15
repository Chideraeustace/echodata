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
    dailyRevenue: 0,
    todaysOrders: 0,
    totalRevenue: 0,
    totalOrders: 0,
    // Moolre specific stats
    moolreDailyRev: 0,
    moolreTotalRev: 0,
    moolreTotalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // --- Queries for echodata_purchases ---
      const dailyQ = query(
        collection(db, "echodata_purchases"),
        where("status", "==", "success"),
        where("createdAt", ">=", today),
      );
      const totalQ = query(
        collection(db, "echodata_purchases"),
        where("status", "==", "success"),
      );

      // --- Queries for echo_sales (Moolre) ---
      const moolreDailyQ = query(
        collection(db, "echo_sales"),
        where("status", "==", "success"),
        where("createdAt", ">=", today),
      );
      const moolreTotalQ = query(
        collection(db, "echo_sales"),
        where("status", "==", "success"),
      );

      // Execute all 4 fetches in parallel
      const [snapDaily, snapTotal, snapMoolreDaily, snapMoolreTotal] =
        await Promise.all([
          getDocs(dailyQ),
          getDocs(totalQ),
          getDocs(moolreDailyQ),
          getDocs(moolreTotalQ),
        ]);

      // Calculate primary stats
      let revDaily = 0;
      snapDaily.forEach((d) => (revDaily += Number(d.data().amount || 0)));

      let revTotal = 0;
      snapTotal.forEach((d) => (revTotal += Number(d.data().amount || 0)));

      // Calculate Moolre stats
      let mRevDaily = 0;
      snapMoolreDaily.forEach(
        (d) => (mRevDaily += Number(d.data().amount || 0)),
      );

      let mRevTotal = 0;
      snapMoolreTotal.forEach(
        (d) => (mRevTotal += Number(d.data().amount || 0)),
      );

      setStats({
        // Combined Totals for top cards
        dailyRevenue: (revDaily).toFixed(2),
        todaysOrders: snapDaily.size ,
        totalRevenue: (revTotal).toFixed(2),
        totalOrders: snapTotal.size,
        // Specific Moolre breakdown
        moolreDailyRev: mRevDaily.toFixed(2),
        moolreTotalRev: mRevTotal.toFixed(2),
        moolreTotalOrders: snapMoolreTotal.size,
      });
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading)
    return (
      <div className="p-8 text-slate-400 animate-pulse flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCcw className="animate-spin mb-4" size={32} />
        <p className="font-medium tracking-tight">
          Syncing multi-channel data...
        </p>
      </div>
    );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time aggregate from EchoData and Moolre channels.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all active:scale-95"
        >
          <RefreshCcw size={20} />
        </button>
      </div>

      {/* Primary Combined Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aggregate Daily Rev"
          value={`GH¢ ${stats.dailyRevenue}`}
          icon={<DollarSign size={20} />}
          color="emerald"
        />
        <StatCard
          label="Today's Total Orders"
          value={stats.todaysOrders}
          icon={<ShoppingBag size={20} />}
          color="blue"
        />
        <StatCard
          label="All-Time Revenue"
          value={`GH¢ ${stats.totalRevenue}`}
          icon={<Wallet size={20} />}
          color="purple"
        />
        <StatCard
          label="Total Volume"
          value={stats.totalOrders}
          icon={<BarChart3 size={20} />}
          color="amber"
        />
      </div>

      {/* Dedicated Moolre Section */}
      <div className="pt-6 border-t border-slate-800/60">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1.5 bg-orange-500/10 rounded-lg">
            <Zap size={18} className="text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-200">
            Moolre Channel (echo_sales)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-950/20 border border-slate-800/40 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Moolre Daily
            </span>
            <h3 className="text-xl font-bold text-slate-200 mt-2">
              GH¢ {stats.moolreDailyRev}
            </h3>
          </div>
          <div className="bg-slate-950/20 border border-slate-800/40 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Moolre Total Revenue
            </span>
            <h3 className="text-xl font-bold text-slate-200 mt-2">
              GH¢ {stats.moolreTotalRev}
            </h3>
          </div>
          <div className="bg-slate-950/20 border border-slate-800/40 rounded-2xl p-5 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Moolre Total Sales
            </span>
            <h3 className="text-xl font-bold text-slate-200 mt-2">
              {stats.moolreTotalOrders} orders
            </h3>
          </div>
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
