import { NextRequest, NextResponse } from "next/server";
import { bot } from "@/lib/telegram";

export async function POST(
  request: NextRequest
) {
  try {
    const update = await request.json();

    await bot.handleUpdate(update);

    return NextResponse.json({
      ok: true,
    });
  } catch (error) {
    console.error("Telegram webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
      },
      {
        status: 500,
      }
    );
  }
}