import React, { useState, useEffect } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase"; // Adjust your firebase path as needed
import {
  Menu,
  LogOut,
  ShieldCheck,
  Lock,
  Mail,
  UserPlus,
  LogIn,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import PricingView from "./components/PricingView";
import ContactManagementView from "./components/ContactManagementView";
import AgentManagement from "./components/AgentManagement";
import DataRouting from "./components/DataRouting"; // Import the new DataRouting component

function App() {
  const [adminUser, setAdminUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auth Form State Controls
  // mode options: 'login' | 'signup' | 'forgot'
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Monitor Admin User State Globally
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Handle Logins, Signups, and Password Reset Requests
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    try {
      if (authMode === "signup") {
        // Create Admin user account
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        // Securely provision this UID to the "admins" root collection right away
        await setDoc(doc(db, "echo-admins", userCredential.user.uid), {
          email: userCredential.user.email,
          createdAt: new Date().toISOString(),
          role: "admin",
        });
      } else if (authMode === "login") {
        // Sign in existing administrator
        await signInWithEmailAndPassword(auth, email, password);
      } else if (authMode === "forgot") {
        // Trigger password reset email via Firebase Auth Engine
        await sendPasswordResetEmail(auth, email);
        setAuthSuccess(
          "A password reset link has been dispatched to your mailbox.",
        );
        setPassword("");
      }
    } catch (error) {
      console.error("Auth Failure:", error);
      // Clean up common firebase error text strings for the client view
      setAuthError(
        error.message
          .replace("Firebase: ", "")
          .replace("Error (auth/", "")
          .replace(").", ""),
      );
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout execution error:", error);
    }
  };

  const switchMode = (mode) => {
    setAuthMode(mode);
    setAuthError("");
    setAuthSuccess("");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-mono text-sm text-slate-500 tracking-widest">
        LOADING ADMIN INTERFACE CONSOLE...
      </div>
    );
  }

  // GATEWAY INTERCEPTOR: If not authenticated, render Login/Signup/Forgot Form UI
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-blue-500/30">
        <div className="bg-slate-950 border border-slate-800 p-8 rounded-2xl w-full max-w-md shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl flex items-center justify-center mx-auto shadow-inner">
              {authMode === "forgot" ? (
                <KeyRound size={26} />
              ) : (
                <ShieldCheck size={26} />
              )}
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {authMode === "signup" && "Register Admin Authority"}
              {authMode === "login" && "Secure System Gate"}
              {authMode === "forgot" && "Recover Administrator Key"}
            </h2>
            <p className="text-xs text-slate-500">
              {authMode === "signup" &&
                "Provision a brand new workspace administrator key"}
              {authMode === "login" && "Sign in to manage edge gateway agents"}
              {authMode === "forgot" &&
                "Provide your email address to receive credentials clearance instructions"}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg font-mono">
                {authError}
              </div>
            )}

            {authSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg font-mono">
                {authSuccess}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                <Mail size={12} /> Email Address
              </label>
              <input
                type="email"
                required
                placeholder="admin@domain.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-slate-700 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {authMode !== "forgot" && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Lock size={12} /> Master Security Key
                  </label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-[10px] font-semibold text-slate-500 hover:text-blue-400 transition"
                    >
                      Forgot Key?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required={authMode !== "forgot"}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-sm font-mono text-slate-200 focus:outline-none focus:border-slate-700 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm py-2.5 px-4 rounded-lg transition shadow-lg shadow-blue-600/10 flex items-center justify-center gap-2 mt-2"
            >
              {authMode === "signup" && <UserPlus size={16} />}
              {authMode === "login" && <LogIn size={16} />}
              {authMode === "forgot" && <KeyRound size={16} />}

              {authMode === "signup" && "Complete Provisioning"}
              {authMode === "login" && "Authorize Portal Session"}
              {authMode === "forgot" && "Send Clear Link"}
            </button>
          </form>

          <div className="border-t border-slate-850 pt-4 text-center flex flex-col items-center justify-center gap-2">
            {authMode === "forgot" ? (
              <button
                onClick={() => switchMode("login")}
                className="text-xs text-slate-400 hover:text-blue-400 transition flex items-center gap-1"
              >
                <ArrowLeft size={12} /> Back to Auth Entry Window
              </button>
            ) : (
              <button
                onClick={() =>
                  switchMode(authMode === "login" ? "signup" : "login")
                }
                className="text-xs text-slate-400 hover:text-blue-400 transition"
              >
                {authMode === "login"
                  ? "Need to initialize a new admin node? Sign Up"
                  : "Already have account privileges? Sign In"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // RUNTIME VISIBILITY: Render dashboard once admin identity matches verified claims
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
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-200">
                Active Admin Node
              </span>
              <span className="text-[10px] font-mono text-slate-500 max-w-[140px] truncate">
                {adminUser.email}
              </span>
            </div>

            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white uppercase border border-blue-500/30">
              {adminUser.email?.charAt(0) || "A"}
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/5 hover:border-rose-500/20 transition-all"
              title="Terminate Secure Session"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 flex-1">
          {activeTab === "dashboard" && <DashboardView />}
          {activeTab === "pricing" && <PricingView />}
          {activeTab === "contacts" && <ContactManagementView />}
          {activeTab === "agents" && <AgentManagement />}
          {activeTab === "routing" && <DataRouting />}
        </main>
      </div>
    </div>
  );
}

export default App;
