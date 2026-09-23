import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateStandings } from "@/lib/standings";
import type { Match, Player } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [playersResult, matchesResult] = await Promise.all([
      supabase.from("players").select("*").order("display_order"),
      supabase.from("matches").select("*").order("category").order("round").order("match_no"),
    ]);

    if (playersResult.error) throw playersResult.error;
    if (matchesResult.error) throw matchesResult.error;

    const players = (playersResult.data ?? []) as Player[];
    const matches = (matchesResult.data ?? []) as Match[];
    const standings = calculateStandings(players, matches);

    return NextResponse.json(
      { players, matches, standings },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "대회 데이터를 불러오지 못했습니다. Supabase 설정을 확인해주세요." },
      { status: 500 }
    );
  }
}
