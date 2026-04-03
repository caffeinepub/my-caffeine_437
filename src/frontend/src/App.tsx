import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Loader2,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  Printer,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// html2canvas is loaded from CDN in index.html
declare const html2canvas: (
  element: HTMLElement,
  options?: {
    scale?: number;
    useCORS?: boolean;
    allowTaint?: boolean;
    backgroundColor?: string | null;
    logging?: boolean;
  },
) => Promise<HTMLCanvasElement>;

type MedicineType = "ট্যাবলেট" | "সিরাপ" | "ক্যাপসুল" | "ড্রপ";
type UnitLabel = "টি" | "পিস" | "বক্স" | "প্যাকেট" | "পাতা";

const UNIT_OPTIONS: UnitLabel[] = ["টি", "পিস", "বক্স", "প্যাকেট", "পাতা"];

type InvoiceRow = {
  id: string;
  medicineName: string;
  type: MedicineType;
  quantity: string;
  unitLabel: UnitLabel;
  units: string;
  unitPrice: string;
  totalPrice: string;
};

type Wholesaler = {
  name: string;
  address: string;
  mobile: string;
};

const MEDICINE_STORAGE_KEY = "saum_pharmacy_medicines";

// Consistent field style applied to ALL inputs and selects
const FIELD_STYLE: React.CSSProperties = {
  height: "40px",
  fontSize: "14px",
  padding: "8px 10px",
  color: "#1e293b",
  fontWeight: "500",
  backgroundColor: "#ffffff",
};

function getUnitLabel(type: MedicineType): string {
  if (type === "ট্যাবলেট" || type === "ক্যাপসুল") return "mg";
  return "ml";
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const nnn = Math.floor(Math.random() * 900) + 100;
  return `INV-${yyyy}${mm}${dd}-${nnn}`;
}

function loadMedicinesFromStorage(): string[] {
  try {
    const stored = localStorage.getItem(MEDICINE_STORAGE_KEY);
    if (stored) return JSON.parse(stored) as string[];
  } catch {
    // ignore
  }
  return [];
}

function saveMedicineToStorage(name: string) {
  if (!name.trim()) return;
  try {
    const existing = loadMedicinesFromStorage();
    const deduped = Array.from(new Set([name.trim(), ...existing])).slice(
      0,
      200,
    );
    localStorage.setItem(MEDICINE_STORAGE_KEY, JSON.stringify(deduped));
  } catch {
    // ignore
  }
}

function calcTotal(unitPrice: string, units: string): string {
  const price = Number.parseFloat(unitPrice);
  const qty = Number.parseInt(units, 10);
  if (!Number.isNaN(price) && !Number.isNaN(qty) && qty > 0) {
    return (price * qty).toFixed(2);
  }
  return "";
}

function createEmptyRow(): InvoiceRow {
  return {
    id: crypto.randomUUID(),
    medicineName: "",
    type: "ট্যাবলেট",
    quantity: "",
    unitLabel: "টি",
    units: "",
    unitPrice: "",
    totalPrice: "",
  };
}

const INITIAL_ROWS: InvoiceRow[] = [
  createEmptyRow(),
  createEmptyRow(),
  createEmptyRow(),
];

function MedicineNameInput({
  value,
  rowId,
  index,
  onChange,
  onBlur,
}: {
  value: string;
  rowId: string;
  index: number;
  onChange: (id: string, val: string) => void;
  onBlur: (name: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateSuggestions = useCallback((val: string) => {
    if (!val.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    const all = loadMedicinesFromStorage();
    const filtered = all
      .filter((m) => m.toLowerCase().includes(val.toLowerCase()))
      .slice(0, 6);
    setSuggestions(filtered);
    setIsOpen(filtered.length > 0);
    setActiveIndex(-1);
  }, []);

  function handleChange(val: string) {
    onChange(rowId, val);
    updateSuggestions(val);
  }

  function handleBlur() {
    setTimeout(() => {
      setIsOpen(false);
      onBlur(value);
    }, 150);
  }

  function handleSuggestionClick(suggestion: string) {
    onChange(rowId, suggestion);
    setIsOpen(false);
    setSuggestions([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="ঔষধের নাম..."
        className="print-input w-full border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring overflow-x-auto"
        style={{ ...FIELD_STYLE, whiteSpace: "nowrap" }}
        data-ocid={`invoice.medicine_name.input.${index + 1}`}
        autoComplete="off"
      />
      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-border rounded-md shadow-lg min-w-full"
          style={{ maxHeight: "160px", overflowY: "auto" }}
        >
          {suggestions.map((suggestion, i) => (
            <div
              key={suggestion}
              onMouseDown={() => handleSuggestionClick(suggestion)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === activeIndex
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [wholesaler, setWholesaler] = useState<Wholesaler>({
    name: "",
    address: "",
    mobile: "",
  });
  const [rows, setRows] = useState<InvoiceRow[]>(INITIAL_ROWS);
  const [invoiceNumber] = useState<string>(() => generateInvoiceNumber());
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const today = new Date().toLocaleDateString("bn-BD", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const grandTotal = rows.reduce((sum, row) => {
    const val = Number.parseFloat(row.totalPrice);
    return sum + (Number.isNaN(val) ? 0 : val);
  }, 0);

  // tableFontStyle is only used for non-input elements (td text, th headers)
  const tableFontStyle = useMemo(() => {
    const count = rows.length;
    if (count <= 10) return { fontSize: "14px" };
    if (count <= 15) return { fontSize: "12px" };
    if (count <= 22) return { fontSize: "10px" };
    return { fontSize: "8px" };
  }, [rows.length]);

  function updateRow(id: string, field: keyof InvoiceRow, value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "unitPrice" || field === "units") {
          const newUnitPrice = field === "unitPrice" ? value : row.unitPrice;
          const newUnits = field === "units" ? value : row.units;
          updated.totalPrice = calcTotal(newUnitPrice, newUnits);
        }
        return updated;
      }),
    );
  }

  function updateRowType(id: string, value: MedicineType) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, type: value } : row)),
    );
  }

  function updateRowUnitLabel(id: string, value: UnitLabel) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, unitLabel: value } : row)),
    );
  }

  function addRow() {
    setRows((prev) => [...prev, createEmptyRow()]);
  }

  function deleteRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  function handleMedicineBlur(name: string) {
    if (name.trim()) saveMedicineToStorage(name);
  }

  function handlePrint() {
    window.print();
  }

  async function handlePdfDownload() {
    setIsPdfLoading(true);
    try {
      const invoiceEl = document.getElementById("invoice-content");
      if (!invoiceEl) return;

      // Temporarily hide no-print elements inside invoice content during capture
      const noPrintEls = Array.from(invoiceEl.querySelectorAll(".no-print"));
      const originalDisplays: string[] = [];
      for (const el of noPrintEls) {
        const htmlEl = el as HTMLElement;
        originalDisplays.push(htmlEl.style.display);
        htmlEl.style.display = "none";
      }

      const canvas = await html2canvas(invoiceEl, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Restore hidden elements
      for (let i = 0; i < noPrintEls.length; i++) {
        (noPrintEls[i] as HTMLElement).style.display = originalDisplays[i];
      }

      // Convert canvas to PNG blob and trigger download
      canvas.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `saum-pharmacy-invoice-${invoiceNumber}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        },
        "image/png",
        1.0,
      );
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("ডাউনলোডে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsPdfLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen print-wrapper"
      style={{ background: "oklch(0.963 0.012 220)" }}
    >
      {/* Premium Header Banner */}
      <div className="invoice-header-banner no-print">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="pharmacy-logo-icon">
              <span className="text-2xl">⚕</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-wide">
                Saum Pharmacy
              </h1>
              <p className="text-blue-100 text-sm font-medium">
                ইনভয়েস ম্যানেজমেন্ট সিস্টেম
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-blue-100 text-sm">{today}</p>
            <span className="inline-block mt-1 bg-white/20 text-white text-xs font-mono px-3 py-1 rounded-full border border-white/30">
              {invoiceNumber}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Action buttons */}
        <div className="flex justify-end gap-3 mb-6 no-print">
          <Button
            onClick={handlePdfDownload}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-md border-0"
            disabled={isPdfLoading}
            data-ocid="invoice.pdf_download.button"
          >
            {isPdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isPdfLoading ? "তৈরি হচ্ছে..." : "PDF ডাউনলোড"}
          </Button>
          <Button
            onClick={handlePrint}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0"
            data-ocid="invoice.print_button"
          >
            <Printer className="h-4 w-4" />
            ইনভয়েস প্রিন্ট করুন
          </Button>
        </div>

        {/* Invoice Content */}
        <div id="invoice-content" className="invoice-content-wrapper">
          {/* Top header bar inside invoice */}
          <div className="invoice-inner-header">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-xl">
                  ⚕
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Saum Pharmacy
                  </h2>
                  <p className="text-blue-100 text-xs">
                    সাওম ফার্মেসি — বালিগাঁও, লাখাই, হবিগঞ্জ
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-blue-100 text-xs mb-1">{today}</p>
                <span className="text-white text-xs font-mono bg-white/20 px-2 py-0.5 rounded">
                  {invoiceNumber}
                </span>
              </div>
            </div>
          </div>

          {/* Two-column info section */}
          <div
            className="grid gap-5 mb-5 p-5"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            {/* Left: Wholesaler Inputs */}
            <div
              className="wholesaler-card rounded-xl shadow-lg border-0 overflow-hidden"
              data-ocid="wholesaler.card"
            >
              <div className="wholesaler-card-header px-5 py-3 flex items-center gap-2">
                <div className="w-6 h-6 bg-teal-400/30 rounded flex items-center justify-center">
                  <span className="text-teal-200 text-xs font-bold">W</span>
                </div>
                <h2 className="text-sm font-bold text-teal-800">হোলসেলার তথ্য</h2>
              </div>
              <div className="px-5 py-4 space-y-3 bg-white">
                <div>
                  <Label
                    htmlFor="wholesaler-name"
                    className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wide"
                  >
                    হোলসেলার/পাইকারের নাম
                  </Label>
                  <div
                    className="overflow-x-auto"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <Input
                      id="wholesaler-name"
                      type="text"
                      placeholder="নাম লিখুন..."
                      value={wholesaler.name}
                      onChange={(e) =>
                        setWholesaler((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="print-input border-slate-200 focus:border-teal-400 focus:ring-teal-400"
                      style={{ ...FIELD_STYLE, minWidth: "100%" }}
                      data-ocid="wholesaler.name.input"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="wholesaler-address"
                    className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wide"
                  >
                    ঠিকানা
                  </Label>
                  <div
                    className="overflow-x-auto"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <Input
                      id="wholesaler-address"
                      type="text"
                      placeholder="ঠিকানা লিখুন..."
                      value={wholesaler.address}
                      onChange={(e) =>
                        setWholesaler((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      className="print-input border-slate-200 focus:border-teal-400 focus:ring-teal-400"
                      style={{ ...FIELD_STYLE, minWidth: "100%" }}
                      data-ocid="wholesaler.address.input"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="wholesaler-mobile"
                    className="text-xs font-semibold text-slate-500 mb-1 block uppercase tracking-wide"
                  >
                    মোবাইল নম্বর
                  </Label>
                  <div
                    className="overflow-x-auto"
                    style={{ whiteSpace: "nowrap" }}
                  >
                    <Input
                      id="wholesaler-mobile"
                      type="tel"
                      placeholder="মোবাইল নম্বর লিখুন..."
                      value={wholesaler.mobile}
                      onChange={(e) =>
                        setWholesaler((prev) => ({
                          ...prev,
                          mobile: e.target.value,
                        }))
                      }
                      className="print-input border-slate-200 focus:border-teal-400 focus:ring-teal-400"
                      style={{ ...FIELD_STYLE, minWidth: "100%" }}
                      data-ocid="wholesaler.mobile.input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Fixed Pharmacy Info */}
            <div
              className="pharmacy-card rounded-xl shadow-lg border-0 overflow-hidden"
              data-ocid="pharmacy.info.card"
            >
              <div className="pharmacy-card-header px-5 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      Saum Pharmacy
                    </h2>
                    <p className="text-blue-100 text-xs">সাওম ফার্মেসি</p>
                  </div>
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <span className="text-white text-lg">⚕</span>
                  </div>
                </div>
              </div>
              <div className="bg-white">
                <table
                  className="w-full text-sm"
                  style={{ borderCollapse: "separate", borderSpacing: "0" }}
                >
                  <tbody>
                    <tr className="pharmacy-info-row-even">
                      <td className="px-4 py-2.5 font-semibold text-slate-500 w-28 align-middle">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                          <span>ঠিকানা</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">
                        <div
                          style={{
                            overflowX: "auto",
                            whiteSpace: "nowrap",
                            maxWidth: "160px",
                          }}
                        >
                          বালিগাঁও, লাখাই, হবিগঞ্জ
                        </div>
                      </td>
                    </tr>
                    <tr className="pharmacy-info-row-odd">
                      <td className="px-4 py-2.5 font-semibold text-slate-500 w-28 align-middle">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                          <span>মোবাইল</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium font-mono">
                        <div
                          style={{
                            overflowX: "auto",
                            whiteSpace: "nowrap",
                            maxWidth: "160px",
                          }}
                        >
                          01648388329
                        </div>
                      </td>
                    </tr>
                    <tr className="pharmacy-info-row-even">
                      <td className="px-4 py-2.5 font-semibold text-slate-500 w-28 align-middle">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                          <span>ইমেইল</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium">
                        <div
                          style={{
                            overflowX: "auto",
                            whiteSpace: "nowrap",
                            maxWidth: "160px",
                          }}
                        >
                          <a
                            href="mailto:saumpharmacy@gmail.com"
                            className="text-blue-600 hover:underline"
                          >
                            saumpharmacy@gmail.com
                          </a>
                        </div>
                      </td>
                    </tr>
                    <tr className="pharmacy-info-row-odd">
                      <td className="px-4 py-2.5 font-semibold text-slate-500 w-28 align-middle">
                        তারিখ
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 font-medium">
                        <div
                          style={{
                            overflowX: "auto",
                            whiteSpace: "nowrap",
                            maxWidth: "160px",
                          }}
                        >
                          {today}
                        </div>
                      </td>
                    </tr>
                    <tr className="pharmacy-info-row-even">
                      <td className="px-4 py-2.5 font-semibold text-slate-500 w-28 align-middle">
                        ইনভয়েস নং
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 font-mono font-semibold text-xs">
                        <div
                          style={{
                            overflowX: "auto",
                            whiteSpace: "nowrap",
                            maxWidth: "160px",
                          }}
                        >
                          {invoiceNumber}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Invoice Table Card */}
          <div
            className="mx-5 mb-5 rounded-xl shadow-lg overflow-hidden invoice-table-wrapper"
            data-ocid="invoice.table.card"
          >
            <div className="table-section-header px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-5 bg-cyan-300 rounded-full" />
                <h2 className="text-sm font-bold text-white">ঔষধের তালিকা</h2>
              </div>
              <span className="text-blue-200 text-xs">
                {rows.length} টি আইটেম
              </span>
            </div>

            <div className="overflow-x-auto bg-white">
              <table
                className="w-full"
                style={tableFontStyle}
                data-ocid="invoice.table"
              >
                <thead>
                  <tr className="invoice-table-thead">
                    <th
                      className="px-3 py-3 text-center font-semibold w-10 text-white"
                      style={tableFontStyle}
                    >
                      ক্রমিক
                    </th>
                    <th
                      className="px-3 py-3 text-left font-semibold text-white"
                      style={tableFontStyle}
                    >
                      ঔষধের নাম
                    </th>
                    <th
                      className="px-3 py-3 text-left font-semibold w-28 text-white"
                      style={tableFontStyle}
                    >
                      ধরন
                    </th>
                    <th
                      className="px-3 py-3 text-left font-semibold w-40 text-white"
                      style={tableFontStyle}
                    >
                      মাপ
                    </th>
                    <th
                      className="px-3 py-3 text-right font-semibold w-24 text-white"
                      style={tableFontStyle}
                    >
                      দর (টাকা)
                    </th>
                    <th
                      className="px-3 py-3 text-right font-semibold w-24 text-white"
                      style={tableFontStyle}
                    >
                      পরিমাণ
                    </th>
                    <th
                      className="px-3 py-3 text-center font-semibold w-24 text-white"
                      style={tableFontStyle}
                    >
                      একক
                    </th>
                    <th
                      className="px-3 py-3 text-right font-semibold w-24 text-white"
                      style={tableFontStyle}
                    >
                      দাম (টাকা)
                    </th>
                    <th
                      className="px-3 py-3 text-center font-semibold w-10 no-print text-white"
                      style={tableFontStyle}
                    >
                      মুছুন
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={`border-b border-slate-100 hover:bg-blue-50/60 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-blue-50/40"
                      }`}
                      data-ocid={`invoice.item.${index + 1}`}
                    >
                      <td
                        className="px-3 py-2 text-center font-semibold text-slate-400"
                        style={tableFontStyle}
                      >
                        {index + 1}
                      </td>
                      <td className="px-3 py-2">
                        <MedicineNameInput
                          value={row.medicineName}
                          rowId={row.id}
                          index={index}
                          onChange={(id, val) =>
                            updateRow(id, "medicineName", val)
                          }
                          onBlur={handleMedicineBlur}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={row.type}
                          onValueChange={(val) =>
                            updateRowType(row.id, val as MedicineType)
                          }
                        >
                          <SelectTrigger
                            className="print-select border-slate-200"
                            style={{ ...FIELD_STYLE, color: "#1e293b" }}
                            data-ocid={`invoice.type.select.${index + 1}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ট্যাবলেট">ট্যাবলেট</SelectItem>
                            <SelectItem value="সিরাপ">সিরাপ</SelectItem>
                            <SelectItem value="ক্যাপসুল">ক্যাপসুল</SelectItem>
                            <SelectItem value="ড্রপ">ড্রপ</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              updateRow(row.id, "quantity", e.target.value)
                            }
                            placeholder=""
                            className="print-input w-full min-w-[64px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                            style={FIELD_STYLE}
                            data-ocid={`invoice.quantity.input.${index + 1}`}
                          />
                          <span
                            className="font-medium text-slate-500 whitespace-nowrap bg-slate-100 px-2 rounded flex items-center self-stretch"
                            style={{
                              fontSize: "12px",
                              minWidth: "32px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {getUnitLabel(row.type)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.unitPrice}
                          onChange={(e) =>
                            updateRow(row.id, "unitPrice", e.target.value)
                          }
                          placeholder=""
                          className="print-input w-full border border-slate-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          style={FIELD_STYLE}
                          data-ocid={`invoice.unit_price.input.${index + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={row.units}
                          onChange={(e) =>
                            updateRow(row.id, "units", e.target.value)
                          }
                          placeholder=""
                          className="print-input w-full border border-slate-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          style={FIELD_STYLE}
                          data-ocid={`invoice.units.input.${index + 1}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={row.unitLabel}
                          onValueChange={(val) =>
                            updateRowUnitLabel(row.id, val as UnitLabel)
                          }
                        >
                          <SelectTrigger
                            className="print-select border-slate-200"
                            style={{ ...FIELD_STYLE, color: "#1e293b" }}
                            data-ocid={`invoice.unit_label.select.${index + 1}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td
                        className="px-3 py-2 text-right font-semibold text-emerald-700"
                        style={tableFontStyle}
                        data-ocid={`invoice.total_price.input.${index + 1}`}
                      >
                        {row.totalPrice ? `৳${row.totalPrice}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-center no-print">
                        <button
                          type="button"
                          onClick={() => deleteRow(row.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors"
                          aria-label="সারি মুছুন"
                          data-ocid={`invoice.delete_button.${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-4 py-8 text-center text-slate-400 text-sm"
                        data-ocid="invoice.table.empty_state"
                      >
                        কোনো ঔষধ যোগ করা হয়নি। নিচের বোতাম দিয়ে সারি যোগ করুন।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table footer: add row + grand total */}
            <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-50 to-blue-50 border-t border-slate-100">
              <Button
                onClick={addRow}
                variant="outline"
                size="sm"
                className="no-print gap-2 text-teal-700 border-teal-300 hover:bg-teal-50 bg-white shadow-sm"
                data-ocid="invoice.add_row.button"
              >
                <PlusCircle className="h-4 w-4" />
                সারি যোগ করুন
              </Button>
              <div
                className="grand-total-badge flex items-center gap-3"
                data-ocid="invoice.grand_total.panel"
              >
                <span className="text-slate-500 font-medium text-sm">
                  সর্বমোট:
                </span>
                <span className="text-2xl font-bold text-emerald-600">
                  ৳{grandTotal.toFixed(2)}
                </span>
                <span className="text-xs text-slate-400 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  টাকা
                </span>
              </div>
            </div>
          </div>

          {/* Signature and Seal Section */}
          <div
            className="mx-5 mb-5 grid gap-5"
            style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
          >
            {/* Receiver Signature */}
            <div className="signature-seal-box rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
              <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-600 text-center uppercase tracking-wide">
                  গ্রহীতার স্বাক্ষর
                </p>
              </div>
              <div
                className="px-4 py-6 flex flex-col items-center justify-end"
                style={{ minHeight: "80px" }}
              >
                <div className="w-full border-t-2 border-slate-400 mt-4" />
                <p className="text-xs text-slate-400 mt-1 text-center">
                  স্বাক্ষর ও তারিখ
                </p>
              </div>
            </div>

            {/* Authorized Signature */}
            <div className="signature-seal-box rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
              <div className="px-4 py-2 bg-gradient-to-r from-teal-50 to-cyan-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-600 text-center uppercase tracking-wide">
                  অনুমোদিত স্বাক্ষর
                </p>
              </div>
              <div
                className="px-4 py-6 flex flex-col items-center justify-end"
                style={{ minHeight: "80px" }}
              >
                <div className="w-full border-t-2 border-slate-400 mt-4" />
                <p className="text-xs text-slate-400 mt-1 text-center">
                  Saum Pharmacy
                </p>
              </div>
            </div>

            {/* Official Seal */}
            <div className="signature-seal-box rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden">
              <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-slate-200">
                <p className="text-xs font-semibold text-slate-600 text-center uppercase tracking-wide">
                  অফিসিয়াল সিল
                </p>
              </div>
              <div
                className="px-4 py-6 flex flex-col items-center justify-center"
                style={{ minHeight: "80px" }}
              >
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-slate-300 flex items-center justify-center">
                  <p className="text-xs text-slate-300 text-center leading-tight">
                    সিল
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice footer inside content */}
          <div className="invoice-footer-bar mx-5 mb-5 rounded-lg px-5 py-3">
            <p className="text-center text-xs text-blue-200">
              Saum Pharmacy — বালিগাঁও, লাখাই, হবিগঞ্জ &nbsp;|&nbsp; 01648388329
              &nbsp;|&nbsp; saumpharmacy@gmail.com
            </p>
          </div>
        </div>

        {/* Bottom actions bar */}
        <div className="flex justify-end gap-3 mt-4 no-print">
          <Button
            onClick={handlePdfDownload}
            className="gap-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg border-0"
            size="lg"
            disabled={isPdfLoading}
            data-ocid="invoice.pdf_submit.button"
          >
            {isPdfLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            {isPdfLoading ? "তৈরি হচ্ছে..." : "PDF ডাউনলোড"}
          </Button>
          <Button
            onClick={handlePrint}
            className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg border-0"
            size="lg"
            data-ocid="invoice.print_submit.button"
          >
            <Printer className="h-5 w-5" />
            ইনভয়েস প্রিন্ট করুন
          </Button>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-border text-center no-print">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              caffeine.ai
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
