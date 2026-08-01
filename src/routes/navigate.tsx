import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/gmaps";
import { useRouteStore, useGuardian, useWardTrack } from "@/lib/store";

export const Route = createFileRoute("/navigate")({
  head: () => ({
    meta: [
      { title: "실시간 안내 · 안심 귀갓길" },
      { name: "description", content: "GPS로 내 위치를 실시간 갱신하며 안전 경로를 안내해요." },
      { property: "og:title", content: "실시간 안내 · 안심 귀갓길" },
      { property: "og:description", content: "GPS 기반 턴바이턴 안전 경로 네비게이션" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NavigatePage,
});

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat);
  const dLon = toR(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}

function NavigatePage() {
  const nav = useNavigate();
  const { routes, selectedRouteId, destination, currentPosition, setCurrentPosition, setNavigating } =
    useRouteStore();
  const { guardianPhone } = useGuardian();
  const setWardPosition = useWardTrack((s) => s.setWardPosition);

  const route = routes.find((r) => r.id === selectedRouteId);
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const meMarkerRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [arrived, setArrived] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    if (!route) {
      nav({ to: "/" });
      return;
    }
    setNavigating(true);
    let cancelled = false;

    loadKakaoMaps()
      .then((kakaoMaps) => {
        if (cancelled || !mapDiv.current) return;
        const start = route.path[0];
        const map = new kakaoMaps.Map(mapDiv.current, {
          center: new kakaoMaps.LatLng(start.lat, start.lng),
          level: route.travelMode === "DRIVING" ? 4 : 3,
        });
        mapRef.current = map;

        new kakaoMaps.Polyline({
          path: route.path.map((p: any) => new kakaoMaps.LatLng(p.lat, p.lng)),
          strokeWeight: 8,
          strokeColor: route.color,
          strokeOpacity: 0.9,
          map,
        }).setMap(map);

        if (destination) {
          new kakaoMaps.Marker({
            position: new kakaoMaps.LatLng(destination.lat, destination.lng),
            map,
          }).setMap(map);
        }

        meMarkerRef.current = new kakaoMaps.Circle({
          center: new kakaoMaps.LatLng(start.lat, start.lng),
          radius: 12,
          strokeWeight: 3,
          strokeColor: "#ffffff",
          fillColor: "#3b82f6",
          fillOpacity: 1,
        });
        meMarkerRef.current.setMap(map);
        setTimeout(() => map.relayout(), 300);
      })
      .catch((e) => console.error("지도 로드 실패", e));

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPosition(p);
          setWardPosition(p, destination?.name ?? null);
          setPoints((n) => n + 1);
          const kakaoMaps = (window as any).kakao?.maps;
          if (mapRef.current && meMarkerRef.current && kakaoMaps) {
            const ll = new kakaoMaps.LatLng(p.lat, p.lng);
            meMarkerRef.current.setPosition(ll);
            mapRef.current.panTo(ll);
          }
        },
        (err) => console.warn("위치 정보 오류", err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 },
      );
    }

    return () => {
      cancelled = true;
      setNavigating(false);
      if (watchIdRef.current != null && navigator.geolocation)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.id]);

  // 현재 위치에 따라 안내 단계 진행
  useEffect(() => {
    if (!route || !currentPosition) return;
    const step = route.steps[stepIndex];
    if (!step) return;
    if (distance(currentPosition, step.endLocation) < 30) {
      if (stepIndex + 1 >= route.steps.length) setArrived(true);
      else setStepIndex((i) => i + 1);
    }
    if (destination && distance(currentPosition, destination) < 40) setArrived(true);
  }, [currentPosition, stepIndex, route, destination]);

  if (!route) return null;

  const step = route.steps[stepIndex];
  const remainingMeters = route.steps.slice(stepIndex).reduce((s, x) => s + x.distanceMeters, 0) ||
    route.distanceMeters;
  const remainingSec =
    route.steps.slice(stepIndex).reduce((s, x) => s + x.durationSeconds, 0) || route.durationSeconds;

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="text-4xl font-black">
            {step?.instruction?.includes("좌") ? "↰" : step?.instruction?.includes("우") ? "↱" : "↑"}
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold leading-tight">
              {arrived ? "목적지에 도착했어요!" : step?.instruction || "경로를 따라 이동하세요"}
            </div>
            <div className="mt-1 text-xs opacity-90">
              {route.travelMode === "DRIVING" ? "🚗 차량" : "🚶 도보"} 안내 ·{" "}
              {step ? `${step.distanceMeters}m 앞` : ""}
            </div>
          </div>
          <Link to="/routes" aria-label="안내 종료" className="text-2xl">
            ✕
          </Link>
        </div>
      </div>

      <div className="relative flex-1">
        <div ref={mapDiv} className="h-full w-full" />
        {guardianPhone && (
          <div className="absolute left-3 top-3 rounded-full bg-emerald-500/90 px-3 py-1 text-[10px] font-bold text-white shadow">
            👥 보호자에게 실시간 공유 중 · {points}지점
          </div>
        )}
      </div>

      <div className="border-t border-border bg-card p-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">남은 거리 </span>
            <span className="font-bold">{(remainingMeters / 1000).toFixed(2)}km</span>
          </div>
          <div>
            <span className="text-muted-foreground">남은 시간 </span>
            <span className="font-bold text-primary">{Math.max(1, Math.round(remainingSec / 60))}분</span>
          </div>
          <div>
            <span className="text-muted-foreground">안심 지수 </span>
            <span className="font-bold text-emerald-600">{route.safetyScore}점</span>
          </div>
        </div>
        <Link
          to="/route-detail"
          className="mt-3 block w-full rounded-full bg-secondary py-2.5 text-center text-xs font-bold text-foreground"
        >
          📋 전체 상세 경로 보기
        </Link>
      </div>
    </div>
  );
}
