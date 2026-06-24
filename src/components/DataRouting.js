import React, { useState, useEffect } from "react";
import {
  Workflow,
  CheckCircle2,
  Server,
  HelpCircle,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";

// 1. Firebase v9+ Modular SDK imports
import { doc, getDoc, setDoc } from "firebase/firestore";
// 2. Import your local initialized firestore instance here (e.g., './firebaseConfig')
import { db } from "../firebase";

export default function DataRouting() {
  const [selectedSystem, setSelectedSystem] = useState("justice");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null); // 'success' or 'error'

  const systemOptions = [
    {
      id: "justice",
      name: "JusticeData System",
      description:
        "Sends orders using normal Gigabyte (GB) packages. Good for regular plans.",
      label: "Standard Option",
    },
    {
      id: "hubnet",
      name: "Hubnet Gateway",
      description:
        "Converts sizes into Megabytes (MB) automatically before sending them out.",
      label: "Alternative Option",
    },
  ];

  // Load active setting from Firestore using v9+ syntax on page open
  useEffect(() => {
    async function fetchCurrentProvider() {
      try {
        setIsLoading(true);

        // Target the specific document using the new doc() function structure
        const docRef = doc(db, "settings", "delivery");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.provider) {
            setSelectedSystem(data.provider);
          }
        }
      } catch (err) {
        console.error("Firestore loading error:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchCurrentProvider();
  }, []);

  // Save selection using v9+ setDoc with merge configuration
  const handleSaveSettings = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const docRef = doc(db, "settings", "delivery");

      // Updates or inserts the "provider" value without deleting other fields in the document
      await setDoc(docRef, { provider: selectedSystem }, { merge: true });

      setStatusMessage("success");
    } catch (err) {
      console.error("Firestore save error:", err);
      setStatusMessage("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
        <span className="text-sm">
          Fetching delivery engine configurations...
        </span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 text-slate-200 min-h-screen bg-slate-900">
      {/* Header Section */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Workflow className="text-blue-500 w-6 h-6" />
          Data Delivery Settings
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Choose and change which external system our platform uses to deliver
          data bundles to customers.
        </p>
      </div>

      {/* Main Settings Control Panel */}
      <div className="bg-slate-950/40 backdrop-blur-md border border-slate-800/60 p-6 rounded-2xl max-w-2xl space-y-6">
        <div className="flex items-center gap-2">
          <Server className="text-blue-500 w-5 h-5" />
          <div>
            <h2 className="text-md font-semibold text-white">
              Active Delivery Sender
            </h2>
            <p className="text-xs text-slate-400">
              All automated background data deliveries will use the system
              selected below.
            </p>
          </div>
        </div>

        {/* Option Selectors */}
        <div className="space-y-3">
          {systemOptions.map((option) => {
            const isSelected = selectedSystem === option.id;
            return (
              <div
                key={option.id}
                onClick={() => {
                  if (!isSaving) {
                    setSelectedSystem(option.id);
                    setStatusMessage(null);
                  }
                }}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                  isSaving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                } ${
                  isSelected
                    ? "bg-blue-950/30 border-blue-500/50 shadow-md shadow-blue-500/5"
                    : "bg-slate-900/40 border-slate-800/80 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {option.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      {option.description}
                    </p>
                  </div>
                </div>

                {/* Circle Checkmark indicator */}
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-slate-700"
                  }`}
                >
                  {isSelected && (
                    <CheckCircle2
                      size={14}
                      className="text-slate-950 stroke-[3]"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button & Status Bar Area */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-800/60">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-blue-600/10 min-w-[165px]"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving to Firestore...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Changes
              </>
            )}
          </button>

          {/* User Feedback Status Boxes */}
          {statusMessage === "success" && (
            <div className="flex items-center gap-2 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-2 rounded-lg">
              <CheckCircle2 size={14} />
              <span>
                Database updated! Live orders will now stream to this
                destination.
              </span>
            </div>
          )}

          {statusMessage === "error" && (
            <div className="flex items-center gap-2 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-2 rounded-lg">
              <AlertCircle size={14} />
              <span>
                Could not reach Firestore. Check rules configurations.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Help Tip */}
      <div className="max-w-2xl bg-slate-950/20 border border-slate-800/40 p-4 rounded-xl flex gap-3 items-start">
        <HelpCircle size={16} className="text-slate-400 mt-0.5 shrink-0" />
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong>Note:</strong> Changing this setting updates the system field
          immediately upon saving. The background job reads the identical
          `provider` key dynamically for every upcoming queue item.
        </p>
      </div>
    </div>
  );
}
