// 카카오모빌리티 길찾기 기반 경로 계산 코어 (서버 · MCP 공용)

export type TravelMode = "WALKING" | "DRIVING";

export type RouteStepDTO = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation: { lat: number; lng: number };
  endLocation: { lat: number; lng: number };
};

export type RouteDTO = {
  path: { lat: number; lng: number }[];
  distanceMeters: number;
  durationSeconds: number;
  travelMode: TravelMode;
  steps: RouteStepDTO[];
};

type KakaoGuide = {
  name?: string;
  x: number;
  y: number;
  distance?: number;
  duration?: number;
  type?: number;
  guidance?: string;
};

type KakaoRoute = {
  result_code?: number;
  result_msg?: string;
  summary?: { distance?: number; duration?: number };
  sections?: Array<{
    roads?: Array<{ vertexes?: number[] }>;
    guides?: KakaoGuide[];
  }>;
};

const KAKAO_URL = "https://apis-navi.kakaomobility.com/v1/directions";

/**
 * 도보 속도: 카카오맵 보행자 안내 기준(약 4km/h ≒ 1.11m/s).
 * 신호 대기·횡단보도 지연을 반영해 8% 여유를 더한다.
 */
const WALK_MPS = 4000 / 3600;
const WALK_OVERHEAD = 1.08;

function walkDuration(distanceMeters: number) {
  return Math.max(60, Math.round((distanceMeters / WALK_MPS) * WALK_OVERHEAD));
}

function toDTO(r: KakaoRoute, mode: TravelMode): RouteDTO | null {
  if (r.result_code !== 0) return null;
  const path: { lat: number; lng: number }[] = [];
  const guides: KakaoGuide[] = [];
  for (const section of r.sections ?? []) {
    for (const road of section.roads ?? []) {
      const v = road.vertexes ?? [];
      for (let i = 0; i + 1 < v.length; i += 2) path.push({ lng: v[i], lat: v[i + 1] });
    }
    guides.push(...(section.guides ?? []));
  }
  if (path.length < 2) return null;

  const distanceMeters = Math.round(r.summary?.distance ?? 0);
  // 차량: 카카오가 실시간 교통을 반영해 준 소요 시간을 그대로 사용
  // 도보: 같은 경로 거리를 보행 속도로 환산
  const durationSeconds =
    mode === "DRIVING"
      ? Math.max(60, Math.round(r.summary?.duration ?? 0))
      : walkDuration(distanceMeters);

  const rawSteps = guides.filter((g) => (g.distance ?? 0) > 0 || g.guidance);
  const steps: RouteStepDTO[] = rawSteps.map((g, i, arr) => {
    const next = arr[i + 1] ?? g;
    const stepDist = Math.round(g.distance ?? 0);
    return {
      instruction: g.guidance || g.name || "직진",
      distanceMeters: stepDist,
      durationSeconds:
        mode === "DRIVING" ? Math.round(g.duration ?? 0) : walkDuration(stepDist),
      startLocation: { lat: g.y, lng: g.x },
      endLocation: { lat: next.y, lng: next.x },
    };
  });

  return { path, distanceMeters, durationSeconds, travelMode: mode, steps };
}

export async function callKakao(
  key: string,
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  priority: "RECOMMEND" | "TIME" | "DISTANCE",
  mode: TravelMode = "WALKING",
): Promise<RouteDTO[]> {
  const params = new URLSearchParams({
    origin: `${origin.lng},${origin.lat}`,
    destination: `${destination.lng},${destination.lat}`,
    priority,
    alternatives: "true",
    road_details: "false",
    car_type: "1",
  });

  const res = await fetch(`${KAKAO_URL}?${params.toString()}`, {
    headers: { Authorization: `KakaoAK ${key}` },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Kakao directions failed [${res.status}]: ${body}`);
    throw new Error(`카카오 경로 계산 실패 (${res.status})`);
  }

  const json = (await res.json()) as { routes?: KakaoRoute[] };
  return (json.routes ?? []).map((r) => toDTO(r, mode)).filter((r): r is RouteDTO => r !== null);
}

function requireKey() {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) throw new Error("카카오 REST API 키가 설정되지 않았습니다.");
  return key;
}

export async function computeRoutes(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  opts: { mode?: TravelMode } = {},
): Promise<{ routes: RouteDTO[]; travelMode: TravelMode }> {
  const key = requireKey();
  const mode: TravelMode = opts.mode ?? "WALKING";

  const results = await Promise.all(
    (["RECOMMEND", "TIME", "DISTANCE"] as const).map((p) =>
      callKakao(key, origin, destination, p, mode).catch((e) => {
        console.error(e);
        return [] as RouteDTO[];
      }),
    ),
  );

  const seen = new Set<string>();
  const routes: RouteDTO[] = [];
  for (const r of results.flat()) {
    const sig = `${r.distanceMeters}-${r.durationSeconds}`;
    if (seen.has(sig)) continue;
    seen.add(sig);
    routes.push(r);
  }

  if (routes.length === 0) throw new Error("경로를 찾지 못했습니다.");
  return { routes, travelMode: mode };
}

export async function computeFastest(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  opts: { mode?: TravelMode } = {},
): Promise<{ route: RouteDTO | null; travelMode: TravelMode }> {
  const key = requireKey();
  const mode: TravelMode = opts.mode ?? "DRIVING";
  const routes = await callKakao(key, origin, destination, "TIME", mode);
  const fastest = routes.sort((a, b) => a.durationSeconds - b.durationSeconds)[0] ?? null;
  return { route: fastest, travelMode: mode };
}
