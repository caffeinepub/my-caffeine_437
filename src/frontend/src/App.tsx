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
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Download, Loader2, PlusCircle, Printer, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type MedicineType = "ট্যাবলেট" | "সিরাপ" | "ক্যাপসুল" | "ড্রপ";

type InvoiceRow = {
  id: string;
  medicineName: string;
  type: MedicineType;
  quantity: string;
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
    units: "",
    unitPrice: "",
    totalPrice: "",
  };
}

const INITIAL_ROWS: InvoiceRow[] = [
  {
    id: crypto.randomUUID(),
    medicineName: "নাপা এক্সট্রা",
    type: "ট্যাবলেট",
    quantity: "500",
    units: "50",
    unitPrice: "1.50",
    totalPrice: calcTotal("1.50", "50"),
  },
  {
    id: crypto.randomUUID(),
    medicineName: "অ্যামোক্সিসিলিন",
    type: "ক্যাপসুল",
    quantity: "250",
    units: "30",
    unitPrice: "5.00",
    totalPrice: calcTotal("5.00", "30"),
  },
  {
    id: crypto.randomUUID(),
    medicineName: "মেট্রোনিডাজল সিরাপ",
    type: "সিরাপ",
    quantity: "200",
    units: "2",
    unitPrice: "45.00",
    totalPrice: calcTotal("45.00", "2"),
  },
  {
    id: crypto.randomUUID(),
    medicineName: "ওফ্লক্সাসিন ড্রপ",
    type: "ড্রপ",
    quantity: "5",
    units: "1",
    unitPrice: "80.00",
    totalPrice: calcTotal("80.00", "1"),
  },
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
        className="print-input w-full border border-border rounded px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
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

  const todayForPdf = new Date().toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const grandTotal = rows.reduce((sum, row) => {
    const val = Number.parseFloat(row.totalPrice);
    return sum + (Number.isNaN(val) ? 0 : val);
  }, 0);

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
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      const headerY = 14;
      const colWidth = contentWidth / 2 - 3;
      const leftX = margin;
      const rightX = margin + colWidth + 6;

      // Left column - Wholesaler info box
      pdf.setDrawColor(180, 180, 180);
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(leftX, headerY, colWidth, 42, 2, 2, "FD");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(60, 60, 60);
      pdf.text("Wholesaler Info", leftX + 4, headerY + 7);

      pdf.setLineWidth(0.3);
      pdf.setDrawColor(200, 200, 200);
      pdf.line(leftX + 4, headerY + 9, leftX + colWidth - 4, headerY + 9);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Name:", leftX + 4, headerY + 15);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(wholesaler.name || "-", leftX + 22, headerY + 15);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Address:", leftX + 4, headerY + 22);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      const addressText = wholesaler.address || "-";
      const addressLines = pdf.splitTextToSize(addressText, colWidth - 30);
      pdf.text(addressLines, leftX + 26, headerY + 22);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Mobile:", leftX + 4, headerY + 31);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(wholesaler.mobile || "-", leftX + 22, headerY + 31);

      // Right column - Saum Pharmacy info box (taller to fit email)
      pdf.setDrawColor(30, 100, 180);
      pdf.setFillColor(30, 100, 180);
      pdf.roundedRect(rightX, headerY, colWidth, 12, 2, 2, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Saum Pharmacy", rightX + 4, headerY + 8);

      pdf.setDrawColor(180, 180, 180);
      pdf.setFillColor(248, 249, 250);
      pdf.roundedRect(rightX, headerY + 12, colWidth, 38, 0, 0, "FD");
      pdf.roundedRect(rightX, headerY + 12, colWidth, 38, 2, 2, "D");

      const labelX = rightX + 4;
      const valueX = rightX + 26;
      pdf.setFontSize(9);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Address:", labelX, headerY + 19);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text("Baligaw, Lakhai, Habiganj", valueX, headerY + 19);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Mobile:", labelX, headerY + 26);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text("01648388329", valueX, headerY + 26);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Email:", labelX, headerY + 33);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text("saumpharmacy@gmail.com", valueX, headerY + 33);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Date:", labelX, headerY + 40);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(todayForPdf, valueX, headerY + 40);

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text("Invoice:", labelX, headerY + 47);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(invoiceNumber, valueX, headerY + 47);

      // ===== MEDICINE TABLE =====
      const tableStartY = headerY + 58;

      const tableRows = rows.map((row, i) => [
        String(i + 1),
        row.medicineName || "-",
        row.type,
        row.quantity ? `${row.quantity} ${getUnitLabel(row.type)}` : "-",
        row.unitPrice ? `${row.unitPrice}` : "-",
        row.units || "-",
        row.totalPrice ? `${row.totalPrice}` : "-",
      ]);

      autoTable(pdf, {
        startY: tableStartY,
        head: [
          [
            "#",
            "Medicine Name",
            "Type",
            "Size",
            "Unit Price (Tk)",
            "Qty",
            "Total (Tk)",
          ],
        ],
        body: tableRows,
        margin: { left: margin, right: margin },
        styles: {
          font: "helvetica",
          fontSize: 9,
          cellPadding: 3,
          lineColor: [200, 200, 200],
          lineWidth: 0.3,
        },
        headStyles: {
          fillColor: [30, 100, 180],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 9,
        },
        alternateRowStyles: { fillColor: [245, 248, 255] },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { cellWidth: 50 },
          2: { cellWidth: 22 },
          3: { cellWidth: 20 },
          4: { halign: "right", cellWidth: 28 },
          5: { halign: "right", cellWidth: 18 },
          6: { halign: "right", cellWidth: 28 },
        },
      });

      // ===== GRAND TOTAL =====
      const finalY =
        (pdf as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
          .finalY + 6;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(30, 30, 30);
      pdf.text(
        `Grand Total: Tk ${grandTotal.toFixed(2)}`,
        pageWidth - margin,
        finalY,
        { align: "right" },
      );

      // ===== FOOTER =====
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        "Saum Pharmacy - Baligaw, Lakhai, Habiganj | 01648388329 | saumpharmacy@gmail.com",
        pageWidth / 2,
        285,
        { align: "center" },
      );

      pdf.save(`saum-pharmacy-invoice-${invoiceNumber}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsPdfLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen print-wrapper"
      style={{ background: "oklch(0.963 0.012 220)" }}
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Saum Pharmacy - ইনভয়েস
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm text-muted-foreground">{today}</p>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {invoiceNumber}
              </span>
            </div>
          </div>
          <div className="flex gap-2 no-print">
            <Button
              onClick={handlePdfDownload}
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
              variant="outline"
              className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              data-ocid="invoice.print_button"
            >
              <Printer className="h-4 w-4" />
              ইনভয়েস প্রিন্ট করুন
            </Button>
          </div>
        </div>

        {/* Invoice Content */}
        <div id="invoice-content">
          <div
            className="grid gap-6 mb-6 invoice-section"
            style={{ gridTemplateColumns: "1fr 1fr" }}
          >
            {/* Left: Wholesaler Inputs */}
            <div
              className="bg-card rounded-lg shadow-sm border border-border p-5 print-card"
              data-ocid="wholesaler.card"
            >
              <h2 className="text-base font-semibold text-foreground mb-4 pb-2 border-b border-border">
                হোলসেলার তথ্য
              </h2>
              <div className="space-y-4">
                <div>
                  <Label
                    htmlFor="wholesaler-name"
                    className="text-sm font-medium text-foreground mb-1 block"
                  >
                    হোলসেলার/পাইকারের নাম
                  </Label>
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
                    className="print-input w-full text-sm"
                    data-ocid="wholesaler.name.input"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="wholesaler-address"
                    className="text-sm font-medium text-foreground mb-1 block"
                  >
                    ঠিকানা
                  </Label>
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
                    className="print-input w-full text-sm"
                    data-ocid="wholesaler.address.input"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="wholesaler-mobile"
                    className="text-sm font-medium text-foreground mb-1 block"
                  >
                    মোবাইল নম্বর
                  </Label>
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
                    className="print-input w-full text-sm"
                    data-ocid="wholesaler.mobile.input"
                  />
                </div>
              </div>
            </div>

            {/* Right: Fixed Pharmacy Info */}
            <div
              className="bg-card rounded-lg shadow-sm border border-border overflow-hidden print-card"
              data-ocid="pharmacy.info.card"
            >
              <div className="bg-primary px-5 py-4">
                <h2 className="text-xl font-bold text-primary-foreground">
                  Saum Pharmacy
                </h2>
                <p className="text-sm text-primary-foreground opacity-80 mt-0.5">
                  ফার্মেসি তথ্য
                </p>
              </div>
              <div className="px-5 py-4">
                <table
                  className="w-full text-sm"
                  style={{ borderCollapse: "separate", borderSpacing: "0" }}
                >
                  <tbody>
                    <tr className="leading-8">
                      <td className="font-semibold text-muted-foreground w-24 align-top">
                        ঠিকানা:
                      </td>
                      <td className="text-foreground">বালিগাঁও, লাখাই, হবিগঞ্জ</td>
                    </tr>
                    <tr className="leading-8">
                      <td className="font-semibold text-muted-foreground w-24 align-top">
                        মোবাইল:
                      </td>
                      <td className="text-foreground font-medium">
                        01648388329
                      </td>
                    </tr>
                    <tr className="leading-8">
                      <td className="font-semibold text-muted-foreground w-24 align-top">
                        ইমেইল:
                      </td>
                      <td className="text-foreground font-medium">
                        <a
                          href="mailto:saumpharmacy@gmail.com"
                          className="text-primary hover:underline"
                        >
                          saumpharmacy@gmail.com
                        </a>
                      </td>
                    </tr>
                    <tr className="leading-8">
                      <td className="font-semibold text-muted-foreground w-24 align-top">
                        তারিখ:
                      </td>
                      <td className="text-foreground font-medium">{today}</td>
                    </tr>
                    <tr className="leading-8">
                      <td className="font-semibold text-muted-foreground w-24 align-top">
                        ইনভয়েস নং:
                      </td>
                      <td className="text-foreground font-mono font-medium">
                        {invoiceNumber}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Invoice Table Card */}
          <div
            className="bg-card rounded-lg shadow-sm border border-border overflow-hidden mb-6 invoice-section print-card"
            style={{ borderTop: "3px solid oklch(0.491 0.129 244)" }}
            data-ocid="invoice.table.card"
          >
            <div className="p-5 border-b border-border">
              <h2 className="text-base font-semibold text-foreground">
                ঔষধের তালিকা
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table
                className="w-full"
                style={tableFontStyle}
                data-ocid="invoice.table"
              >
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th
                      className="px-3 py-3 text-center font-semibold w-10"
                      style={tableFontStyle}
                    >
                      ক্রমিক
                    </th>
                    <th
                      className="px-3 py-3 text-left font-semibold"
                      style={tableFontStyle}
                    >
                      ঔষধের নাম
                    </th>
                    <th
                      className="px-3 py-3 text-left font-semibold w-28"
                      style={tableFontStyle}
                    >
                      ধরন
                    </th>
                    <th
                      className="px-3 py-3 text-left font-semibold w-28"
                      style={tableFontStyle}
                    >
                      মাপ
                    </th>
                    <th
                      className="px-3 py-3 text-right font-semibold w-24"
                      style={tableFontStyle}
                    >
                      দর (টাকা)
                    </th>
                    <th
                      className="px-3 py-3 text-right font-semibold w-24"
                      style={tableFontStyle}
                    >
                      পরিমাণ
                    </th>
                    <th
                      className="px-3 py-3 text-right font-semibold w-24"
                      style={tableFontStyle}
                    >
                      দাম (টাকা)
                    </th>
                    <th
                      className="px-3 py-3 text-center font-semibold w-10 no-print"
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
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                      data-ocid={`invoice.item.${index + 1}`}
                    >
                      <td
                        className="px-3 py-2 text-center font-medium text-muted-foreground"
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
                            className="print-select h-8 border-border"
                            style={tableFontStyle}
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
                            placeholder="0"
                            className="print-input w-full border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            style={tableFontStyle}
                            data-ocid={`invoice.quantity.input.${index + 1}`}
                          />
                          <span
                            className="font-medium text-muted-foreground whitespace-nowrap bg-muted px-1.5 py-0.5 rounded"
                            style={{ fontSize: "10px" }}
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
                          placeholder="-"
                          className="print-input w-full border border-border rounded px-2 py-1 bg-background text-right focus:outline-none focus:ring-1 focus:ring-ring"
                          style={tableFontStyle}
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
                          placeholder="0"
                          className="print-input w-full border border-border rounded px-2 py-1 bg-background text-right focus:outline-none focus:ring-1 focus:ring-ring"
                          style={tableFontStyle}
                          data-ocid={`invoice.units.input.${index + 1}`}
                        />
                      </td>
                      <td
                        className="px-3 py-2 text-right font-medium text-foreground"
                        style={tableFontStyle}
                        data-ocid={`invoice.total_price.input.${index + 1}`}
                      >
                        {row.totalPrice ? `৳${row.totalPrice}` : "-"}
                      </td>
                      <td className="px-3 py-2 text-center no-print">
                        <button
                          type="button"
                          onClick={() => deleteRow(row.id)}
                          className="text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded p-1 transition-colors"
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
                        colSpan={8}
                        className="px-4 py-8 text-center text-muted-foreground text-sm"
                        data-ocid="invoice.table.empty_state"
                      >
                        কোনো ঔষধ যোগ করা হয়নি। নিচের বোতাম দিয়ে সারি যোগ করুন।
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-border">
              <Button
                onClick={addRow}
                variant="outline"
                size="sm"
                className="no-print gap-2 text-primary border-primary hover:bg-primary hover:text-primary-foreground"
                data-ocid="invoice.add_row.button"
              >
                <PlusCircle className="h-4 w-4" />
                সারি যোগ করুন
              </Button>
              <div
                className="flex items-center gap-4 text-sm"
                data-ocid="invoice.grand_total.panel"
              >
                <span className="text-muted-foreground font-medium">
                  সর্বমোট:
                </span>
                <span className="text-xl font-bold text-foreground">
                  ৳{grandTotal.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">টাকা</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom actions bar */}
        <div className="flex justify-end gap-3 no-print">
          <Button
            onClick={handlePdfDownload}
            variant="outline"
            className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
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
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
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
