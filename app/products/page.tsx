"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function loadProducts() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setProducts(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function addProduct() {
    if (!name.trim()) {
      alert("Nama produk wajib diisi.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase
      .from("products")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
      });

    if (error) {
      console.error(error);
      alert("Gagal menambahkan produk.");
      return;
    }

    setName("");
    setDescription("");
    setShowForm(false);

    await loadProducts();
  }

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Products
          </h1>

          <p className="mt-2 text-gray-500">
            Kelola produk yang kamu jual.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          + Tambah Produk
        </button>
      </div>

      {showForm && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Tambah Produk
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="text-sm font-medium">
                Nama Produk
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Netflix"
                className="mt-1 w-full rounded-lg border px-4 py-2 outline-none focus:ring-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Deskripsi
              </label>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contoh: Netflix Premium"
                rows={3}
                className="mt-1 w-full rounded-lg border px-4 py-2 outline-none focus:ring-2"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={addProduct}
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
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-xl bg-white shadow-sm">
        {loading ? (
          <p className="p-6 text-gray-500">
            Loading...
          </p>
        ) : products.length === 0 ? (
          <p className="p-6 text-gray-500">
            Belum ada produk.
          </p>
        ) : (
          <div className="divide-y">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-6"
              >
                <div>
<Link
  href={`/products/${product.id}`}
  className="font-semibold hover:underline"
>
  {product.name}
</Link>

                  <p className="text-sm text-gray-500">
                    {product.description}
                  </p>
                </div>

                <span className="rounded-full bg-green-100 px-3 py-1 text-xs">
                  {product.active ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}