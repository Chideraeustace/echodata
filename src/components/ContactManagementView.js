import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  getDocs,
  limit,
  orderBy,
  where,
  serverTimestamp,
  writeBatch,
  getCountFromServer,
  doc,
} from "firebase/firestore";
import { db } from "../firebase";
import {
  Search,
  Phone,
  Download,
  Upload,
  Users,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import * as XLSX from "xlsx"; // You'll need to run: npm install xlsx

export default function ContactManagementView() {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [whitelistCount, setWhitelistCount] = useState(0);
  const [uploading, setUploading] = useState(false);

  // 1. Fetch Contacts
  const fetchContacts = useCallback(async (search = "") => {
    setLoading(true);
    try {
        const whitelistColl = collection(db, "echowhitelist");
        const countSnapshot = await getCountFromServer(whitelistColl);
        setWhitelistCount(countSnapshot.data().count);

      let q;
      const contactsRef = collection(db, "echodata_purchases");
      if (search) {
        q = query(contactsRef, where("phoneNumber", "==", search), limit(50));
      } else {
        q = query(contactsRef, orderBy("createdAt", "desc"), limit(200));
      }

      const snap = await getDocs(q);
      const unique = [];
      const seen = new Set();

      snap.forEach((doc) => {
        const data = doc.data();
        if (!seen.has(data.phoneNumber)) {
          seen.add(data.phoneNumber);
          unique.push({ id: doc.id, ...data });
        }
      });
      setContacts(unique);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // 2. Export Contacts to TXT
  const exportToTxt = () => {
    const phoneNumbers = contacts.map((c) => c.phoneNumber).join("\n");
    const blob = new Blob([phoneNumbers], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `echodata_contacts_${new Date().toISOString().split("T")[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 3. Handle Whitelist File Upload (CSV, XLSX, TXT)
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        let numbers = [];
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
          numbers = data
            .flat()
            .filter((n) => n)
            .map((n) => String(n).trim());
        } else {
          // Plain TXT processing
          numbers = evt.target.result
            .split(/\r?\n/)
            .filter((n) => n.trim())
            .map((n) => n.trim());
        }

        // Firestore Batch Upload
        const batch = writeBatch(db);
        numbers.forEach((num) => {
          const newDocRef = doc(collection(db, "echowhitelist"));
          batch.set(newDocRef, {
            phoneNumber: num,
            addedAt: serverTimestamp(),
            source: "bulk_upload",
          });
        });

        await batch.commit();
        alert(`Successfully whitelisted ${numbers.length} contacts!`);
      } catch (err) {
        alert("Upload failed: " + err.message);
      } finally {
        setUploading(false);
        e.target.value = null; // Reset input
      }
    };

    if (file.name.endsWith(".txt")) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Users className="text-blue-500" /> Contact Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Total Unique Contacts Found:{" "}
            <span className="text-white font-bold">{contacts.length}</span>
          </p>
        </div>
        <div className="pl-6 border-l border-slate-800">
          <h2 className="text-2xl font-extrabold flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" /> Whitelist
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Total Members:{" "}
            <span className="text-emerald-400 font-bold">{whitelistCount}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Button */}
          <button
            onClick={exportToTxt}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition-colors"
          >
            <Download size={16} /> Export TXT
          </button>

          {/* Upload Whitelist Button */}
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold cursor-pointer transition-all">
            {uploading ? (
              <RefreshCcw className="animate-spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
            Whitelist Upload
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

      {/* Search Bar */}
      <div className="max-w-md relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          type="text"
          placeholder="Search by number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchContacts(searchTerm)}
          className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl outline-none focus:border-blue-500 transition-all text-sm"
        />
      </div>

      {/* Contacts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-slate-800/30 animate-pulse rounded-2xl border border-slate-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className="bg-slate-950/40 border border-slate-800/60 p-5 rounded-2xl flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="font-bold text-slate-100">
                    {contact.phoneNumber}
                  </p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                    Last activity:{" "}
                    {contact.createdAt?.toDate().toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
