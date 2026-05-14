import React, { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  DollarSign,
  ShoppingBag,
  BarChart3,
  Wallet,
  RefreshCcw,
} from "lucide-react";

export default function DashboardView() {
  const [stats, setStats] = useState({
    dailyRevenue: 0,
    todaysOrders: 0,
    totalRevenue: 0,
    totalOrders: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Define Queries
      const dailyQ = query(
        collection(db, "echodata_purchases"),
        where("status", "==", "success"),
        where("createdAt", ">=", today),
      );

      const totalQ = query(
        collection(db, "echodata_purchases"),
        where("status", "==", "success"),
      );

      // Parallel execution for speed
      const [dailySnap, totalSnap] = await Promise.all([
        getDocs(dailyQ),
        getDocs(totalQ),
      ]);

      // Calculate Metrics
      let dailyRev = 0;
      dailySnap.forEach((doc) => (dailyRev += Number(doc.data().amount || 0)));

      let totalRev = 0;
      totalSnap.forEach((doc) => (totalRev += Number(doc.data().amount || 0)));

      setStats({
        dailyRevenue: dailyRev.toFixed(2),
        todaysOrders: dailySnap.size,
        totalRevenue: totalRev.toFixed(2),
        totalOrders: totalSnap.size,
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
        <p>Updating metrics...</p>
      </div>
    );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Transaction performance snapshot.
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
        >
          <RefreshCcw size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={`GH¢ ${stats.dailyRevenue}`}
          icon={<DollarSign size={20} />}
          color="emerald"
        />
        <StatCard
          label="Today's Orders"
          value={stats.todaysOrders}
          icon={<ShoppingBag size={20} />}
          color="blue"
        />
        <StatCard
          label="Total Revenue"
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
    <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-5 shadow-xl backdrop-blur-md">
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
