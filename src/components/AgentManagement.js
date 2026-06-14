import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase"; // Adjust path as needed
import {
  toggleAgentStatus,
  manualWalletTopUp,
  updatePackageCostPrice,
  togglePackageVisibility,
} from "../service/agentService"; // Adjust path as needed
import {
  ShieldCheck,
  Wallet,
  Power,
  Edit3,
  Globe,
  Eye,
  EyeOff,
  TrendingUp,
  Layers,
} from "lucide-react";

export default function AgentManagement() {
 const [agents, setAgents] = useState([]);
 const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState(null); // ID of agent being expanded
  const [selectedNetwork, setSelectedNetwork] = useState("mtnPackages");
  const [topUpAmount, setTopUpAmount] = useState("");

  // Track dynamic inline typing input states independently per pricing target field
  const [inputCostPrices, setInputCostPrices] = useState({});
  const [inputAgentPrices, setInputAgentPrices] = useState({});

  // Fetch all agents in real-time
  

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "echoagents"), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAgents(data);
      setLoading(false); // 👈 Explicitly call it here to use the variable
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 👈 Suppress the dependency warning safely because onSnapshot handles its own life cycle

  // Sync pricing dictionary inputs locally when an agent node is opened
  const agentsRef = React.useRef(agents);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    if (editingAgent) {
      const activeAgent = agentsRef.current.find((a) => a.id === editingAgent);
      if (activeAgent) {
        const initialCostPrices = {};
        const initialAgentPrices = {};
        ["mtnPackages", "vodafonePackages", "airteltigoPackages"].forEach(
          (net) => {
            if (activeAgent[net]) {
              Object.entries(activeAgent[net]).forEach(([pkgId, pkg]) => {
                initialCostPrices[`${net}-${pkgId}`] = pkg.costPrice;
                initialAgentPrices[`${net}-${pkgId}`] = pkg.agentPrice || "";
              });
            }
          },
        );
        setInputCostPrices(initialCostPrices);
        setInputAgentPrices(initialAgentPrices);
      }
    }
  }, [editingAgent]);

  const handleUpdatePrice = async (
    agentId,
    network,
    pkgId,
    newPrice,
    targetField,
  ) => {
    const numericPrice = parseFloat(newPrice);
    if (isNaN(numericPrice)) return;
    try {
      await updatePackageCostPrice(
        agentId,
        network,
        pkgId,
        numericPrice,
        targetField,
      );
    } catch (err) {
      console.error(
        `Failed to commit package ${targetField} update Matrix:`,
        err,
      );
    }
  };

  const handleToggleVisibility = async (
    agentId,
    network,
    pkgId,
    currentStatus,
  ) => {
    try {
      if (typeof togglePackageVisibility === "function") {
        await togglePackageVisibility(agentId, network, pkgId, !currentStatus);
      } else {
        console.warn(
          "togglePackageVisibility helper function is not implemented in service wrapper.",
        );
      }
    } catch (err) {
      console.error("Visibility change mutation fault:", err);
    }
  };

  const sortPackageKeys = (pkgObject) => {
    if (!pkgObject) return [];
    return Object.entries(pkgObject).sort((a, b) => {
      const valA = parseInt(a[0]) || 0;
      const valB = parseInt(b[0]) || 0;
      return valA - valB;
    });
  };

  if (loading)
    return (
      <div className="p-10 text-slate-400 font-mono tracking-wider animate-pulse">
        Synchronizing Agent Matrix Architecture...
      </div>
    );

  return (
    <div className="p-6 space-y-6 text-slate-100 max-w-7xl mx-auto">
      {/* Header Viewport */}
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 tracking-tight text-white">
            <ShieldCheck className="text-blue-500" /> Agent Management Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Control edge gateway nodes access limits, overwrite package pricing
            structures, and handle capital balances.
          </p>
        </div>
      </div>

      {/* Agents Map Interface Grid */}
      <div className="grid gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className={`bg-slate-900/60 backdrop-blur-md border rounded-xl p-5 shadow-xl transition-all duration-300 ${
              editingAgent === agent.id
                ? "border-slate-700 bg-slate-900"
                : "border-slate-800/60"
            }`}
          >
            {/* Top Overview Metadata Row */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-200">
                  {agent.dataSellingName || "Unconfigured Storefront"}
                </h3>
                <p className="text-xs text-slate-500 font-mono tracking-wide">
                  {agent.email}
                </p>

                <div className="flex items-center gap-3 mt-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold tracking-wider uppercase border ${
                      agent.isActiveAgent
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    }`}
                  >
                    {agent.isActiveAgent ? "Active Workspace" : "Disabled Node"}
                  </span>
                  <span className="text-sm font-mono text-slate-300 flex items-center gap-1.5 bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
                    <Wallet size={14} className="text-blue-400" />
                    <span className="text-slate-500 text-xs">₵</span>
                    {agent.walletBalance?.toFixed(2) || "0.00"}
                  </span>
                </div>
              </div>

              {/* 📊 NEW: Agent Order & Revenue Tracking Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 w-full md:w-auto md:min-w-[480px]">
                {/* Today's Vol */}
                <div className="px-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={10} className="text-emerald-400" />{" "}
                    Today's Vol
                  </span>
                  <p className="text-base font-mono font-bold text-slate-200 mt-0.5">
                    {agent.todaysOrders || 0}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      txs
                    </span>
                  </p>
                </div>

                {/* Today's Rev */}
                <div className="px-2 border-l border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Today's Rev
                  </span>
                  <p className="text-base font-mono font-bold text-emerald-400 mt-0.5">
                    <span className="text-xs font-normal text-slate-500 mr-0.5">
                      ₵
                    </span>
                    {agent.todayRevenue?.toFixed(2) || "0.00"}
                  </p>
                </div>

                {/* Total Vol */}
                <div className="px-2 border-l border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Layers size={10} className="text-blue-400" /> Total Vol
                  </span>
                  <p className="text-base font-mono font-bold text-slate-200 mt-0.5">
                    {agent.totalOrders || 0}{" "}
                    <span className="text-xs font-normal text-slate-500">
                      txs
                    </span>
                  </p>
                </div>

                {/* Total Rev */}
                <div className="px-2 border-l border-slate-800/60">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Total Rev
                  </span>
                  <p className="text-base font-mono font-bold text-blue-400 mt-0.5">
                    <span className="text-xs font-normal text-slate-500 mr-0.5">
                      ₵
                    </span>
                    {agent.totalRevenue?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>

              {/* Action Buttons Hub */}
              <div className="flex items-center gap-1.5 shrink-0 self-end md:self-start">
                <button
                  onClick={() =>
                    toggleAgentStatus(agent.id, !agent.isActiveAgent)
                  }
                  className={`p-2 rounded-lg border transition-all ${
                    agent.isActiveAgent
                      ? "border-amber-500/20 text-amber-400 hover:bg-amber-400/10"
                      : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-400/10"
                  }`}
                  title={
                    agent.isActiveAgent
                      ? "Disable Agent Access Route"
                      : "Activate Agent Access Route"
                  }
                >
                  <Power size={18} />
                </button>
                <button
                  onClick={() =>
                    setEditingAgent(editingAgent === agent.id ? null : agent.id)
                  }
                  className={`p-2 rounded-lg border transition-all ${
                    editingAgent === agent.id
                      ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                      : "border-slate-800 text-blue-400 hover:bg-blue-400/10"
                  }`}
                >
                  <Edit3 size={18} />
                </button>
              </div>
            </div>

            {/* EXPANDED AREA: Pricing Management Console */}
            {editingAgent === agent.id && (
              <div className="mt-5 pt-5 border-t border-slate-800/80 space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  {/* Column 1: Liquidity/Wallet Operations */}
                  <div className="bg-slate-950/80 border border-slate-850 p-4 rounded-xl space-y-3">
                    <div>
                      <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Wallet size={12} className="text-slate-500" /> Manual
                        Wallet Capital Overwrite
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Inject direct atomic topup modifications into balance
                        registers.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Amount (₵)"
                        className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm w-full font-mono focus:outline-none focus:border-slate-700"
                        value={topUpAmount}
                        onChange={(e) => setTopUpAmount(e.target.value)}
                      />
                      <button
                        onClick={async () => {
                          const amt = Number(topUpAmount);
                          if (!topUpAmount || isNaN(amt)) return;
                          await manualWalletTopUp(agent.id, amt);
                          setTopUpAmount("");
                        }}
                        className="bg-blue-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-500 transition shadow-md shadow-blue-600/10 shrink-0"
                      >
                        Credit
                      </button>
                    </div>
                  </div>

                  {/* Columns 2 & 3: Consolidated Network Matrix Tiers */}
                  <div className="lg:col-span-2 bg-slate-950/80 border border-slate-850 rounded-xl p-4 space-y-4">
                    {/* Matrix Top Filter Bar */}
                    <div className="flex items-center justify-between border-b border-slate-850 pb-3 flex-wrap gap-2">
                      <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Globe size={12} className="text-slate-500" /> Pricing
                        Matrix & Package Visibility
                      </h4>

                      {/* Sub-tab Switches */}
                      <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                        {[
                          { key: "mtnPackages", label: "MTN" },
                          { key: "vodafonePackages", label: "Telecel/Vod" },
                          { key: "airteltigoPackages", label: "AT" },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setSelectedNetwork(tab.key)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                              selectedNetwork === tab.key
                                ? "bg-slate-800 text-blue-400 shadow"
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Matrix Data View Workspace */}
                    <div className="overflow-x-auto">
                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
                        {sortPackageKeys(agent[selectedNetwork]).map(
                          ([pkgId, pkg]) => {
                            const internalKey = `${selectedNetwork}-${pkgId}`;

                            const currentCostVal =
                              inputCostPrices[internalKey] !== undefined
                                ? inputCostPrices[internalKey]
                                : pkg.costPrice;

                            const currentAgentVal =
                              inputAgentPrices[internalKey] !== undefined
                                ? inputAgentPrices[internalKey]
                                : pkg.agentPrice || "";

                            return (
                              <div
                                key={pkgId}
                                className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-850 rounded-lg text-xs"
                              >
                                {/* Package Label */}
                                <div className="w-20 shrink-0">
                                  <span className="font-bold text-slate-200 text-sm block">
                                    {pkg.size}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono tracking-tight uppercase">
                                    {pkgId}
                                  </span>
                                </div>

                                {/* Matrix Pricing Inputs Grid Container */}
                                <div className="flex flex-1 gap-4 max-w-md items-center">
                                  {/* Cost Price Field */}
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-slate-600 font-mono text-[10px]">
                                      COST
                                    </span>
                                    <span className="text-slate-500 font-mono">
                                      ₵
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs w-full font-mono text-emerald-400 focus:outline-none focus:border-slate-700"
                                      value={currentCostVal ?? ""}
                                      onChange={(e) => {
                                        setInputCostPrices({
                                          ...inputCostPrices,
                                          [internalKey]: e.target.value,
                                        });
                                      }}
                                      onBlur={(e) =>
                                        handleUpdatePrice(
                                          agent.id,
                                          selectedNetwork,
                                          pkgId,
                                          e.target.value,
                                          "costPrice",
                                        )
                                      }
                                      placeholder="0.00"
                                    />
                                  </div>

                                  {/* Agent Selling Price Field */}
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <span className="text-slate-600 font-mono text-[10px]">
                                      AGENT
                                    </span>
                                    <span className="text-slate-500 font-mono">
                                      ₵
                                    </span>
                                    <input
                                      type="number"
                                      step="0.01"
                                      className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs w-full font-mono text-blue-400 focus:outline-none focus:border-slate-700"
                                      value={currentAgentVal ?? ""}
                                      onChange={(e) => {
                                        setInputAgentPrices({
                                          ...inputAgentPrices,
                                          [internalKey]: e.target.value,
                                        });
                                      }}
                                      onBlur={(e) =>
                                        handleUpdatePrice(
                                          agent.id,
                                          selectedNetwork,
                                          pkgId,
                                          e.target.value,
                                          "agentPrice",
                                        )
                                      }
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>

                                {/* Visibility Toggler */}
                                <button
                                  onClick={() =>
                                    handleToggleVisibility(
                                      agent.id,
                                      selectedNetwork,
                                      pkgId,
                                      pkg.isActive,
                                    )
                                  }
                                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md font-medium tracking-wide transition border h-8 shrink-0 ${
                                    pkg.isActive !== false
                                      ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10"
                                      : "bg-slate-950 border-slate-850 text-slate-500 hover:text-slate-400"
                                  }`}
                                  title="Toggle endpoint module visibility for this client"
                                >
                                  {pkg.isActive !== false ? (
                                    <>
                                      <Eye size={12} /> disable
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff size={12} /> enable
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
