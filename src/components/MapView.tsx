import { useEffect, useRef } from "react";
import { loadKakaoMaps } from "@/lib/gmaps";

export interface MapViewProps {
  mode?: "WALK" | "CAR";
  start?: { lat: number; lng: number } | null;
  end?: { lat: number; lng: number } | null;
  path?: { lat: number; lng: number }[];
  onMap?: (map: any) => void;
}

declare global {
  interface Window {
    kakao: any;
  }
}

export function MapView({ mode = "WALK", start, end, path, onMap }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const kakaoRef = useRef<any>(null);

  // 지도 1회 초기화 (모바일 브라우저에서도 SDK 로드를 보장)
  useEffect(() => {
    let cancelled = false;
    loadKakaoMaps()
      .then((kakaoMaps) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        kakaoRef.current = kakaoMaps;
        const center = start ?? { lat: 37.5665, lng: 126.978 };
        const map = new kakaoMaps.Map(containerRef.current, {
          center: new kakaoMaps.LatLng(center.lat, center.lng),
          level: mode === "CAR" ? 5 : 4,
        });
        mapRef.current = map;
        onMap?.(map);
        // 모바일에서 컨테이너 크기 확정 후 다시 그리기
        setTimeout(() => {
          map.relayout();
          map.setCenter(new kakaoMaps.LatLng(center.lat, center.lng));
        }, 300);
      })
      .catch((e) => console.error("지도 로드 실패", e));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 마커 / 경로선 갱신
  useEffect(() => {
    const kakaoMaps = kakaoRef.current;
    const map = mapRef.current;
    if (!kakaoMaps || !map) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const bounds = new kakaoMaps.LatLngBounds();
    let hasBounds = false;

    if (path && path.length > 1) {
      const line = new kakaoMaps.Polyline({
        path: path.map((p) => new kakaoMaps.LatLng(p.lat, p.lng)),
        strokeWeight: 6,
        strokeColor: mode === "CAR" ? "#3b82f6" : "#22c55e",
        strokeOpacity: 0.9,
      });
      line.setMap(map);
      overlaysRef.current.push(line);
      path.forEach((p) => bounds.extend(new kakaoMaps.LatLng(p.lat, p.lng)));
      hasBounds = true;
    }

    [start, end].forEach((pt) => {
      if (!pt) return;
      const marker = new kakaoMaps.Marker({
        position: new kakaoMaps.LatLng(pt.lat, pt.lng),
      });
      marker.setMap(map);
      overlaysRef.current.push(marker);
      bounds.extend(new kakaoMaps.LatLng(pt.lat, pt.lng));
      hasBounds = true;
    });

    if (hasBounds && start && end) map.setBounds(bounds);
    else if (start) map.setCenter(new kakaoMaps.LatLng(start.lat, start.lng));
  }, [start, end, path, mode]);

  // 화면 회전 / 리사이즈 대응
  useEffect(() => {
    const onResize = () => mapRef.current?.relayout();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 h-full w-full bg-neutral-100" />;
}

export default MapView;
