import React, { useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import PricingView from "./components/PricingView";
import ContactManagementView from "./components/ContactManagementView"; // 1. Import

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="h-16 flex items-center justify-between px-6 bg-slate-950/40 border-b border-slate-800/50 backdrop-blur-sm sticky top-0 z-40">
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu size={24} />
          </button>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-slate-400">Admin Session</span>
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-sm text-white">
              A
            </div>
          </div>
        </header>
        {/* ... Header stays the same ... */}

        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "pricing" && <PricingView />}
          {activeTab === "contacts" && <ContactManagementView />}{" "}
          {/* 2. Add Condition */}
        </main>
      </div>
    </div>
  );
}

export default App;
