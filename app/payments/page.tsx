"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Order = {
  id: string;
  amount: number;
  payment_method: string | null;
  status: string;
  created_at: string;
  product_id: string | null;
  plan_id: string | null;
  customer_id: string | null;
};

type Customer = {
  id: string;
  display_name: string | null;
  telegram_username: string | null;
};

type Product = {
  id: string;
  name: string;
};

type Plan = {
  id: string
  product_id: string;
  name: string;
  duration_days: number;
  price: number;
};

type PaymentProof = {
  id: string;
  order_id: string;
  file_path: string;
};

export default function PaymentsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
const [proofs, setProofs] = useState<PaymentProof[]>([]);
const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  async function loadData() {
    const supabase = createClient();

const [
  { data: orderData },
  { data: customerData },
  { data: productData },
  { data: planData },
  { data: proofData },
] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .in("status", [
          "WAITING_PAYMENT",
          "WAITING_VERIFICATION",
        ])
        .order("created_at", {
          ascending: false,
        }),

      supabase.from("customers").select("*"),

      supabase.from("products").select("*"),

      supabase.from("plans").select("*"),

      supabase.from("payment_proofs").select("*"),
    ]);

    setOrders(orderData ?? []);
    setCustomers(customerData ?? []);
    setProducts(productData ?? []);
    setPlans(planData ?? []);
setProofs(proofData ?? []);

const signedUrls: Record<string, string> = {};

for (const proof of proofData ?? []) {
  const { data } = await supabase.storage
    .from("payment-proofs")
    .createSignedUrl(
      proof.file_path,
      60 * 10
    );

  if (data?.signedUrl) {
    signedUrls[proof.order_id] = data.signedUrl;
  }
}

setProofUrls(signedUrls);

setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getCustomer(customerId: string | null) {
    return customers.find(
      (customer) => customer.id === customerId
    );
  }

  function getProduct(productId: string | null) {
    return products.find(
      (product) => product.id === productId
    );
  }

  function getPlan(planId: string | null) {
    return plans.find(
      (plan) => plan.id === planId
    );
  }

  function getProof(orderId: string) {
  return proofs.find(
    (proof) => proof.order_id === orderId
  );
}

async function approveOrder(orderId: string) {
  const supabase = createClient();

  setLoadingId(orderId);

  try {
    const { data: order, error: orderError } =
  await supabase
    .from("orders")
    .select("order_type")
    .eq("id", orderId)
    .single();

if (orderError || !order) {
  throw new Error(
    "Order tidak ditemukan."
  );
}

const functionName =
  order.order_type === "RENEWAL"
    ? "approve_renewal"
    : "approve_order";

    const { data, error } =
      await supabase.rpc(
        functionName,
        {
          p_order_id: orderId,
        }
      );

    if (error) {
      throw error;
    }

    console.log(
      "Approval result:",
      data
    );

    // Setelah berhasil, kirim akses ke Telegram
    const response = await fetch(
      "/api/orders/send-access",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
  orderId,
}),
      }
    );

    if (!response.ok) {
      throw new Error(
        "Gagal mengirim akses Telegram"
      );
    }

    await loadData();

    alert(
      "Order berhasil di-approve dan akses sudah dikirim."
    );
  } catch (error) {
    console.error(
      "Approve error:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "Gagal approve order."
    );
  }
}

  async function rejectPayment(orderId: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from("orders")
      .update({
        status: "REJECTED",
      })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      alert("Gagal menolak pembayaran.");
      return;
    }

    await loadData();
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
        Payment Verification
      </h1>

      <p className="mt-2 text-gray-500">
        Periksa pembayaran customer sebelum memberikan akses.
      </p>

      <div className="mt-8 space-y-4">
        {orders.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">
              Tidak ada pembayaran yang perlu diverifikasi.
            </p>
          </div>
        ) : (
          orders.map((order) => {
            const customer = getCustomer(
              order.customer_id
            );

            const product = getProduct(
              order.product_id
            );

            const plan = getPlan(
              order.plan_id
            );

            const proof = getProof(order.id);
const proofUrl = proofUrls[order.id] ?? null;

            return (
              <div
                key={order.id}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-lg font-semibold">
                      {product?.name ?? "-"}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {plan?.name ?? "-"} •{" "}
                      {plan?.duration_days ?? 0} hari
                    </p>

                    <div className="mt-4 text-sm">
                      <p>
                        Customer:{" "}
                        <span className="font-medium">
                          {customer?.display_name ?? "-"}
                        </span>
                      </p>

                      <p>
                        Telegram:{" "}
                        {customer?.telegram_username
                          ? `@${customer.telegram_username}`
                          : "-"}
                      </p>

                      <p>
                        Pembayaran:{" "}
                        {order.payment_method ?? "-"}
                      </p>

                      <p>
                        Total:{" "}
                        <span className="font-medium">
                          Rp{" "}
                          {order.amount.toLocaleString(
                            "id-ID"
                          )}
                        </span>
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs">
                    {order.status}
                  </span>
                </div>

<div className="mt-5 border-t pt-5">
  <p className="text-sm font-medium">
    Bukti Pembayaran
  </p>

  {proofUrl ? (
    <a
      href={proofUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-block"
    >
      <img
        src={proofUrl}
        alt="Bukti pembayaran"
        className="max-h-80 rounded-lg border object-contain"
      />
    </a>
  ) : (
    <p className="mt-2 text-sm text-gray-500">
      Belum ada bukti pembayaran.
    </p>
  )}
</div>

                <div className="mt-6 flex gap-3 border-t pt-5">
                  <button
                    onClick={() =>
  approveOrder(order.id)
}
                    className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white"
                  >
                    APPROVE
                  </button>

                  <button
                    onClick={() =>
                      rejectPayment(order.id)
                    }
                    className="rounded-lg bg-red-600 px-5 py-2 text-sm font-medium text-white"
                  >
                    REJECT
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}