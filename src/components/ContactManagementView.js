import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
  limit,
  orderBy,
  serverTimestamp,
  writeBatch,
  getCountFromServer,
  doc,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Phone,
  Download,
  Upload,
  Users,
  RefreshCcw,
  ShieldCheck,
  Plus,
  ShoppingBag,
  UserCheck,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function ContactManagementView() {
  // State for metrics & data readiness
  const [purchaseContacts, setPurchaseContacts] = useState([]);
  const [salesContacts, setSalesContacts] = useState([]);
  const [agentContacts, setAgentContacts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [whitelistCount, setWhitelistCount] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [singleNumber, setSingleNumber] = useState("");
  const [addingSingle, setAddingSingle] = useState(false);

  // Helper function to validate and format phone numbers to 233 format
  const formatTo233 = (numStr) => {
    let clean = String(numStr).replace(/\D/g, "").trim();
    if (clean.startsWith("233")) {
      return clean;
    } else if (clean.startsWith("0")) {
      return "233" + clean.substring(1);
    }
    return null;
  };

  // Fetch data pools for preparing exports
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Whitelist Count
      const whitelistColl = collection(db, "echowhitelist");
      const countSnapshot = await getCountFromServer(whitelistColl);
      setWhitelistCount(countSnapshot.data().count);

      // 2. Fetch Purchases (extracting phoneNumber)
      const purchasesRef = collection(db, "echodata_purchases");
      const purchaseQ = query(
        purchasesRef,
        orderBy("createdAt", "desc"),
        limit(500),
      );
      const purchaseSnap = await getDocs(purchaseQ);
      const uniquePurchases = new Set();
      purchaseSnap.forEach((doc) => {
        const data = doc.data();
        if (data.phoneNumber)
          uniquePurchases.add(
            formatTo233(data.phoneNumber) || data.phoneNumber,
          );
      });
      setPurchaseContacts(Array.from(uniquePurchases));

      // 3. Fetch Sales (extracting payerPhone)
      const salesRef = collection(db, "echo_sales");
      const salesQ = query(salesRef, orderBy("createdAt", "desc"), limit(500));
      const salesSnap = await getDocs(salesQ);
      const uniqueSales = new Set();
      salesSnap.forEach((doc) => {
        const data = doc.data();
        if (data.payerPhone)
          uniqueSales.add(formatTo233(data.payerPhone) || data.payerPhone);
      });
      setSalesContacts(Array.from(uniqueSales));

      // 4. Fetch Agents (extracting phone)
      const agentsRef = collection(db, "echoagents");
      const agentsSnap = await getDocs(agentsRef); // Typically fewer agents; pulling without limit fallback
      const uniqueAgents = new Set();
      agentsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.phone) uniqueAgents.add(formatTo233(data.phone) || data.phone);
      });
      setAgentContacts(Array.from(uniqueAgents));
    } catch (err) {
      console.error("Error aggregating export contacts: ", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Unified export utility handler
  const exportToTxt = (dataset, filenameLabel) => {
    if (dataset.length === 0) {
      alert("No numbers compiled to export for this category.");
      return;
    }
    const phoneNumbers = dataset.join("\n");
    const blob = new Blob([phoneNumbers], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameLabel}_export_${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Handle Single Number Submission with 233 Check
  const handleSingleUpload = async (e) => {
    e.preventDefault();
    const validatedNumber = formatTo233(singleNumber);

    if (!validatedNumber) {
      alert(
        "Invalid format! Number must start with 233 or a valid local 0 digit.",
      );
      return;
    }

    setAddingSingle(true);
    try {
      const docRef = doc(db, "echowhitelist", validatedNumber);
      await setDoc(docRef, {
        phoneNumber: validatedNumber,
        addedAt: serverTimestamp(),
        source: "single_input",
      });

      setSingleNumber("");
      alert(`${validatedNumber} successfully added to whitelist!`);
      fetchAllData();
    } catch (err) {
      alert("Failed to whitelist number: " + err.message);
    } finally {
      setAddingSingle(false);
    }
  };

  // Handle Whitelist Bulk File Upload with 233 Processing
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        let rawNumbers = [];
        const filename = file.name.toLowerCase();

        if (
          filename.endsWith(".xlsx") ||
          filename.endsWith(".xls") ||
          filename.endsWith(".csv")
        ) {
          const workbook = XLSX.read(evt.target.result, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
          });
          rawNumbers = data.flat();
        } else {
          rawNumbers = evt.target.result.split(/\r?\n/);
        }

        const validNumbers = [];
        let skippedCount = 0;

        rawNumbers.forEach((raw) => {
          if (!raw) return;
          const formatted = formatTo233(raw);
          if (formatted) {
            validNumbers.push(formatted);
          } else {
            skippedCount++;
          }
        });

        if (validNumbers.length === 0) {
          alert("No valid numbers starting with 233 or 0 found in the file.");
          setUploading(false);
          return;
        }

        // Firestore Batch Upload
        const batch = writeBatch(db);
        validNumbers.forEach((num) => {
          const docRef = doc(db, "echowhitelist", num);
          batch.set(docRef, {
            phoneNumber: num,
            addedAt: serverTimestamp(),
            source: "bulk_upload",
          });
        });

        await batch.commit();

        let reportMsg = `Successfully processed file!\n- Whitelisted: ${validNumbers.length} contacts.`;
        if (skippedCount > 0) {
          reportMsg += `\n- Skipped: ${skippedCount} entries due to invalid numbering format.`;
        }
        alert(reportMsg);

        fetchAllData();
      } catch (err) {
        alert("Upload failed: " + err.message);
      } finally {
        setUploading(false);
        e.target.value = null;
      }
    };

    if (file.name.endsWith(".txt")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto text-slate-100">
      {/* Upper Control Panel */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Users className="text-blue-500" /> Data Exporter & Whitelisting
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Data aggregates running in the background. Ready for immediate
            exports.
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Quick Single Whitelist System */}
          <form
            onSubmit={handleSingleUpload}
            className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 focus-within:border-emerald-500/50 transition-all"
          >
            <input
              type="text"
              placeholder="Whitelist e.g. 0549..."
              value={singleNumber}
              onChange={(e) => setSingleNumber(e.target.value)}
              disabled={addingSingle}
              className="bg-transparent px-2 py-1 text-sm outline-none w-full sm:w-48 text-slate-200 placeholder:text-slate-600"
            />
            <button
              type="submit"
              disabled={addingSingle || !singleNumber.trim()}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 rounded-lg text-white transition-colors"
            >
              {addingSingle ? (
                <RefreshCcw size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
            </button>
          </form>

          {/* Upload Whitelist Button */}
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold cursor-pointer transition-all">
            {uploading ? (
              <RefreshCcw className="animate-spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
            Bulk Whitelist
            <input
              type="file"
              className="hidden"
              accept=".txt,.csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Monitoring Section & Export Engines */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-32 bg-slate-800/30 animate-pulse rounded-2xl border border-slate-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Whitelist Tracker Card */}
          <div className="bg-slate-950/40 border border-emerald-800/40 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium text-sm">
                Whitelist Database
              </span>
              <ShieldCheck className="text-emerald-500" size={22} />
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-black text-emerald-400">
                {whitelistCount}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Total live Whitelisted records
              </p>
            </div>
          </div>

          {/* Purchases Export Card */}
          <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium text-sm">
                UzoCode Contacts
              </span>
              <Phone className="text-blue-500" size={20} />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-100">
                  {purchaseContacts.length}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Field: phoneNumber
                </p>
              </div>
              <button
                onClick={() =>
                  exportToTxt(purchaseContacts, "purchases_contacts")
                }
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-blue-400"
                title="Export Purchases to TXT"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Sales Export Card */}
          <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium text-sm">
                MoolreCode Contacts
              </span>
              <ShoppingBag className="text-amber-500" size={20} />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-100">
                  {salesContacts.length}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Field: payerPhone</p>
              </div>
              <button
                onClick={() => exportToTxt(salesContacts, "sales_contacts")}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-amber-400"
                title="Export Sales to TXT"
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Agent Export Card */}
          <div className="bg-slate-950/40 border border-slate-800 p-6 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium text-sm">
                Agent Contacts
              </span>
              <UserCheck className="text-purple-500" size={20} />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-100">
                  {agentContacts.length}
                </h3>
                <p className="text-xs text-slate-500 mt-1">Field: phone</p>
              </div>
              <button
                onClick={() => exportToTxt(agentContacts, "agents_contacts")}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-purple-400"
                title="Export Agents to TXT"
              >
                <Download size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
