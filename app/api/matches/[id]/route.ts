import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type MaybeScore = number | null;

type SetPair = { a: MaybeScore; b: MaybeScore };

function isScore(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 99;
}

function parseScore(value: unknown): MaybeScore | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  return isScore(value) ? value : "invalid";
}

function validateSet({ a, b }: SetPair, label: string) {
  if (a === null || b === null) return `${label} 점수를 양쪽 모두 입력해주세요.`;
  if (a === b) return `${label}는 동점으로 끝날 수 없습니다.`;

  const high = Math.max(a, b);
  const low = Math.min(a, b);
  const validNormal = high === 11 && low <= 9;
  const validDeuce = low >= 10 && high === low + 2;

  if (!validNormal && !validDeuce) {
    return `${label}는 11점 선취, 10:10 이후에는 2점 차로 끝나야 합니다.`;
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const matchId = Number(id);
    if (!Number.isInteger(matchId) || matchId <= 0) {
      return NextResponse.json({ error: "잘못된 경기 번호입니다." }, { status: 400 });
    }

    const body = await request.json();
    const pin = String(body.pin ?? "");
    const expectedPin = process.env.TOURNAMENT_PIN;

    if (!expectedPin) {
      return NextResponse.json({ error: "서버에 대회 PIN이 설정되지 않았습니다." }, { status: 500 });
    }
    if (pin !== expectedPin) {
      return NextResponse.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    if (body.action === "clear") {
      const { error } = await supabase
        .from("matches")
        .update({
          set1_a: null, set1_b: null,
          set2_a: null, set2_b: null,
          set3_a: null, set3_b: null,
          status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", matchId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    const values = [body.set1A, body.set1B, body.set2A, body.set2B, body.set3A, body.set3B].map(parseScore);
    if (values.includes("invalid")) {
      return NextResponse.json({ error: "점수는 0~99 사이의 정수로 입력해주세요." }, { status: 400 });
    }

    const [set1A, set1B, set2A, set2B, set3A, set3B] = values as MaybeScore[];
    const first = { a: set1A, b: set1B };
    const second = { a: set2A, b: set2B };
    const third = { a: set3A, b: set3B };

    const firstError = validateSet(first, "1세트");
    if (firstError) return NextResponse.json({ error: firstError }, { status: 400 });
    const secondError = validateSet(second, "2세트");
    if (secondError) return NextResponse.json({ error: secondError }, { status: 400 });

    let winsA = (set1A! > set1B! ? 1 : 0) + (set2A! > set2B! ? 1 : 0);
    let winsB = 2 - winsA;

    if (winsA === 1 && winsB === 1) {
      const thirdError = validateSet(third, "3세트");
      if (thirdError) return NextResponse.json({ error: thirdError }, { status: 400 });
      if (set3A! > set3B!) winsA += 1;
      else winsB += 1;
    } else if (set3A !== null || set3B !== null) {
      return NextResponse.json({ error: "앞선 두 세트에서 2:0으로 승부가 끝났습니다. 3세트는 비워주세요." }, { status: 400 });
    }

    if (winsA !== 2 && winsB !== 2) {
      return NextResponse.json({ error: "3판 2선승 결과를 확인해주세요." }, { status: 400 });
    }

    const { error } = await supabase
      .from("matches")
      .update({
        set1_a: set1A, set1_b: set1B,
        set2_a: set2A, set2_b: set2B,
        set3_a: set3A, set3_b: set3B,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "결과 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
