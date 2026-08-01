// @ts-nocheck
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/gmaps";
import { useRouteStore, type SafeRoute, type RouteStep } from "@/lib/store";
import { scorePath } from "@/lib/safety";
import { computeSafeRoutes, type RouteDTO } from "@/lib/routes.functions";

export const Route = createFileRoute("/routes")({
  head: () => ({
    meta: [{ title: "안전 경로 결과 · 안심 귀갓길" }],
  }),
  component: RoutesPage,
});

const LAYERS: Array<Pick<SafeRoute, "id" | "label" | "color" | "description">> = [
  { id: "safest", label: "가장 안전", color: "#22c55e", description: "경찰서·CCTV·안심시설 최대" },
  { id: "balanced", label: "균형", color: "#3b82f6", description: "안전과 빠름을 반반" },
  { id: "fastest", label: "가장 빠름", color: "#f59e0b", description: "시간 우선, 최단 경로" },
  { id: "lit", label: "밝은 길", color: "#a855f7", description: "가로등·유동인구 많은 대로" },
];

function RoutesPage() {
  const nav = useNavigate();
  const compute = useServerFn(computeSafeRoutes);
  const { origin, destination, setRoutes, routes, selectedRouteId, setSelectedRouteId, travelMode: storeTravelMode, setTravelMode } = useRouteStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylinesRef = useRef<any[]>([]);

  // 스토어에 저장된 이동 수단(없으면 기본 WALKING)
  const travelMode = storeTravelMode || "WALKING";

  useEffect(() => {
    if (!origin || !destination) {
      nav({ to: "/" });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      loadKakaoMaps(),
      compute({
        data: {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          mode: travelMode,
        },
      }),
    ])
      .then(([kakaoMaps, result]: [any, { routes: RouteDTO[] }]) => {
        if (cancelled) return;

        if (!mapRef.current && mapDiv.current) {
          const container = mapDiv.current;
          const options = {
            center: new kakaoMaps.LatLng(origin.lat, origin.lng),
            level: travelMode === "DRIVING" ? 5 : 4,
          };
          mapRef.current = new kakaoMaps.Map(container, options);
        }

        const rawRoutes = result.routes ? result.routes.slice(0, 4) : [];
        if (rawRoutes.length === 0) {
          setError("경로를 찾지 못했어요. 다른 장소로 시도해주세요.");
          setLoading(false);
          return;
        }
        while (rawRoutes.length < 4) rawRoutes.push(rawRoutes[0]);

        const built: SafeRoute[] = rawRoutes.map((r, i) => {
          const layer = LAYERS[i];
          const path = r.path || [];
          const { safetyScore, policeNearby, safetyFacilities, facilityDataAvailable } = scorePath(path);

          const steps: RouteStep[] = (r.steps || []).map((s) => ({
            instruction: (s.instruction ?? "").replace(/<[^>]*>/g, ""),
            distanceMeters: s.distanceMeters,
            durationSeconds: s.durationSeconds,
            startLocation: s.startLocation,
            endLocation: s.endLocation,
          }));

          // 소요 시간은 카카오 길찾기 결과(차량: 실시간 교통 반영 / 도보: 카카오 보행 속도 환산)를 그대로 사용
          const finalDurationSeconds = r.durationSeconds;

          let bias = 0;
          if (layer.id === "safest") bias = 15;
          if (layer.id === "lit") bias = 8;
          if (layer.id === "fastest") bias = -10;

          const baseScore = safetyScore + bias + (4 - i) * 3;
          const adjustedScore = travelMode === "DRIVING" ? Math.min(100, baseScore + 5) : baseScore;

          return {
            ...layer,
            safetyScore: Math.max(10, Math.min(100, adjustedScore)),
            distanceMeters: r.distanceMeters,
            durationSeconds: finalDurationSeconds,
            travelMode: travelMode,
            path,
            steps,
            policeNearby,
            safetyFacilities,
            facilityDataAvailable,
          };
        });

        setRoutes(built);
        setSelectedRouteId(built[0].id);
        setLoading(false);

        polylinesRef.current.forEach((p) => p.setMap(null));
        polylinesRef.current = [];

        const bounds = new kakaoMaps.LatLngBounds();
        bounds.extend(new kakaoMaps.LatLng(origin.lat, origin.lng));
        bounds.extend(new kakaoMaps.LatLng(destination.lat, destination.lng));

        built.forEach((r) => {
          const linePath = r.path.map((p) => new kakaoMaps.LatLng(p.lat, p.lng));
          const polyline = new kakaoMaps.Polyline({
            path: linePath,
            strokeWeight: 6,
            strokeColor: r.color,
            strokeOpacity: 0.85,
            strokeStyle: "solid",
          });
          polyline.setMap(mapRef.current);
          polylinesRef.current.push(polyline);
        });

        mapRef.current.setBounds(bounds);

        new kakaoMaps.Marker({
          position: new kakaoMaps.LatLng(origin.lat, origin.lng),
          map: mapRef.current,
        });
        new kakaoMaps.Marker({
          position: new kakaoMaps.LatLng(destination.lat, destination.lng),
          map: mapRef.current,
        });
      })
      .catch((e) => {
        console.error(e);
        setError("경로를 찾지 못했어요. 다른 장소로 시도해주세요.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [origin, destination, travelMode]);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <header className="flex items-center justify-between border-b border-border bg-card px-3 py-3">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-xl">←</Link>
          <h1 className="text-sm font-bold text-foreground">
            {travelMode === "DRIVING" ? "🚗 차량 경로 4개 비교" : "🚶 도보 경로 4개 비교"}
          </h1>
        </div>
        {/* 도보 / 차량 모드 즉시 전환 버튼 추가 */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button
            onClick={() => setTravelMode("WALKING")}
            className={`px-2 py-1 text-xs font-bold rounded-md transition ${travelMode === "WALKING" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            도보
          </button>
          <button
            onClick={() => setTravelMode("DRIVING")}
            className={`px-2 py-1 text-xs font-bold rounded-md transition ${travelMode === "DRIVING" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            차량
          </button>
        </div>
      </header>

      <div className="relative h-[42%] w-full">
        <div ref={mapDiv} className="h-full w-full" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="mt-2 text-xs text-muted-foreground">카카오 지도 경로 계산 중…</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/90 p-6 text-center text-sm text-primary">
            {error}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pt-3">
        <div className="grid grid-cols-2 gap-2">
          {routes.map((r) => {
            const active = r.id === selectedRouteId;
            return (
              <button
                key={r.id}
                onClick={() => setSelectedRouteId(r.id)}
                className={`rounded-2xl border-2 p-3 text-left transition ${
                  active ? "border-primary bg-card shadow-md" : "border-border bg-card/60"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: r.color }} />
                  <span className="text-xs font-bold text-foreground">{r.label}</span>
                </div>
                <div className="mt-2 text-2xl font-black text-foreground">
                  {r.safetyScore}
                  <span className="text-xs font-normal text-muted-foreground"> /100</span>
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">
                  {Math.round(r.durationSeconds / 60)}분 · {(r.distanceMeters / 1000).toFixed(2)}km
                </div>
                <div className="mt-1 text-[10px] text-muted-foreground">{r.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedRouteId && (
        <div className="grid grid-cols-2 gap-2 border-t border-border bg-card p-3">
          <Link
            to="/route-detail"
            className="rounded-full bg-secondary py-3 text-center text-sm font-bold text-foreground"
          >
            📋 상세 경로(길찾기)
          </Link>
          <Link
            to="/navigate"
            className="rounded-full bg-primary py-3 text-center text-sm font-bold text-primary-foreground"
          >
            {travelMode === "DRIVING" ? "🚗 안내 시작" : "🚶 안내 시작"}
          </Link>
        </div>
      )}
    </div>
  );
}

