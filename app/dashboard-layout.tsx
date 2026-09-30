"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const supabase = createClient();

  const [email, setEmail] =
    useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? null);
    }

    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  const menu = [
    {
      name: "Dashboard",
      href: "/",
      icon: "🏠",
    },
    {
      name: "Products",
      href: "/products",
      icon: "🛍️",
    },
    {
      name: "Inventory",
      href: "/inventory",
      icon: "📦",
    },
    {
      name: "Orders",
      href: "/orders",
      icon: "🧾",
    },
    {
      name: "Payments",
      href: "/payments",
      icon: "💳",
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-white">
        {/* Header */}
        <div className="border-b p-5">
          <h1 className="font-bold">
            Seller Dashboard
          </h1>

          <p className="mt-1 text-xs text-gray-500">
            Manage your store
          </p>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-3">
          <div className="space-y-1">
            {menu.map((item) => {
              const active =
                pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    active
                      ? "bg-gray-100 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>
                    {item.icon}
                  </span>

                  <span>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Seller */}
        <div className="border-t p-4">
          <div className="mb-3">
            <p className="text-xs text-gray-500">
              Seller
            </p>

            <p className="mt-1 truncate text-sm font-medium">
              {email ?? "Loading..."}
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}