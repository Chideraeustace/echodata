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
  setDoc,
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
  Plus,
} from "lucide-react";
import * as XLSX from "xlsx";

export default function ContactManagementView() {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [whitelistCount, setWhitelistCount] = useState(0);
  const [uploading, setUploading] = useState(false);

  const [singleNumber, setSingleNumber] = useState("");
  const [addingSingle, setAddingSingle] = useState(false);

  // Helper function to validate and format phone numbers to 233 format
  const formatTo233 = (numStr) => {
    let clean = String(numStr).replace(/\D/g, "").trim(); // Remove any non-numeric characters

    if (clean.startsWith("233")) {
      return clean;
    } else if (clean.startsWith("0")) {
      return "233" + clean.substring(1);
    }
    return null; // Invalid format
  };

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

  // 3. Handle Single Number Submission with 233 Check
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
      fetchContacts(searchTerm);
    } catch (err) {
      alert("Failed to whitelist number: " + err.message);
    } finally {
      setAddingSingle(false);
    }
  };

  // 4. Handle Whitelist Bulk File Upload with 233 Processing
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

        // Process and filter valid numbers synchronously
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

        fetchContacts(searchTerm);
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
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 items-start lg:items-center">
        <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center w-full lg:w-auto">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <Users className="text-blue-500" /> Contact Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Total Unique Contacts Found:{" "}
              <span className="text-white font-bold">{contacts.length}</span>
            </p>
          </div>
          <div className="sm:pl-6 sm:border-l border-slate-800">
            <h2 className="text-2xl font-extrabold flex items-center gap-2">
              <ShieldCheck className="text-emerald-500" /> Whitelist
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Total Members:{" "}
              <span className="text-emerald-400 font-bold">
                {whitelistCount}
              </span>
            </p>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Quick Single Add Form */}
          <form
            onSubmit={handleSingleUpload}
            className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 focus-within:border-emerald-500/50 transition-all"
          >
            <input
              type="text"
              placeholder="e.g. 233549856098 or 0549..."
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

          {/* Export Button */}
          <button
            onClick={exportToTxt}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm transition-colors"
          >
            <Download size={16} /> Export TXT
          </button>

          {/* Upload Whitelist Button */}
          <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold cursor-pointer transition-all">
            {uploading ? (
              <RefreshCcw className="animate-spin" size={16} />
            ) : (
              <Upload size={16} />
            )}
            Bulk Upload
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
          placeholder="Search purchases by number..."
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
