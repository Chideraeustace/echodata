import React from "react";
import { X, LayoutDashboard, Settings, Database } from "lucide-react";

export default function Sidebar({
  isOpen,
  setIsOpen,
  activeTab,
  setActiveTab,
}) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "pricing", label: "Bundle Pricing", icon: Settings },
  ];

  return (
    <div
      className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-slate-950/80 backdrop-blur-md border-r border-slate-800/50 p-5 
      transform transition-transform duration-300 ease-in-out md:relative md:transform-none
      ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
    `}
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <Database className="text-blue-500 w-6 h-6" />
          <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            EchoData Admin
          </span>
        </div>
        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setIsOpen(false)}
        >
          <X size={24} />
        </button>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
