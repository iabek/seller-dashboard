"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Order = {
  id: string;
  amount: number;
  payment_method: string | null;
  status: string;
  created_at: string;
  customer_id: string | null;
  product_id: string | null;
  plan_id: string | null;
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
  id: string;
  product_id: string;
  name: string;
  duration_days: number;
  price: number;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);

const [customerName, setCustomerName] = useState("");
const [telegramUsername, setTelegramUsername] = useState("");

const [productId, setProductId] = useState("");
const [planId, setPlanId] = useState("");

const [paymentMethod, setPaymentMethod] = useState("");

async function createOrder() {
  if (
    !customerName ||
    !telegramUsername ||
    !productId ||
    !planId ||
    !paymentMethod
  ) {
    alert("Semua data wajib diisi.");
    return;
  }

  const supabase = createClient();

  // Cari customer berdasarkan username
  let { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("telegram_username", telegramUsername)
    .maybeSingle();

  // Kalau belum ada, buat customer baru
  if (!customer) {
    const { data: newCustomer, error: customerError } =
      await supabase
        .from("customers")
        .insert({
          telegram_username: telegramUsername,
          display_name: customerName,
          telegram_user_id: Date.now(),
        })
        .select()
        .single();

    if (customerError) {
      console.error(customerError);
      alert("Gagal membuat customer.");
      return;
    }

    customer = newCustomer;
  }

  const selectedPlan = plans.find(
    (plan) => plan.id === planId
  );

  if (!selectedPlan) {
    alert("Paket tidak ditemukan.");
    return;
  }

  const { error: orderError } = await supabase
    .from("orders")
    .insert({
      customer_id: customer.id,
      product_id: productId,
      plan_id: planId,
      amount: selectedPlan.price,
      payment_method: paymentMethod,
      status: "WAITING_PAYMENT",
    });

  if (orderError) {
    console.error(orderError);
    alert("Gagal membuat order.");
    return;
  }

  setCustomerName("");
  setTelegramUsername("");
  setProductId("");
  setPlanId("");
  setPaymentMethod("");
  setShowForm(false);

  await loadOrders();
}

  async function loadOrders() {
    const supabase = createClient();

    const [
      { data: orderData },
      { data: customerData },
      { data: productData },
      { data: planData },
    ] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", {
        ascending: false,
      }),
      supabase.from("customers").select("*"),
      supabase.from("products").select("*"),
      supabase.from("plans").select("*"),
    ]);

    setOrders(orderData ?? []);
    setCustomers(customerData ?? []);
    setProducts(productData ?? []);
    setPlans(planData ?? []);

    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  function getCustomer(customerId: string | null) {
    return customers.find(
      (customer) => customer.id === customerId
    );
  }

  function getProductName(productId: string | null) {
    return (
      products.find((product) => product.id === productId)?.name ??
      "-"
    );
  }

  function getPlan(planId: string | null) {
    return plans.find((plan) => plan.id === planId);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
<div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold">
      Orders
    </h1>

    <p className="mt-2 text-gray-500">
      Kelola pesanan customer.
    </p>
  </div>

  <button
    onClick={() => setShowForm(!showForm)}
    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
  >
    + Buat Order
  </button>
</div>

{showForm && (
  <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold">
      Buat Order
    </h2>

    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <label className="text-sm font-medium">
          Nama Customer
        </label>

        <input
          value={customerName}
          onChange={(e) =>
            setCustomerName(e.target.value)
          }
          placeholder="Nama customer"
          className="mt-1 w-full rounded-lg border px-4 py-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          Telegram Username
        </label>

        <input
          value={telegramUsername}
          onChange={(e) =>
            setTelegramUsername(
              e.target.value.replace("@", "")
            )
          }
          placeholder="username"
          className="mt-1 w-full rounded-lg border px-4 py-2"
        />
      </div>

      <div>
        <label className="text-sm font-medium">
          Produk
        </label>

        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPlanId("");
          }}
          className="mt-1 w-full rounded-lg border px-4 py-2"
        >
          <option value="">
            Pilih produk
          </option>

          {products.map((product) => (
            <option
              key={product.id}
              value={product.id}
            >
              {product.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">
          Paket
        </label>

        <select
          value={planId}
          onChange={(e) =>
            setPlanId(e.target.value)
          }
          className="mt-1 w-full rounded-lg border px-4 py-2"
        >
          <option value="">
            Pilih paket
          </option>

          {plans
            .filter(
              (plan) => plan.product_id === productId
            )
            .map((plan) => (
              <option
                key={plan.id}
                value={plan.id}
              >
                {plan.name} — Rp{" "}
                {plan.price.toLocaleString("id-ID")}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">
          Metode Pembayaran
        </label>

        <select
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(e.target.value)
          }
          className="mt-1 w-full rounded-lg border px-4 py-2"
        >
          <option value="">
            Pilih pembayaran
          </option>

          <option value="DANA">
            DANA
          </option>

          <option value="GoPay">
            GoPay
          </option>

          <option value="OVO">
            OVO
          </option>

          <option value="QRIS">
            QRIS
          </option>
        </select>
      </div>
    </div>

    <button
      onClick={createOrder}
      className="mt-5 rounded-lg bg-black px-5 py-2 text-sm font-medium text-white"
    >
      Buat Order
    </button>
  </div>
)}

      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Belum ada order.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-6 py-4">
                    Customer
                  </th>

                  <th className="px-6 py-4">
                    Produk
                  </th>

                  <th className="px-6 py-4">
                    Paket
                  </th>

                  <th className="px-6 py-4">
                    Harga
                  </th>

                  <th className="px-6 py-4">
                    Pembayaran
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4">
                    Tanggal
                  </th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const customer = getCustomer(
                    order.customer_id
                  );

                  const plan = getPlan(
                    order.plan_id
                  );

                  return (
                    <tr
                      key={order.id}
                      className="border-b last:border-0"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium">
                          {customer?.display_name ??
                            "Unknown"}
                        </p>

                        <p className="text-xs text-gray-500">
                          {customer?.telegram_username
                            ? `@${customer.telegram_username}`
                            : "-"}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        {getProductName(
                          order.product_id
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {plan
                          ? `${plan.name} (${plan.duration_days} hari)`
                          : "-"}
                      </td>

                      <td className="px-6 py-4">
                        Rp{" "}
                        {order.amount.toLocaleString(
                          "id-ID"
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {order.payment_method ?? "-"}
                      </td>

                      <td className="px-6 py-4">
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs">
                          {order.status}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-gray-500">
                        {new Date(
                          order.created_at
                        ).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}