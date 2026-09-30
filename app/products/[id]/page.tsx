"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string | null;
};

type Plan = {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  active: boolean;
};

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [product, setProduct] = useState<Product | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [planName, setPlanName] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    async function loadData() {
      const { id } = await params;

      const supabase = createClient();

      const { data: productData, error: productError } =
        await supabase
          .from("products")
          .select("*")
          .eq("id", id)
          .single();

      if (productError) {
        console.error(productError);
        setLoading(false);
        return;
      }

      const { data: planData, error: planError } =
        await supabase
          .from("plans")
          .select("*")
          .eq("product_id", id)
          .order("duration_days", { ascending: true });

      if (planError) {
        console.error(planError);
      }

      setProduct(productData);
      setPlans(planData ?? []);
      setLoading(false);
    }

    loadData();
  }, []);

  async function addPlan() {
    const { id } = await params;

    if (!planName.trim() || !duration || !price) {
      alert("Semua data wajib diisi.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.from("plans").insert({
      product_id: id,
      name: planName.trim(),
      duration_days: Number(duration),
      price: Number(price),
    });

    if (error) {
      console.error(error);
      alert("Gagal menambahkan durasi.");
      return;
    }

    setPlanName("");
    setDuration("");
    setPrice("");
    setShowForm(false);

    const { data } = await supabase
      .from("plans")
      .select("*")
      .eq("product_id", id)
      .order("duration_days", { ascending: true });

    setPlans(data ?? []);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-gray-100 p-8">
        <p>Produk tidak ditemukan.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div>
        <p className="text-sm text-gray-500">
          Products / {product.name}
        </p>

        <h1 className="mt-2 text-3xl font-bold">
          {product.name}
        </h1>

        <p className="mt-2 text-gray-500">
          {product.description}
        </p>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">
            Durasi & Harga
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Atur paket yang tersedia untuk customer.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          + Tambah Durasi
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h3 className="font-semibold">
            Tambah Paket
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">
                Nama Paket
              </label>

              <input
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Contoh: 7 Hari"
                className="mt-1 w-full rounded-lg border px-4 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Durasi (hari)
              </label>

              <input
                type="number"
                min="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="7"
                className="mt-1 w-full rounded-lg border px-4 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Harga
              </label>

              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="15000"
                className="mt-1 w-full rounded-lg border px-4 py-2"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={addPlan}
              className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white"
            >
              Simpan
            </button>

            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border px-5 py-2 text-sm"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
        {plans.length === 0 ? (
          <p className="p-6 text-gray-500">
            Belum ada paket durasi.
          </p>
        ) : (
          <div className="divide-y">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between p-6"
              >
                <div>
                  <p className="font-semibold">
                    {plan.name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {plan.duration_days} hari
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <p className="font-semibold">
                    Rp{plan.price.toLocaleString("id-ID")}
                  </p>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs">
                    {plan.active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}