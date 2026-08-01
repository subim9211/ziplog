import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { MapView } from "@/components/MapView";
import { PlaceAutocomplete } from "@/components/PlaceAutocomplete";
import { useRouteStore, type Place } from "@/lib/store";
import { useGuardian } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "안심 귀갓길 · 안전 경로 안내" },
      {
        name: "description",
        content: "AI가 경찰서·안심시설물 데이터를 분석해 가장 안전한 귀갓길을 안내해요.",
      },
      { property: "og:title", content: "안심 귀갓길 · 안전 경로 안내" },
      { property: "og:description", content: "AI가 경찰서·안심시설물 데이터를 분석해 가장 안전한 귀갓길을 안내해요." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const { origin, destination, setOrigin, setDestination, reset, travelMode, setTravelMode } =
    useRouteStore();
  const { guardianPhone } = useGuardian();
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<any>(null);

  // Get user location for "current location" origin
  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({
          name: "현재 위치",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };

  const canSearch = origin && destination;

  const emergencyReport = () => {
    setReporting(true);
    setTimeout(() => setReporting(false), 3500);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-background">
      {/* Cute map */}
      <div className="absolute inset-0">
        <MapView
          start={origin ?? undefined}
          end={destination ?? undefined}
          mode={travelMode === "DRIVING" ? "CAR" : "WALK"}
          onMap={(m: any) => {
            mapRef.current = m;
          }}
        />
      </div>

      {/* Top status bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-6 items-center justify-center bg-neutral-200/70">
        <span className="text-[10px] text-neutral-500">●●●</span>
      </div>

      {/* Search bar */}
      <div className="absolute inset-x-0 top-6 z-20 flex items-start gap-2 px-3 pt-3">
        <button
          onClick={useCurrentLocation}
          aria-label="현재 위치 사용"
          className="flex h-16 w-11 items-center justify-center rounded-lg text-foreground"
          title="현재 위치"
        >
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" strokeLinecap="round" />
            {locating && <circle cx="12" cy="12" r="3" fill="currentColor" />}
          </svg>
        </button>

        <div className="flex-1 rounded-xl border-2 border-primary bg-white p-1 shadow-lg">
          <div className="flex items-center gap-1 border-b border-dashed border-neutral-300">
            <span className="pl-2 text-xs font-bold text-foreground">출발지:</span>
            <div className="flex-1">
              <PlaceAutocomplete
                value={origin}
                placeholder=""
                onSelect={setOrigin}
                onClear={() => setOrigin(null)}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="pl-2 text-xs font-bold text-foreground">도착지:</span>
            <div className="flex-1">
              <PlaceAutocomplete
                value={destination}
                placeholder=""
                onSelect={setDestination}
                onClear={() => setDestination(null)}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="메뉴"
          className="flex h-16 w-11 items-center justify-center text-foreground"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Search button appears when both set */}
      {/* 이동 수단 선택 (도보 / 차량) */}
      <div className="absolute inset-x-0 top-[152px] z-20 flex justify-center px-4">
        <div className="flex gap-1 rounded-full bg-white/95 p-1 shadow-lg">
          <button
            onClick={() => setTravelMode("WALKING")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              travelMode === "WALKING" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            🚶 도보
          </button>
          <button
            onClick={() => setTravelMode("DRIVING")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
              travelMode === "DRIVING" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            🚗 차량(택시)
          </button>
        </div>
      </div>

      {canSearch && (
        <div className="absolute inset-x-0 top-[196px] z-20 flex justify-center px-4">
          <button
            onClick={() => nav({ to: "/routes" })}
            className="w-full max-w-sm rounded-full bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg active:scale-95"
          >
            🛡️ {travelMode === "DRIVING" ? "차량" : "도보"} 안전 경로 4개 찾기
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl bg-white pt-3 pb-6 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        <div className="relative flex items-end justify-around px-6">
          <button
            onClick={() => {}}
            aria-label="알림"
            className="flex flex-col items-center gap-1 py-1 text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" strokeLinejoin="round" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
          </button>

          <button
            onClick={emergencyReport}
            aria-label="긴급신고"
            className="absolute left-1/2 -top-8 -translate-x-1/2 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl active:scale-95"
          >
            <span className="text-lg font-black">긴급신고</span>
          </button>

          <div className="w-24" />

          <Link
            to="/guardian"
            aria-label="보호자 설정"
            className="flex flex-col items-center gap-1 py-1 text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
            </svg>
            {guardianPhone && (
              <span className="absolute h-2 w-2 translate-x-3 -translate-y-6 rounded-full bg-safe" />
            )}
          </Link>

          <Link
            to="/security"
            aria-label="보안 화면"
            className="flex flex-col items-center gap-1 py-1 text-primary"
          >
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </Link>
        </div>

        <div className="mt-3 flex justify-center">
          <SOSButton />
        </div>
      </div>

      {/* Side menu */}
      {menuOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/40"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-0 h-full w-64 bg-card p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-foreground">메뉴</h2>
            <nav className="mt-4 flex flex-col gap-2 text-sm">
              <button onClick={() => { reset(); setMenuOpen(false); }} className="rounded-lg px-3 py-2 text-left hover:bg-accent">
                🔄 경로 초기화
              </button>
              <Link to="/guardian" className="rounded-lg px-3 py-2 hover:bg-accent" onClick={() => setMenuOpen(false)}>
                👥 보호자 설정
              </Link>
              <Link to="/security" className="rounded-lg px-3 py-2 hover:bg-accent" onClick={() => setMenuOpen(false)}>
                🔒 보안 화면
              </Link>
            </nav>
            <div className="mt-8 text-xs text-muted-foreground">
              <p>보호자: {guardianPhone || "등록 안 됨"}</p>
            </div>
          </div>
        </div>
      )}

      {/* Report toast */}
      {reporting && <ReportOverlay guardianPhone={guardianPhone} />}
    </div>
  );
}

function ReportOverlay({ guardianPhone }: { guardianPhone: string }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "" : d + ".")), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-primary/95 text-primary-foreground">
      <div className="text-6xl">🚨</div>
      <h2 className="mt-4 text-2xl font-black">긴급 신고 접수됨</h2>
      <p className="mt-2 text-sm">경찰(112){dots}</p>
      {guardianPhone ? (
        <p className="mt-1 text-sm">보호자 {guardianPhone}에게 문자 전송됨</p>
      ) : (
        <p className="mt-1 text-xs opacity-80">※ 보호자 미등록 상태</p>
      )}
    </div>
  );
}

function SOSButton() {
  const audioRef = useRef<{ ctx: AudioContext; osc: OscillatorNode; gain: GainNode; lfo: number } | null>(null);
  const [on, setOn] = useState(false);
  const toggle = () => {
    if (on) {
      audioRef.current?.osc.stop();
      audioRef.current?.ctx.close();
      window.clearInterval(audioRef.current!.lfo);
      audioRef.current = null;
      setOn(false);
      return;
    }
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 800;
    gain.gain.value = 0.4;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    let high = true;
    const lfo = window.setInterval(() => {
      osc.frequency.setValueAtTime(high ? 500 : 1100, ctx.currentTime);
      high = !high;
    }, 350);
    audioRef.current = { ctx, osc, gain, lfo };
    setOn(true);
  };
  return (
    <button
      onClick={toggle}
      className={`rounded-full px-6 py-2 text-xs font-black tracking-widest shadow ${
        on ? "bg-primary text-primary-foreground animate-pulse" : "border-2 border-primary text-primary"
      }`}
    >
      {on ? "🔊 SOS 사이렌 켜짐" : "SOS 사이렌"}
    </button>
  );
}
