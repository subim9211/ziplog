import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/gmaps";
import { useWardTrack } from "@/lib/store";
import { computeFastestRoute, type RouteDTO } from "@/lib/routes.functions";

export const Route = createFileRoute("/guardian-track")({
  head: () => ({
    meta: [
      { title: "피보호자 찾아가기 · 안심 귀갓길" },
      {
        name: "description",
        content: "보호자가 피보호자의 실시간 위치까지 가장 빠른 경로를 안내받습니다.",
      },
      { property: "og:title", content: "피보호자 찾아가기" },
      { property: "og:description", content: "피보호자 위치까지 최단 시간 경로 안내" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuardianTrack,
});

function GuardianTrack() {
  const fastest = useServerFn(computeFastestRoute);
  const { position: wardPos, updatedAt, destinationName } = useWardTrack();
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);
  const [route, setRoute] = useState<RouteDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mapDiv = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const lineRef = useRef<any>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("이 기기에서 위치 정보를 사용할 수 없어요.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError("보호자 위치 권한을 허용해주세요."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    if (!wardPos) return;
    let cancelled = false;

    loadKakaoMaps().then((kakao) => {
      if (cancelled || !mapDiv.current || mapRef.current) return;
      const wardLatLng = new kakao.maps.LatLng(wardPos.lat, wardPos.lng);

      mapRef.current = new kakao.maps.Map(mapDiv.current, {
        center: wardLatLng,
        level: 4,
      });

      new kakao.maps.Marker({
        position: wardLatLng,
        map: mapRef.current,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [wardPos]);

  useEffect(() => {
    if (!myPos || !wardPos) return;
    let cancelled = false;
    setLoading(true);

    fastest({ data: { origin: myPos, destination: wardPos, mode: "DRIVING" } })
      .then(({ route: r }) => {
        if (cancelled) return;
        setRoute(r);
        setLoading(false);

        if (!r || !mapRef.current || !window.kakao) return;
        const kakao = window.kakao;

        if (lineRef.current) {
          lineRef.current.setMap(null);
        }

        const path = r.path.map(
          (p: any) => new kakao.maps.LatLng(p.lat, p.lng)
        );

        lineRef.current = new kakao.maps.Polyline({
          path,
          strokeColor: "#ef4444",
          strokeWeight: 7,
          strokeOpacity: 0.9,
          map: mapRef.current,
        });

        // 보호자와 피보호자 위치가 모두 보이도록 영억 재설정
        const bounds = new kakao.maps.LatLngBounds();
        bounds.extend(new kakao.maps.LatLng(myPos.lat, myPos.lng));
        bounds.extend(new kakao.maps.LatLng(wardPos.lat, wardPos.lng));
        mapRef.current.setBounds(bounds);
      })
      .catch((e) => {
        console.error(e);
        if (cancelled) return;
        setError("경로를 계산하지 못했어요.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [myPos?.lat, myPos?.lng, wardPos?.lat, wardPos?.lng]);

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background">
      <header className="flex items-center gap-2 border-b border-border bg-card px-3 py-3">
        <Link to="/guardian" className="text-xl">←</Link>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-foreground">피보호자에게 가는 최단 경로</h1>
          <p className="text-[10px] text-muted-foreground">
            {updatedAt
              ? `마지막 위치 공유 ${Math.max(0, Math.round((Date.now() - updatedAt) / 60000))}분 전`
              : "공유된 위치 없음"}
            {destinationName ? ` · 목적지 ${destinationName}` : ""}
          </p>
        </div>
      </header>

      {!wardPos ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <div className="text-5xl">📡</div>
          <p className="text-sm font-bold text-foreground">아직 공유된 위치가 없어요</p>
          <p className="text-xs text-muted-foreground">
            피보호자가 길찾기 안내를 시작하면 실시간 위치가 이곳에 표시됩니다.
          </p>
        </div>
      ) : (
        <>
          <div className="relative h-[48%] w-full">
            <div ref={mapDiv} className="h-full w-full" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            )}
            {error && (
              <div className="absolute inset-x-3 bottom-3 rounded-xl bg-white/95 p-3 text-center text-xs text-primary shadow">
                {error}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {route && (
              <>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="rounded-2xl bg-card p-3 shadow-sm">
                    <div className="text-[10px] text-muted-foreground">예상 도착</div>
                    <div className="text-xl font-black text-foreground">
                      {Math.max(1, Math.round(route.durationSeconds / 60))}분
                    </div>
                  </div>
                  <div className="rounded-2xl bg-card p-3 shadow-sm">
                    <div className="text-[10px] text-muted-foreground">거리</div>
                    <div className="text-xl font-black text-foreground">
                      {(route.distanceMeters / 1000).toFixed(2)}km
                    </div>
                  </div>
                </div>

                <ol className="mt-3 rounded-2xl bg-card p-3 shadow-sm">
                  {route.steps.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 border-b border-border/60 py-2 last:border-b-0"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-foreground">{s.instruction}</div>
                        <div className="text-[11px] text-muted-foreground">{s.distanceMeters}m</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
