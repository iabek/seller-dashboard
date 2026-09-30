import { Markup, Telegraf, session, Context } from "telegraf";
import { createServerClient } from "@/lib/src/lib/supabase-server";
import { createAdminClient } from "@/lib/src/lib/supabase-admin";

type BotSession = {
  selectedPlanId?: string;
  selectedProductId?: string;
  orderId?: string;
  renewalOrderId?: string;
  renewalProfileId?: string;
};

type BotContext = Context & {
  session: BotSession;
};

function mainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback(
        "🛍️ Beli Produk",
        "menu:products"
      ),
    ],
    [
      Markup.button.callback(
        "📦 Pesanan Saya",
        "menu:orders"
      ),
      Markup.button.callback(
        "🔐 Akses Saya",
        "menu:status"
      ),
    ],
  ]);
}

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN belum diatur.");
}

const bot = new Telegraf<BotContext>(token);

bot.use(
  session({
    defaultSession: (): BotSession => ({
      selectedPlanId: undefined,
      selectedProductId: undefined,
      orderId: undefined,
      renewalOrderId: undefined,
      renewalProfileId: undefined,
    }),
  })
);

bot.action(/^plan:(.+)$/, async (ctx) => {
  const planId = ctx.match[1];

  const supabase = createServerClient();

  const { data: plan, error } =
    await supabase
      .from("plans")
      .select(
        "id, product_id, name, duration_days, price"
      )
      .eq("id", planId)
      .eq("active", true)
      .single();

  if (error || !plan) {
    await ctx.answerCbQuery(
      "Paket tidak ditemukan."
    );

    await ctx.reply(
      "Maaf, paket tersebut sudah tidak tersedia."
    );

    return;
  }

  const { data: product } =
    await supabase
      .from("products")
      .select("id, name")
      .eq("id", plan.product_id)
      .single();

  ctx.session.selectedPlanId = plan.id;
  ctx.session.selectedProductId = plan.product_id;

  await ctx.answerCbQuery();

  await ctx.reply(
    `🛒 Pesanan kamu:\n\n` +
      `Produk: ${product?.name ?? "-"}\n` +
      `Paket: ${plan.name}\n` +
      `Durasi: ${plan.duration_days} hari\n` +
      `Total: Rp ${plan.price.toLocaleString(
        "id-ID"
      )}\n\n` +
      `Silakan pilih metode pembayaran:`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "DANA",
          "payment:DANA"
        ),
        Markup.button.callback(
          "GoPay",
          "payment:GoPay"
        ),
      ],
      [
        Markup.button.callback(
          "OVO",
          "payment:OVO"
        ),
        Markup.button.callback(
          "QRIS",
          "payment:QRIS"
        ),
      ],
    ])
  );
});

bot.action(/^product:(.+)$/, async (ctx) => {
  const productId = ctx.match[1];

  const supabase = createServerClient();

  const { data: product, error: productError } =
    await supabase
      .from("products")
      .select("id, name")
      .eq("id", productId)
      .eq("active", true)
      .single();

  if (productError || !product) {
    await ctx.answerCbQuery(
      "Produk tidak ditemukan."
    );

    await ctx.reply(
      "Maaf, produk tersebut sudah tidak tersedia."
    );

    return;
  }

  const { data: plans, error: planError } =
    await supabase
      .from("plans")
      .select(
        "id, name, duration_days, price"
      )
      .eq("product_id", productId)
      .eq("active", true)
      .order("duration_days");

  if (planError) {
    console.error(planError);

    await ctx.answerCbQuery(
      "Gagal mengambil paket."
    );

    return;
  }

  if (!plans || plans.length === 0) {
    await ctx.answerCbQuery();

    await ctx.reply(
      `Produk ${product.name} belum memiliki paket tersedia.`
    );

    return;
  }

  await ctx.answerCbQuery();

  await ctx.reply(
    `📦 ${product.name}\n\n` +
      `Pilih paket yang kamu inginkan:`,
    Markup.inlineKeyboard(
      plans.map((plan) => [
        Markup.button.callback(
          `${plan.name} — Rp ${plan.price.toLocaleString(
            "id-ID"
          )}`,
          `plan:${plan.id}`
        ),
      ])
    )
  );
});

function getPaymentInstruction(
  paymentMethod: "DANA" | "GoPay" | "OVO" | "QRIS"
) {
  switch (paymentMethod) {
    case "DANA":
      return (
        `Silakan transfer ke:\n` +
        `DANA: 08xxxxxxxxxx\n` +
        `a.n. Nama Kamu`
      );

    case "GoPay":
      return (
        `Silakan transfer ke:\n` +
        `GoPay: 08xxxxxxxxxx\n` +
        `a.n. Nama Kamu`
      );

    case "OVO":
      return (
        `Silakan transfer ke:\n` +
        `OVO: 08xxxxxxxxxx\n` +
        `a.n. Nama Kamu`
      );

    case "QRIS":
      return (
        `Silakan scan QRIS yang diberikan seller.\n` +
        `Pastikan nominal pembayaran sesuai dengan total pesanan.`
      );
  }
}

bot.action(/^payment:(DANA|GoPay|OVO|QRIS)$/, async (ctx) => {
  const paymentMethod = ctx.match[1];

  const supabase = createServerClient();

  const planId = ctx.session.selectedPlanId;

  if (!planId) {
    await ctx.answerCbQuery(
      "Pesanan tidak ditemukan."
    );

    await ctx.reply(
      "Silakan pilih produk dan paket terlebih dahulu."
    );

    return;
  }

  const { data: plan, error: planError } =
    await supabase
      .from("plans")
      .select(
        "id, product_id, name, duration_days, price"
      )
      .eq("id", planId)
      .eq("active", true)
      .single();

  if (planError || !plan) {
    await ctx.answerCbQuery(
      "Paket tidak ditemukan."
    );

    await ctx.reply(
      "Maaf, paket tersebut sudah tidak tersedia."
    );

    return;
  }

  const { data: product } =
    await supabase
      .from("products")
      .select("id, name")
      .eq("id", plan.product_id)
      .single();

if (!product) {
  await ctx.answerCbQuery(
    "Produk tidak ditemukan."
  );

  return;
}

const { data: customer, error: customerError } =
  await supabase
    .from("customers")
    .select("id")
    .eq("telegram_user_id", ctx.from.id)
    .single();

if (customerError || !customer) {
  await ctx.reply(
    "Akun kamu belum terdaftar. Silakan kirim /start terlebih dahulu."
  );

  return;
}

const { data: orderId, error } =
  await supabase.rpc(
    "create_new_order",
    {
      p_customer_id: customer.id,
      p_plan_id: planId,
      p_payment_method: paymentMethod,
    }
  );

if (error) {
  console.error(
    "create_new_order error:",
    error
  );

  await ctx.reply(
    "Gagal membuat pesanan."
  );

  return;
}

ctx.session.orderId = orderId;

  await ctx.answerCbQuery();

  await ctx.reply(
    `💳 *Pembayaran Pesanan*\n\n` +
      `📦 Produk: *${product.name}*\n` +
      `📅 Paket: *${plan.name}*\n` +
      `💰 Total: *Rp${Number(plan.price).toLocaleString("id-ID")}*\n\n` +
      `💳 Metode: *${paymentMethod}*\n\n` +
      `Setelah pembayaran selesai, kirim screenshot bukti pembayaran di chat ini.`,
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "📷 Kirim Bukti Pembayaran",
            "payment:proof"
          ),
        ],
        [
          Markup.button.callback(
            "❌ Batalkan Pesanan",
            "payment:cancel"
          ),
        ],
      ]),
    }
  );
});

bot.action("payment:proof", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
    "📷 Silakan kirim screenshot bukti pembayaran kamu sebagai foto di chat ini.\n\n" +
      "Pastikan nominal dan status pembayaran terlihat dengan jelas."
  );
});

bot.start(async (ctx) => {
  const supabase = createAdminClient();

  const telegramUserId = ctx.from.id;
  const telegramUsername =
    ctx.from.username ?? null;
  const displayName =
    ctx.from.first_name ?? "Customer";

  const { error } = await supabase
    .from("customers")
    .upsert(
      {
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        display_name: displayName,
      },
      {
        onConflict: "telegram_user_id",
      }
    );

  if (error) {
    console.error(
      "Gagal menyimpan customer:",
      error
    );

    await ctx.reply(
      "Maaf, terjadi kesalahan. Silakan coba lagi."
    );

    return;
  }

await ctx.reply(
  "Selamat datang! 👋\n\n" +
    "Silakan pilih menu di bawah:",
  mainMenu()
);

const { data: products, error: productError } =
  await supabase
    .from("products")
    .select("id, name")
    .eq("active", true)
    .order("created_at");

if (productError) {
  console.error(productError);
  return;
}

if (!products || products.length === 0) {
  await ctx.reply(
    "Saat ini belum ada produk yang tersedia."
  );

  return;
}

await ctx.reply(
  "🛍 Pilih Produk:",
  Markup.inlineKeyboard(
    products.map((product) => [
      Markup.button.callback(
        product.name,
        `product:${product.id}`
      ),
    ])
  )
);
});
bot.on("photo", async (ctx) => {
  const supabase = createServerClient();

  const telegramUserId = ctx.from.id;

  // Cari customer berdasarkan Telegram ID
  const { data: customer, error: customerError } =
    await supabase
      .from("customers")
      .select("id")
      .eq(
        "telegram_user_id",
        telegramUserId
      )
      .single();

  if (customerError || !customer) {
    await ctx.reply(
      "Akun kamu belum terdaftar. Silakan kirim /start terlebih dahulu."
    );

    return;
  }

  // Cari order yang sedang menunggu pembayaran
  const { data: order, error: orderError } =
    await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customer.id)
      .eq("status", "WAITING_PAYMENT")
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (orderError) {
    console.error(orderError);

    await ctx.reply(
      "Terjadi kesalahan saat mencari pesanan."
    );

    return;
  }

  if (!order) {
    await ctx.reply(
      "Tidak ada pesanan yang sedang menunggu pembayaran."
    );

    return;
  }

  // Ambil foto dengan resolusi terbesar
  const photos = ctx.message.photo;

  const largestPhoto =
    photos[photos.length - 1];

  const fileId = largestPhoto.file_id;

  try {
    // Ambil URL file dari Telegram
    const fileLink =
      await ctx.telegram.getFileLink(fileId);

    // Download file dari Telegram
    const response = await fetch(
      fileLink.toString()
    );

    if (!response.ok) {
      throw new Error(
        "Gagal mengambil file dari Telegram."
      );
    }

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    const filePath =
      `proofs/${order.id}-${Date.now()}.jpg`;

    // Upload ke Supabase Storage
    const { error: uploadError } =
      await supabase.storage
        .from("payment-proofs")
        .upload(
          filePath,
          buffer,
          {
            contentType: "image/jpeg",
            upsert: false,
          }
        );

    if (uploadError) {
      console.error(uploadError);
      throw new Error(
        "Gagal upload bukti pembayaran."
      );
    }

    // Simpan record bukti pembayaran
    const { error: proofError } =
      await supabase
        .from("payment_proofs")
        .insert({
          order_id: order.id,
          file_path: filePath,
        });

    if (proofError) {
      console.error(proofError);
      throw new Error(
        "Gagal menyimpan data bukti."
      );
    }

    // Ubah status order
    const { error: updateError } =
      await supabase
        .from("orders")
        .update({
          status: "WAITING_VERIFICATION",
        })
        .eq("id", order.id);

    if (updateError) {
      console.error(updateError);
      throw new Error(
        "Gagal mengubah status order."
      );
    }

    await ctx.reply(
      "✅ Bukti pembayaran berhasil diterima!\n\n" +
        "Pembayaran kamu sedang diperiksa oleh seller.\n\n" +
        "Mohon tunggu sampai pembayaran diverifikasi."
    );
  } catch (error) {
    console.error(
      "Payment proof error:",
      error
    );

    await ctx.reply(
      "❌ Gagal menerima bukti pembayaran.\n\n" +
        "Silakan coba kirim ulang foto bukti pembayaran."
    );
  }
});

async function showStatus(ctx: any) {
  try {
    const telegramUserId = ctx.from?.id;

    if (!telegramUserId) {
      return;
    }

    const supabase = createAdminClient();

    // Cari customer
    const { data: customer, error: customerError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("telegram_user_id", telegramUserId)
        .single();

    if (customerError || !customer) {
      await ctx.reply(
        "Kamu belum punya akun customer.\n\nSilakan tekan /start terlebih dahulu."
      );

      return;
    }

    // Ambil semua order aktif
    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select(`
          id,
          product_id,
          plan_id,
          profile_id,
          expires_at,
          products (
            name
          ),
          plans (
            name
          ),
          profiles (
            profile_name,
            pin,
            expires_at,
            accounts (
              email,
              password
            )
          )
        `)
        .eq("customer_id", customer.id)
        .eq("status", "ACTIVE")
        .order("expires_at", {
          ascending: true,
        });

    if (ordersError) {
      console.error(
        "Error mengambil akses:",
        ordersError
      );

      await ctx.reply(
        "Gagal mengambil data akses."
      );

      return;
    }

    if (!orders || orders.length === 0) {
      await ctx.reply(
        "🔐 *Akses Saya*\n\n" +
        "Kamu belum memiliki akses aktif.",
        {
          parse_mode: "Markdown",
          ...mainMenu(),
        }
      );

      return;
    }

    const now = new Date();

    // Tandai order yang sudah expired
    for (const order of orders) {
      if (
        order.expires_at &&
        new Date(order.expires_at) <= now
      ) {
        await supabase
          .from("orders")
          .update({
            status: "EXPIRED",
          })
          .eq("id", order.id);

        if (order.profile_id) {
          await supabase
            .from("profiles")
            .update({
              status: "AVAILABLE",
              expires_at: null,
            })
            .eq("id", order.profile_id);
        }
      }
    }

    // Ambil lagi yang benar-benar masih aktif
    const { data: activeOrders } =
      await supabase
        .from("orders")
        .select(`
          id,
          profile_id,
          expires_at,
          products (
            name
          ),
          plans (
            name
          ),
          profiles (
            profile_name,
            pin,
            expires_at,
            accounts (
              email,
              password
            )
          )
        `)
        .eq("customer_id", customer.id)
        .eq("status", "ACTIVE")
        .order("expires_at", {
          ascending: true,
        });

    if (!activeOrders || activeOrders.length === 0) {
      await ctx.reply(
        "🔐 *Akses Saya*\n\n" +
        "Tidak ada akses aktif.",
        {
          parse_mode: "Markdown",
          ...mainMenu(),
        }
      );

      return;
    }

    const sections = activeOrders.map(
      (order: any, index: number) => {
        const profile = order.profiles;
        const account = profile?.accounts;

        const expiry = profile?.expires_at
          ? new Date(
              profile.expires_at
            ).toLocaleString(
              "id-ID",
              {
                timeZone:
                  "Asia/Jakarta",
                dateStyle: "long",
                timeStyle: "short",
              }
            )
          : "-";

        return (
          `*${index + 1}. ${order.products?.name ?? "-"}*\n\n` +
          `👤 Profile: ${profile?.profile_name ?? "-"}\n` +
          `📧 Email: \`${account?.email ?? "-"}\`\n` +
          `🔑 Password: \`${account?.password ?? "-"}\`\n` +
          `🔢 PIN: \`${profile?.pin ?? "-"}\`\n` +
          `📅 Berlaku sampai: *${expiry}*`
        );
      }
    );

    await ctx.reply(
      "🔐 *Akses Saya*\n\n" +
      sections.join("\n\n────────────\n\n"),
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "🔄 Perpanjang",
              "renew"
            ),
          ],
          [
            Markup.button.callback(
              "🛍️ Beli Produk",
              "menu:products"
            ),
          ],
          [
            Markup.button.callback(
              "⬅️ Menu Utama",
              "menu:main"
            ),
          ],
        ]),
      }
    );

  } catch (error) {
    console.error(
      "showStatus error:",
      error
    );

    await ctx.reply(
      "Terjadi kesalahan saat mengambil akses."
    );
  }
}

bot.command("status", async (ctx) => {
  await showStatus(ctx);
});

async function showOrders(ctx: any) {
  try {
    const telegramUserId = ctx.from?.id;

    if (!telegramUserId) return;

    const supabase = createAdminClient();

    const { data: customer, error: customerError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("telegram_user_id", telegramUserId)
        .single();

    if (customerError || !customer) {
      await ctx.reply(
        "Kamu belum terdaftar.\n\nSilakan tekan /start terlebih dahulu."
      );
      return;
    }

    const { data: orders, error } =
      await supabase
        .from("orders")
        .select(`
          id,
          amount,
          status,
          order_type,
          payment_method,
          created_at,
          products (
            name
          ),
          plans (
            name
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(10);

    if (error) {
      console.error("Orders error:", error);
      await ctx.reply("Gagal mengambil pesanan.");
      return;
    }

    if (!orders || orders.length === 0) {
      await ctx.reply(
        "📦 *Pesanan Saya*\n\nBelum ada pesanan.",
        {
          parse_mode: "Markdown",
          ...mainMenu(),
        }
      );
      return;
    }

    const buttons = orders.map((order: any) => {
      const typeLabel =
        order.order_type === "RENEWAL"
          ? "🔄 Renewal"
          : "🛍️ Pembelian";

      const productName =
        order.products?.name ?? "Produk";

      return [
        Markup.button.callback(
          `${typeLabel} — ${productName}`,
          `orderdetail:${order.id}`
        ),
      ];
    });

    buttons.push([
      Markup.button.callback(
        "⬅️ Menu Utama",
        "menu:main"
      ),
    ]);

    await ctx.editMessageText(
      "📦 *Pesanan Saya*\n\n" +
        "Pilih pesanan untuk melihat detail:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons),
      }
    );
  } catch (error) {
    console.error("showOrders error:", error);
  }
}

bot.action(
  /^orderdetail:(.+)$/,
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const orderId = ctx.match[1];
      const telegramUserId = ctx.from?.id;

      if (!telegramUserId) return;

      const supabase = createAdminClient();

      const { data: customer } =
        await supabase
          .from("customers")
          .select("id")
          .eq(
            "telegram_user_id",
            telegramUserId
          )
          .single();

      if (!customer) {
        await ctx.reply(
          "Customer tidak ditemukan."
        );
        return;
      }

      const { data: order, error }: any =
  await supabase
    .from("orders")
          .select(`
            id,
            amount,
            status,
            order_type,
            payment_method,
            created_at,
            start_at,
            expires_at,
            products (
              name
            ),
            plans (
              name
            )
          `)
          .eq("id", orderId)
          .eq("customer_id", customer.id)
          .single();

      if (error || !order) {
        await ctx.reply(
          "Pesanan tidak ditemukan."
        );
        return;
      }

      const typeLabel =
        order.order_type === "RENEWAL"
          ? "🔄 Renewal"
          : "🛍️ Pembelian";

      const statusLabel: Record<
        string,
        string
      > = {
        WAITING_PAYMENT:
          "⏳ Menunggu Pembayaran",
        WAITING_VERIFICATION:
          "🔍 Menunggu Verifikasi",
        ACTIVE: "✅ Aktif",
        EXPIRED: "⌛ Expired",
        REJECTED: "❌ Ditolak",
        CANCELLED: "🚫 Dibatalkan",
      };

      const createdAt = new Date(
        order.created_at
      ).toLocaleString("id-ID", {
        timeZone: "Asia/Jakarta",
        dateStyle: "long",
        timeStyle: "short",
      });

      const startAt = order.start_at
        ? new Date(
            order.start_at
          ).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "long",
            timeStyle: "short",
          })
        : "-";

      const expiresAt = order.expires_at
        ? new Date(
            order.expires_at
          ).toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "long",
            timeStyle: "short",
          })
        : "-";

      const text =
        `📄 *Detail Pesanan*\n\n` +
        `${typeLabel}\n\n` +
        `📦 Produk: *${
          order.products?.name ?? "-"
        }*\n` +
        `📋 Paket: ${
          order.plans?.name ?? "-"
        }\n` +
        `💰 Total: *Rp${Number(
          order.amount
        ).toLocaleString("id-ID")}*\n` +
        `💳 Pembayaran: ${
          order.payment_method ?? "-"
        }\n` +
        `📌 Status: ${
          statusLabel[order.status] ??
          order.status
        }\n` +
        `🕐 Dibuat: ${createdAt}\n` +
        `▶️ Mulai: ${startAt}\n` +
        `⏰ Berakhir: ${expiresAt}`;

      const buttons = [];

      if (
        order.status === "WAITING_PAYMENT"
      ) {
        buttons.push([
          Markup.button.callback(
            "📸 Kirim Bukti Pembayaran",
            `prooforder:${order.id}`
          ),
        ]);

        buttons.push([
          Markup.button.callback(
            "🚫 Batalkan Pesanan",
            `cancelorder:${order.id}`
          ),
        ]);
      }

      buttons.push([
        Markup.button.callback(
          "⬅️ Pesanan Saya",
          "menu:orders"
        ),
      ]);

      await ctx.editMessageText(text, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons),
      });
    } catch (error) {
      console.error(
        "orderdetail error:",
        error
      );
    }
  }
);

bot.command("orders", async (ctx) => {
  const supabase = createServerClient();

  const telegramUserId = ctx.from.id;

  try {
    // Cari customer
    const { data: customer, error: customerError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("telegram_user_id", telegramUserId)
        .single();

    if (customerError || !customer) {
      await ctx.reply(
        "Kamu belum terdaftar.\n\nSilakan kirim /start terlebih dahulu."
      );

      return;
    }

    // Ambil semua order customer
    const { data: orders, error: ordersError } =
      await supabase
        .from("orders")
        .select(`
          id,
          amount,
          status,
          created_at,
          expires_at,
          products (
            name
          ),
          plans (
            name
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(10);

    if (ordersError) {
      console.error(ordersError);

      await ctx.reply(
        "❌ Terjadi kesalahan saat mengambil riwayat pesanan."
      );

      return;
    }

    if (!orders || orders.length === 0) {
      await ctx.reply(
        "📋 Kamu belum memiliki riwayat pesanan."
      );

      return;
    }

    let message = "📋 *Riwayat Pesanan Kamu*\n\n";

    orders.forEach((order, index) => {
      const product = order.products as any;
      const plan = order.plans as any;

      let statusText = "⚪ " + order.status;

      switch (order.status) {
        case "WAITING_PAYMENT":
          statusText = "🟡 Menunggu pembayaran";
          break;

        case "WAITING_VERIFICATION":
          statusText = "🔵 Menunggu verifikasi";
          break;

        case "ACTIVE":
          statusText = "🟢 Aktif";
          break;

        case "EXPIRED":
          statusText = "⚫ Expired";
          break;

        case "REJECTED":
          statusText = "🔴 Ditolak";
          break;

        case "CANCELLED":
  statusText = "⚪ Dibatalkan";
  break;
      }

      const createdAt =
        new Date(order.created_at).toLocaleString(
          "id-ID",
          {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          }
        );

      message +=
        `${index + 1}. *${product.name}*\n` +
        `   Paket: ${plan.name}\n` +
        `   Harga: Rp${Number(order.amount).toLocaleString("id-ID")}\n` +
        `   Status: ${statusText}\n` +
        `   Dibuat: ${createdAt}\n`;

      if (order.expires_at) {
        const expiresAt =
          new Date(order.expires_at).toLocaleString(
            "id-ID",
            {
              dateStyle: "medium",
              timeStyle: "short",
              timeZone: "Asia/Jakarta",
            }
          );

        message +=
          `   Expired: ${expiresAt}\n`;
      }

      message += "\n";
    });

    await ctx.reply(
      message,
      {
        parse_mode: "Markdown",
      }
    );
  } catch (error) {
    console.error(
      "Orders command error:",
      error
    );

    await ctx.reply(
      "❌ Terjadi kesalahan. Silakan coba lagi."
    );
  }
});

bot.action("menu:products", async (ctx) => {
  await ctx.answerCbQuery();

  const supabase = createServerClient();

  const { data: products, error } =
    await supabase
      .from("products")
      .select("id, name, description")
      .eq("active", true)
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    console.error(error);

    await ctx.reply(
      "❌ Gagal mengambil daftar produk."
    );

    return;
  }

  if (!products || products.length === 0) {
    await ctx.reply(
      "Saat ini belum ada produk yang tersedia."
    );

    return;
  }

  const buttons = products.map((product) => [
    Markup.button.callback(
      product.name,
      `product:${product.id}`
    ),
  ]);

  buttons.push([
    Markup.button.callback(
      "⬅️ Kembali",
      "menu:main"
    ),
  ]);

  await ctx.editMessageText(
    "🛍️ *Pilih produk:*",
    {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(buttons),
    }
  );
});

bot.action("menu:orders", async (ctx) => {
  await ctx.answerCbQuery();

  await showOrders(ctx);
});

bot.action("menu:status", async (ctx) => {
  await ctx.answerCbQuery();

  await showStatus(ctx);
});

bot.action("menu:main", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.editMessageText(
    "Silakan pilih menu:",
    mainMenu()
  );
});

bot.action("renew", async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const telegramUserId = ctx.from?.id;

    if (!telegramUserId) {
      return;
    }

    const supabase = createAdminClient();

    const { data: customer, error: customerError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("telegram_user_id", telegramUserId)
        .single();

    if (customerError || !customer) {
      await ctx.reply(
        "Kamu belum terdaftar.\n\nSilakan tekan /start terlebih dahulu."
      );
      return;
    }

    const { data: activeOrders, error } =
      await supabase
        .from("orders")
        .select(`
          id,
          product_id,
          profile_id,
          expires_at,
          products (
            name
          )
        `)
        .eq("customer_id", customer.id)
        .eq("status", "ACTIVE")
        .order("expires_at", {
          ascending: true,
        });

    if (error) {
      console.error("Renewal error:", error);
      await ctx.reply("Gagal mengambil akses aktif.");
      return;
    }

    if (!activeOrders || activeOrders.length === 0) {
      await ctx.reply(
        "Kamu tidak memiliki akses aktif yang bisa diperpanjang.",
        mainMenu()
      );
      return;
    }

    ctx.session.renewalProfileId = undefined;
    ctx.session.renewalOrderId = undefined;

    const buttons = activeOrders.map((order: any) => [
      Markup.button.callback(
        `🔄 ${order.products?.name ?? "Produk"}`,
        `renewproduct:${order.id}`
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        "⬅️ Kembali",
        "menu:status"
      ),
    ]);

    await ctx.editMessageText(
      "🔄 *Perpanjang Akses*\n\n" +
      "Pilih akses yang ingin kamu perpanjang:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons),
      }
    );
  } catch (error) {
    console.error("renew error:", error);
  }
});

bot.action(/^renewproduct:(.+)$/, async (ctx) => {
  try {
    await ctx.answerCbQuery();

    const orderId = ctx.match[1];

    const supabase = createAdminClient();

    const { data: order, error: orderError }: any =
      await supabase
        .from("orders")
        .select(`
          id,
          product_id,
          profile_id,
          expires_at,
          products (
            name
          )
        `)
        .eq("id", orderId)
        .eq("status", "ACTIVE")
        .single();

    if (orderError || !order) {
      await ctx.reply(
        "Akses tersebut sudah tidak aktif."
      );
      return;
    }

    ctx.session.renewalProfileId =
      order.profile_id;

    const { data: plans, error: plansError } =
      await supabase
        .from("plans")
        .select("id, name, duration_days, price")
        .eq("product_id", order.product_id)
        .eq("active", true)
        .order("duration_days", {
          ascending: true,
        });

    if (plansError) {
      console.error(
        "Renewal plans error:",
        plansError
      );

      await ctx.reply(
        "Gagal mengambil pilihan durasi."
      );

      return;
    }

    if (!plans || plans.length === 0) {
      await ctx.reply(
        "Belum ada paket renewal untuk produk ini."
      );
      return;
    }

    const buttons = plans.map((plan: any) => [
      Markup.button.callback(
        `${plan.name} — Rp${Number(
          plan.price
        ).toLocaleString("id-ID")}`,
        `renewplan:${plan.id}:${order.id}`
      ),
    ]);

    buttons.push([
      Markup.button.callback(
        "⬅️ Kembali",
        "renew"
      ),
    ]);

    await ctx.editMessageText(
      `🔄 *Renew ${order.products?.name ?? "Produk"}*\n\n` +
      "Pilih durasi perpanjangan:",
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(buttons),
      }
    );
  } catch (error) {
    console.error(
      "renewproduct error:",
      error
    );
  }
});

bot.action(
  /^renewplan:(.+):(.+)$/,
  async (ctx) => {
    try {
      await ctx.answerCbQuery();

      const planId = ctx.match[1];
      const orderId = ctx.match[2];

      const supabase = createAdminClient();

      const { data: order, error: orderError }: any =
        await supabase
          .from("orders")
          .select(`
            id,
            profile_id,
            product_id,
            products (
              name
            )
          `)
          .eq("id", orderId)
          .eq("status", "ACTIVE")
          .single();

      if (orderError || !order) {
        await ctx.reply(
          "Akses tersebut sudah tidak aktif."
        );
        return;
      }

      const { data: plan, error: planError } =
        await supabase
          .from("plans")
          .select(
            "id, name, duration_days, price"
          )
          .eq("id", planId)
          .eq("active", true)
          .single();

      if (planError || !plan) {
        await ctx.reply(
          "Paket renewal tidak ditemukan."
        );
        return;
      }

      ctx.session.renewalProfileId =
        order.profile_id;

      ctx.session.selectedPlanId =
        plan.id;

      ctx.session.selectedProductId =
        order.product_id;

      await ctx.editMessageText(
        `🔄 *Renew ${order.products?.name ?? "Produk"}*\n\n` +
        `📋 ${plan.name}\n` +
        `💰 Rp${Number(
          plan.price
        ).toLocaleString("id-ID")}\n\n` +
        "Pilih metode pembayaran:",
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(
  "DANA",
  `renewpayment:DANA:${plan.id}:${order.id}`
),
              Markup.button.callback(
  "GoPay",
  `renewpayment:GoPay:${plan.id}:${order.id}`
),
            ],
            [
              Markup.button.callback(
  "OVO",
  `renewpayment:OVO:${plan.id}:${order.id}`
),
              Markup.button.callback(
  "QRIS",
  `renewpayment:QRIS:${plan.id}:${order.id}`
),
            ],
            [
              Markup.button.callback(
                "⬅️ Kembali",
                `renewproduct:${order.id}`
              ),
            ],
          ]),
        }
      );
    } catch (error) {
      console.error(
        "renewplan error:",
        error
      );
    }
  }
);

bot.action(
  /^renewpayment:(DANA|GoPay|OVO|QRIS):(.+):(.+)$/,
  async (ctx) => {
    const method = ctx.match[1];
    const planId = ctx.match[2];
    const orderId = ctx.match[3];

    await ctx.answerCbQuery();

    const supabase = createAdminClient();

    // Ambil order aktif
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .select(`
          id,
          customer_id,
          profile_id,
          product_id
        `)
        .eq("id", orderId)
        .eq("status", "ACTIVE")
        .single();

    if (orderError || !order) {
      console.error(orderError);

      await ctx.reply(
        "Pesanan aktif tidak ditemukan."
      );

      return;
    }

    // Ambil plan
    const { data: plan, error: planError } =
      await supabase
        .from("plans")
        .select(
          "id, name, duration_days, price"
        )
        .eq("id", planId)
        .eq("product_id", order.product_id)
        .eq("active", true)
        .single();

    if (planError || !plan) {
      await ctx.reply(
        "Paket tidak ditemukan."
      );

      return;
    }

    // Buat renewal order
    const { data: orderIdResult, error } =
      await supabase.rpc(
        "create_renewal_order",
        {
          p_customer_id:
            order.customer_id,

          p_plan_id:
            plan.id,

          p_profile_id:
            order.profile_id,

          p_payment_method:
            method,
        }
      );

    if (error) {
      console.error(
        "Create renewal order error:",
        error
      );

      await ctx.reply(
        "❌ Gagal membuat pesanan perpanjangan."
      );

      return;
    }

    ctx.session.renewalOrderId =
      orderIdResult;

    await ctx.reply(
      `💳 *Pembayaran Perpanjangan*\n\n` +
        `📅 Paket: *${plan.name}*\n` +
        `💰 Total: *Rp${Number(plan.price).toLocaleString(
          "id-ID"
        )}*\n` +
        `💳 Metode: *${method}*\n\n` +
        `${getPaymentInstruction(method as "DANA" | "GoPay" | "OVO" | "QRIS")}\n\n` +
        `Setelah pembayaran selesai, kirim screenshot bukti pembayaran di chat ini.`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              "📷 Kirim Bukti Pembayaran",
              "renewpayment:proof"
            ),
          ],
          [
            Markup.button.callback(
              "❌ Batalkan Pesanan",
              "renewpayment:cancel"
            ),
          ],
        ]),
      }
    );
  }
);

export { bot };