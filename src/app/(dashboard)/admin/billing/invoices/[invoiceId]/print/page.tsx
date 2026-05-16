"use client";

import { use } from "react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

function formatDA(n: number) {
  return n.toLocaleString("fr-DZ") + " DA";
}

function formatDate(d: Date | string) {
  return format(new Date(d), "dd MMMM yyyy", { locale: fr });
}

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Virement bancaire",
  ccp: "CCP / Compte Chèque Postal",
  baridimob: "BaridiMob",
  cash: "Espèces",
  card: "Carte bancaire",
};

export default function InvoicePrintPage(props: { params: Promise<{ invoiceId: string }> }) {
  const params = use(props.params);
  const { data, isLoading, error } = trpc.billing.getInvoiceForPrint.useQuery(
    { invoiceId: params.invoiceId },
    { enabled: !!params.invoiceId }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        Facture introuvable.
      </div>
    );
  }

  const { invoice, clinic } = data;
  const lineItems = (invoice.lineItems as Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>) ?? [];

  const subtotal = lineItems.reduce((s, l) => s + l.total, 0);
  const discount = invoice.discountAmount ?? 0;

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      {/* Print button — hidden on print */}
      <div className="flex justify-end mb-6 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-teal-600 px-6 py-2 text-white font-semibold hover:bg-teal-700 transition-colors"
        >
          🖨 Imprimer / Télécharger PDF
        </button>
      </div>

      {/* Invoice A4 */}
      <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm print:shadow-none print:border-0 print:rounded-none">
        {/* Header */}
        <div className="flex items-start justify-between p-8 border-b border-gray-200">
          <div>
            <div className="text-2xl font-bold text-teal-700 mb-1">Clinomatic</div>
            <div className="text-sm text-gray-500">Bab Ezzouar, Alger, Algérie</div>
            <div className="text-sm text-gray-500">contact@clinomatic.dz</div>
            <div className="text-sm text-gray-500">www.clinomatic.dz</div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-800 mb-1">FACTURE</div>
            <div className="text-sm font-mono text-teal-700 font-bold">{invoice.invoiceNumber}</div>
            <div className="mt-2 text-sm text-gray-600">
              <span className="font-medium">Date:</span> {formatDate(invoice.date)}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">Échéance:</span>{" "}
              <span className={invoice.status === "OVERDUE" ? "text-red-600 font-bold" : ""}>
                {formatDate(invoice.dueDate)}
              </span>
            </div>
            <div className="mt-1">
              <span
                className={`inline-block rounded-full px-3 py-0.5 text-xs font-bold uppercase ${
                  invoice.status === "PAID"
                    ? "bg-green-100 text-green-700"
                    : invoice.status === "OVERDUE"
                    ? "bg-red-100 text-red-700"
                    : invoice.status === "PARTIALLY_PAID"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {invoice.status === "PAID"
                  ? "Payée"
                  : invoice.status === "OVERDUE"
                  ? "En retard"
                  : invoice.status === "PARTIALLY_PAID"
                  ? "Partiellement payée"
                  : "Impayée"}
              </span>
            </div>
          </div>
        </div>

        {/* Parties */}
        <div className="grid grid-cols-2 gap-8 p-8 border-b border-gray-200">
          <div>
            <div className="text-xs font-bold uppercase text-gray-400 mb-2">De / From</div>
            <div className="font-bold text-gray-800">Clinomatic SARL</div>
            <div className="text-sm text-gray-600">Bab Ezzouar, Alger</div>
            <div className="text-sm text-gray-600">NIF: En cours</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase text-gray-400 mb-2">À / To</div>
            <div className="font-bold text-gray-800">{clinic.name}</div>
            {clinic.address && <div className="text-sm text-gray-600">{clinic.address}</div>}
            {clinic.city && <div className="text-sm text-gray-600">{clinic.city}</div>}
            <div className="text-sm text-gray-600">{clinic.phone}</div>
            {clinic.email && <div className="text-sm text-gray-600">{clinic.email}</div>}
          </div>
        </div>

        {/* Period */}
        {invoice.period && (
          <div className="px-8 py-4 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-medium text-gray-600">Période couverte:</span>{" "}
            <span className="text-sm font-bold text-gray-800">{invoice.period}</span>
          </div>
        )}

        {/* Line items */}
        <div className="p-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-800">
                <th className="text-left text-sm font-bold text-gray-700 pb-2">Description</th>
                <th className="text-right text-sm font-bold text-gray-700 pb-2">Qté</th>
                <th className="text-right text-sm font-bold text-gray-700 pb-2">Prix unit.</th>
                <th className="text-right text-sm font-bold text-gray-700 pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 text-sm text-gray-700">{item.description}</td>
                  <td className="py-3 text-sm text-gray-700 text-right">{item.quantity}</td>
                  <td className="py-3 text-sm text-gray-700 text-right">
                    {formatDA(item.unitPrice)}
                  </td>
                  <td className="py-3 text-sm font-medium text-gray-800 text-right">
                    {formatDA(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200">
                <td colSpan={3} className="pt-3 text-sm text-gray-600 text-right">
                  Sous-total
                </td>
                <td className="pt-3 text-sm font-medium text-right">{formatDA(subtotal)}</td>
              </tr>
              {discount > 0 && (
                <tr>
                  <td colSpan={3} className="pt-1 text-sm text-green-600 text-right">
                    Remise
                  </td>
                  <td className="pt-1 text-sm text-green-600 text-right">−{formatDA(discount)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-gray-800">
                <td colSpan={3} className="pt-2 font-bold text-gray-800 text-right text-base">
                  TOTAL À PAYER
                </td>
                <td className="pt-2 font-bold text-teal-700 text-right text-base">
                  {formatDA(invoice.amount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment instructions */}
        <div className="mx-8 mb-8 rounded-lg bg-gray-50 p-6 border border-gray-200">
          <div className="text-sm font-bold text-gray-700 mb-3">
            Modalités de paiement / Payment Terms
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div>
              <span className="font-medium">Mode accepté:</span>{" "}
              {clinic.paymentMethod
                ? METHOD_LABELS[clinic.paymentMethod] ?? clinic.paymentMethod
                : "Virement bancaire, CCP, BaridiMob, Espèces"}
            </div>
            <div>
              <span className="font-medium">Virement bancaire:</span> CPA — RIB: 007 00001 1234567890 12
            </div>
            <div>
              <span className="font-medium">CCP:</span> 123-456 Clé 78, Alger
            </div>
            <div>
              <span className="font-medium">BaridiMob:</span> 0560-000-000
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Paiement sous 30 jours. Pénalités de retard: 2% par mois après l&apos;échéance.
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="px-8 pb-6">
            <div className="text-xs font-bold uppercase text-gray-400 mb-1">Notes</div>
            <div className="text-sm text-gray-600">{invoice.notes}</div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 text-center">
          <div className="text-xs text-gray-400">
            Merci pour votre confiance! — Clinomatic · contact@clinomatic.dz · www.clinomatic.dz
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
