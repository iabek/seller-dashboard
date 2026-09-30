"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Order = {
  id: string;
  amount: number;
  payment_method: string | null;
  status: string;
};

export default function PaymentProofPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  async function loadOrders() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, amount, payment_method, status"
      )
      .in("status", [
        "WAITING_PAYMENT",
        "WAITING_VERIFICATION",
      ])
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);
      return;
    }

    setOrders(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function uploadProof() {
    if (!selectedOrder || !file) {
      alert("Pilih order dan bukti pembayaran.");
      return;
    }

    setUploading(true);

    const supabase = createClient();

    const fileName = `${selectedOrder}-${Date.now()}-${file.name}`;

    const filePath = `proofs/${fileName}`;

    const { error: uploadError } =
      await supabase.storage
        .from("payment-proofs")
        .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      alert("Gagal upload bukti pembayaran.");
      setUploading(false);
      return;
    }

    const { error: proofError } =
      await supabase
        .from("payment_proofs")
        .insert({
          order_id: selectedOrder,
          file_path: filePath,
        });

    if (proofError) {
      console.error(proofError);
      alert(
        "File berhasil diupload, tapi data bukti gagal disimpan."
      );
      setUploading(false);
      return;
    }

    // Setelah bukti berhasil diupload,
    // order masuk tahap verifikasi.
    const { error: orderError } =
      await supabase
        .from("orders")
        .update({
          status: "WAITING_VERIFICATION",
        })
        .eq("id", selectedOrder);

    if (orderError) {
      console.error(orderError);
      alert("Gagal mengubah status order.");
      setUploading(false);
      return;
    }

    alert("Bukti pembayaran berhasil dikirim.");

    setSelectedOrder("");
    setFile(null);
    setUploading(false);

    await loadOrders();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p className="text-gray-500">
          Loading...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-3xl font-bold">
        Upload Payment Proof
      </h1>

      <p className="mt-2 text-gray-500">
        Simulasi customer mengirim bukti pembayaran.
      </p>

      <div className="mt-8 max-w-xl rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label className="text-sm font-medium">
            Order
          </label>

          <select
            value={selectedOrder}
            onChange={(e) =>
              setSelectedOrder(e.target.value)
            }
            className="mt-1 w-full rounded-lg border px-4 py-2"
          >
            <option value="">
              Pilih order
            </option>

            {orders.map((order) => (
              <option
                key={order.id}
                value={order.id}
              >
                {order.id.slice(0, 8)} — Rp{" "}
                {order.amount.toLocaleString("id-ID")} —{" "}
                {order.payment_method}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5">
          <label className="text-sm font-medium">
            Bukti Pembayaran
          </label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setFile(e.target.files?.[0] ?? null)
            }
            className="mt-2 block w-full text-sm"
          />
        </div>

        <button
          onClick={uploadProof}
          disabled={uploading}
          className="mt-6 rounded-lg bg-black px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {uploading
            ? "Uploading..."
            : "Kirim Bukti Pembayaran"}
        </button>
      </div>
    </main>
  );
}