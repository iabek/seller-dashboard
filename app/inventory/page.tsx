"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
};

type Account = {
  id: string;
  product_id: string;
  email: string | null;
  status: string;
  notes: string | null;
};

type Profile = {
  id: string;
  profile_name: string | null;
  pin: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  accounts: {
    id: string;
    email: string | null;
    product_id: string;
    products: {
      name: string;
    }[];
  }[];
};

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [loading, setLoading] = useState(true);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profilePin, setProfilePin] = useState("");

  async function loadInventory() {
    console.log("A: loadInventory mulai");

    const supabase = createClient();

    const [
      { data: productData, error: productError },
      { data: accountData, error: accountError },
      { data: profileData, error: profileError },
    ] = await Promise.all([
      supabase
        .from("products")
        .select("id, name")
        .order("name"),

      supabase
        .from("accounts")
        .select("id, product_id, email, status, notes")
        .order("email"),

      supabase
        .from("profiles")
        .select(`
          id,
          profile_name,
          pin,
          status,
          expires_at,
          created_at,
          accounts (
            id,
            email,
            product_id,
            products (
              name
            )
          )
        `)
        .order("created_at", { ascending: false }),
    ]);

    if (productError) {
      console.error("Product error:", productError);
    }

    if (accountError) {
      console.error("Account error:", accountError);
    }

    if (profileError) {
      console.error("Profile error:", profileError);
    }

    setProducts(productData ?? []);
    setAccounts(accountData ?? []);
    setProfiles((profileData as Profile[]) ?? []);

    setLoading(false);

    console.log("B: inventory berhasil dimuat");
  }

  useEffect(() => {
    loadInventory();
  }, []);

  async function addAccount() {
    if (!productId || !email || !password) {
      alert("Produk, email, dan password wajib diisi.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.from("accounts").insert({
      product_id: productId,
      email,
      password,
      status: "AVAILABLE",
    });

    if (error) {
      console.error(error);
      alert("Gagal menambahkan account.");
      return;
    }

    setProductId("");
    setEmail("");
    setPassword("");
    setShowAccountForm(false);

    await loadInventory();
  }

  async function addProfile(accountId: string) {
    if (!profileName || !profilePin) {
      alert("Nama profile dan PIN wajib diisi.");
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.from("profiles").insert({
      account_id: accountId,
      profile_name: profileName,
      pin: profilePin,
      status: "AVAILABLE",
    });

    if (error) {
      console.error(error);
      alert("Gagal menambahkan profile.");
      return;
    }

    setProfileName("");
    setProfilePin("");
    setShowProfileForm(null);

    await loadInventory();
  }

  function getProductName(productId: string) {
    return (
      products.find((product) => product.id === productId)?.name ??
      "Unknown"
    );
  }

  function getAccountProfiles(accountId: string) {
    return profiles.filter((profile) =>
      profile.accounts?.some(
        (account) => account.id === accountId
      )
    );
  }

  const totalProfiles = profiles.length;

  const availableProfiles = profiles.filter(
    (profile) => profile.status === "AVAILABLE"
  ).length;

  const activeProfiles = profiles.filter(
    (profile) => profile.status === "ACTIVE"
  ).length;

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
            Inventory
          </h1>

          <p className="mt-2 text-gray-500">
            Kelola account dan profile yang tersedia.
          </p>
        </div>

        <button
          onClick={() => setShowAccountForm(!showAccountForm)}
          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          + Tambah Account
        </button>
      </div>

      {showAccountForm && (
        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            Tambah Account
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium">
                Produk
              </label>

              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
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
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="mt-1 w-full rounded-lg border px-4 py-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="mt-1 w-full rounded-lg border px-4 py-2"
              />
            </div>
          </div>

          <div className="mt-4">
            <button
              onClick={addAccount}
              className="rounded-lg bg-black px-5 py-2 text-sm font-medium text-white"
            >
              Simpan Account
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Total Profiles
          </p>

          <p className="mt-1 text-2xl font-bold">
            {totalProfiles}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Available
          </p>

          <p className="mt-1 text-2xl font-bold">
            {availableProfiles}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Active
          </p>

          <p className="mt-1 text-2xl font-bold">
            {activeProfiles}
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        {accounts.length === 0 ? (
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-gray-500">
              Belum ada account.
            </p>
          </div>
        ) : (
          accounts.map((account) => {
            const accountProfiles =
              getAccountProfiles(account.id);

            return (
              <div
                key={account.id}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {getProductName(account.product_id)}
                    </p>

                    <p className="text-sm text-gray-500">
                      {account.email}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs">
                    {account.status}
                  </span>
                </div>

                <div className="mt-5 border-t pt-5">
                  <p className="text-sm font-medium">
                    Profiles
                  </p>

                  <button
                    onClick={() =>
                      setShowProfileForm(
                        showProfileForm === account.id
                          ? null
                          : account.id
                      )
                    }
                    className="mt-3 rounded-lg border px-3 py-2 text-sm"
                  >
                    + Tambah Profile
                  </button>

                  {showProfileForm === account.id && (
                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <input
                          value={profileName}
                          onChange={(e) =>
                            setProfileName(e.target.value)
                          }
                          placeholder="Nama profile"
                          className="rounded-lg border px-4 py-2"
                        />

                        <input
                          value={profilePin}
                          onChange={(e) =>
                            setProfilePin(e.target.value)
                          }
                          placeholder="PIN"
                          maxLength={6}
                          className="rounded-lg border px-4 py-2"
                        />
                      </div>

                      <button
                        onClick={() =>
                          addProfile(account.id)
                        }
                        className="mt-3 rounded-lg bg-black px-4 py-2 text-sm text-white"
                      >
                        Simpan Profile
                      </button>
                    </div>
                  )}

                  {accountProfiles.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      Belum ada profile.
                    </p>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      {accountProfiles.map((profile) => {
                        const statusInfo = {
                          AVAILABLE: {
                            label: "🟢 Available",
                            className:
                              "bg-green-50 text-green-700",
                          },
                          ACTIVE: {
                            label: "🔵 Active",
                            className:
                              "bg-blue-50 text-blue-700",
                          },
                        }[profile.status] ?? {
                          label: profile.status,
                          className:
                            "bg-gray-100 text-gray-700",
                        };

                        const expiryText =
                          profile.expires_at
                            ? new Date(
                                profile.expires_at
                              ).toLocaleString("id-ID", {
                                timeZone: "Asia/Jakarta",
                                dateStyle: "medium",
                                timeStyle: "short",
                              })
                            : "-";

                        return (
                          <div
                            key={profile.id}
                            className="rounded-xl border bg-white p-5 shadow-sm"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-xs text-gray-500">
                                  {profile.accounts?.[0]
                                    ?.products?.[0]?.name ??
                                    "Product"}
                                </p>

                                <h3 className="mt-1 text-lg font-semibold">
                                  {profile.profile_name}
                                </h3>

                                <p className="text-sm text-gray-500">
                                  {profile.accounts?.[0]
                                    ?.email ?? "-"}
                                </p>
                              </div>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusInfo.className}`}
                              >
                                {statusInfo.label}
                              </span>
                            </div>

                            <div className="mt-4 grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500">
                                  PIN
                                </p>

                                <p className="mt-1 font-medium">
                                  {profile.pin || "-"}
                                </p>
                              </div>

                              <div>
                                <p className="text-xs text-gray-500">
                                  Expires
                                </p>

                                <p className="mt-1 text-sm font-medium">
                                  {profile.status === "ACTIVE"
                                    ? expiryText
                                    : "-"}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}