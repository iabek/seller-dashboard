"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Stats = {
  totalOrders: number;
  revenue: number;
  waitingVerification: number;
  activeOrders: number;
};

type RecentOrder = {
  id: string;
  amount: number;
  status: string;
  order_type: string;
  created_at: string;
  customers: {
    display_name: string | null;
    telegram_username: string | null;
  } | null;
  products: {
    name: string;
  } | null;
  plans: {
    name: string;
  } | null;
};

export default function DashboardPage() {
  const supabase = createClient();

  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    revenue: 0,
    waitingVerification: 0,
    activeOrders: 0,
  });

  const [loading, setLoading] = useState(true);

  const [recentOrders, setRecentOrders] =
  useState<RecentOrder[]>([]);

  async function loadStats() {
    setLoading(true);

    // Total orders
    const { count: totalOrders } =
      await supabase
        .from("orders")
        .select("*", {
          count: "exact",
          head: true,
        });

    // Revenue
    const { data: revenueOrders } =
      await supabase
        .from("orders")
        .select("amount")
        .eq("status", "ACTIVE");

    // Menunggu verifikasi
    const {
      count: waitingVerification,
    } = await supabase
      .from("orders")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "WAITING_VERIFICATION"
      );

    // Order aktif
    const { count: activeOrders } =
      await supabase
        .from("orders")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("status", "ACTIVE");

    const revenue =
      revenueOrders?.reduce(
        (total, order) =>
          total + Number(order.amount),
        0
      ) ?? 0;

      const { data: latestOrders } =
  await supabase
    .from("orders")
    .select(`
      id,
      amount,
      status,
      order_type,
      created_at,
      customers (
        display_name,
        telegram_username
      ),
      products (
        name
      ),
      plans (
        name
      )
    `)
    .order("created_at", {
      ascending: false,
    })
    .limit(5);

setRecentOrders(
  (latestOrders ?? []).map((order) => ({
    id: order.id,
    amount: Number(order.amount),
    status: order.status,
    order_type: order.order_type,
    created_at: order.created_at,
    customers: Array.isArray(order.customers)
      ? order.customers[0] ?? null
      : order.customers ?? null,
    products: Array.isArray(order.products)
      ? order.products[0] ?? null
      : order.products ?? null,
    plans: Array.isArray(order.plans)
      ? order.plans[0] ?? null
      : order.plans ?? null,
  }))
);

    setStats({
      totalOrders: totalOrders ?? 0,
      revenue,
      waitingVerification:
        waitingVerification ?? 0,
      activeOrders: activeOrders ?? 0,
    });

    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <main className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Dashboard
        </h1>

        <p className="mt-1 text-gray-500">
          Ringkasan toko kamu.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Orders */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Total Orders
          </p>

          <p className="mt-2 text-3xl font-bold">
            {loading
              ? "..."
              : stats.totalOrders}
          </p>
        </div>

        {/* Revenue */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Revenue
          </p>

          <p className="mt-2 text-3xl font-bold">
            {loading
              ? "..."
              : `Rp${stats.revenue.toLocaleString(
                  "id-ID"
                )}`}
          </p>
        </div>

        {/* Waiting Verification */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Menunggu Verifikasi
          </p>

          <p className="mt-2 text-3xl font-bold">
            {loading
              ? "..."
              : stats.waitingVerification}
          </p>
        </div>

        {/* Active Orders */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Order Aktif
          </p>

          <p className="mt-2 text-3xl font-bold">
            {loading
              ? "..."
              : stats.activeOrders}
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Akses halaman penting dengan cepat.
            </p>
          </div>

          <button
            onClick={loadStats}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/products"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            🛍️ Products
          </a>

          <a
            href="/inventory"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            📦 Inventory
          </a>

          <a
            href="/orders"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            🧾 Orders
          </a>

          <a
            href="/payments"
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
          >
            💳 Payments
          </a>
        </div>
      </div>
      <div className="mt-8 rounded-xl border bg-white shadow-sm">
  <div className="flex items-center justify-between border-b p-5">
    <div>
      <h2 className="font-semibold">
        Recent Orders
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        5 transaksi terbaru.
      </p>
    </div>

    <a
      href="/orders"
      className="text-sm font-medium hover:underline"
    >
      Lihat semua →
    </a>
  </div>

  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-gray-500">
          <th className="px-5 py-3 font-medium">
            Customer
          </th>

          <th className="px-5 py-3 font-medium">
  Tipe
</th>

          <th className="px-5 py-3 font-medium">
            Produk
          </th>

          <th className="px-5 py-3 font-medium">
            Paket
          </th>

          <th className="px-5 py-3 font-medium">
            Amount
          </th>

          <th className="px-5 py-3 font-medium">
            Status
          </th>
        </tr>
      </thead>

      <tbody>
        {recentOrders.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              className="px-5 py-8 text-center text-gray-500"
            >
              Belum ada order.
            </td>
          </tr>
        ) : (
          recentOrders.map((order) => {
            const customer =
              order.customers;

            const product =
              order.products;

            const plan =
              order.plans;

            const typeLabel =
  order.order_type === "RENEWAL"
    ? "🔄 Renewal"
    : "🛍️ Pembelian";

            let statusText =
              order.status;

            switch (order.status) {
              case "WAITING_PAYMENT":
                statusText =
                  "🟡 Menunggu pembayaran";
                break;

              case "WAITING_VERIFICATION":
                statusText =
                  "🔵 Menunggu verifikasi";
                break;

              case "ACTIVE":
                statusText =
                  "🟢 Aktif";
                break;

              case "EXPIRED":
                statusText =
                  "⚫ Expired";
                break;

              case "REJECTED":
                statusText =
                  "🔴 Ditolak";
                break;

              case "CANCELLED":
                statusText =
                  "⚪ Dibatalkan";
                break;
            }

            return (
              <tr
                key={order.id}
                className="border-b last:border-0"
              >
                <td className="px-5 py-4">
                  <div className="font-medium">
                    {customer?.display_name ||
                      "Unknown"}
                  </div>

                  {customer?.telegram_username && (
                    <div className="text-xs text-gray-500">
                      @{customer.telegram_username}
                    </div>
                  )}
                </td>

                <td className="px-5 py-4">
  <span
    className={
      order.order_type === "RENEWAL"
        ? "rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
        : "rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700"
    }
  >
    {typeLabel}
  </span>
</td>

                <td className="px-5 py-4">
                  {product?.name || "-"}
                </td>

                <td className="px-5 py-4">
                  {plan?.name || "-"}
                </td>

                <td className="px-5 py-4">
                  Rp
                  {Number(
                    order.amount
                  ).toLocaleString("id-ID")}
                </td>

                <td className="px-5 py-4">
                  {statusText}
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  </div>
</div>
    </main>
  );
}