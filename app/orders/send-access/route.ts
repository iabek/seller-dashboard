import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(
                ({
                  name,
                  value,
                  options,
                }) => {
                  cookieStore.set(
                    name,
                    value,
                    options
                  );
                }
              );
            } catch {
              // Cookie update tidak diperlukan
              // untuk request ini.
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId diperlukan" },
        { status: 400 }
      );
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        expires_at,
        order_type,
        customers (
          telegram_user_id
        ),
        products (
          name
        ),
        plans (
          name
        ),
        profiles (
          profile_name,
          pin,
          accounts (
            email,
            password
          )
        )
      `)
      .eq("id", orderId)
      .single();

    if (error || !order) {
      console.error(error);

      return NextResponse.json(
        { error: "Order tidak ditemukan" },
        { status: 404 }
      );
    }

    if (order.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Order belum aktif" },
        { status: 400 }
      );
    }

    const customer = order.customers as any;
    const product = order.products as any;
    const plan = order.plans as any;
    const profile = order.profiles as any;

    const telegramUserId =
      customer.telegram_user_id;

    const account =
      profile.accounts;

    const expiresAt =
      new Date(order.expires_at);

    const formattedExpiry =
      expiresAt.toLocaleString(
        "id-ID",
        {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        }
      );

      const isRenewal =
  order.order_type === "RENEWAL";

const message = isRenewal
  ? `🔄 *Renewal berhasil!*

📦 *${product.name}*
👤 Profile: ${profile.profile_name}

Akses kamu sudah diperpanjang.

📅 Berlaku sampai:
*${formattedExpiry}*

Selamat menikmati!`
  : `✅ *Pembayaran berhasil!*

📦 *${product.name}*
👤 Profile: ${profile.profile_name}

📧 Email:
\`${account.email}\`

🔑 Password:
\`${account.password}\`

🔢 PIN:
\`${profile.pin}\`

📅 Berlaku sampai:
*${formattedExpiry}*`;

    await bot.telegram.sendMessage(
      telegramUserId,
      message,
      {
        parse_mode: "Markdown",
      }
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Send access error:",
      error
    );

    return NextResponse.json(
      {
        error: "Gagal mengirim akses",
      },
      {
        status: 500,
      }
    );
  }
}