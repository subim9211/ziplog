// src/lib/routes.core.ts

import policeData from '@/data/police.json';
import safetyData from '@/data/safety.json';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface RouteOption {
  id: string;
  title: string;
  mode: 'WALK' | 'CAR';
  distance: number; // 미터(m) 단위
  duration: number; // 분 단위
  safetyScore: number;
  path: Coordinate[];
  description: string;
}

// 두 좌표간의 거리 계산 (Haversine Formula)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // 지구 반경 (미터)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // 미터 단위 반환
}

// 이동 수단(도보/차량)에 따른 예상 시간 계산 함수 (추가된 핵심 기능)
export function calculateDuration(distanceMeters: number, mode: 'WALK' | 'CAR'): number {
  // 도보 속도: 약 4km/h (분당 약 66.7미터 이동)
  // 차량 속도: 도심 평균 속도 고려 (분당 약 500미터 이동)
  const speedMetersPerMinute = mode === 'WALK' ? 67 : 500;
  
  const durationMinutes = Math.ceil(distanceMeters / speedMetersPerMinute);
  return Math.max(durationMinutes, 1); // 최소 1분 보장
}

// 안전 시설물 및 경찰서 데이터를 활용한 주변 치안 점수 산출 로직 (기존 원본 기능 전체 유지)
export function calculateSafetyScore(path: Coordinate[]): number {
  let score = 70; // 기본 점수

  if (!path || !Array.isArray(path) || path.length === 0) return score;

  // 경로 주변의 안전 시설(CCTV, 보안등 등) 및 경찰서 데이터와의 거리 계산 반영
  path.forEach((point) => {
    // 경찰서 데이터 검사
    if (policeData && Array.isArray(policeData)) {
      policeData.forEach((police: any) => {
        if (police && typeof police.lat === 'number' && typeof police.lng === 'number') {
          const dist = calculateDistance(point.lat, point.lng, police.lat, police.lng);
          if (dist < 200) { // 200미터 이내에 경찰서가 있으면 가점
            score += 5;
          }
        }
      });
    }

    // 안심 시설 데이터 검사
    if (safetyData && Array.isArray(safetyData)) {
      safetyData.forEach((facility: any) => {
        if (facility && typeof facility.lat === 'number' && typeof facility.lng === 'number') {
          const dist = calculateDistance(point.lat, point.lng, facility.lat, facility.lng);
          if (dist < 100) { // 100미터 이내에 안심 시설이 있으면 가점
            score += 2;
          }
        }
      });
    }
  });

  // 점수 범위 0 ~ 100 사이로 제한
  return Math.min(Math.max(score, 10), 100);
}

// 종합 경로 옵션 생성 함수 (기존 기능 및 확장 구조 포함)
export function generateRouteOptions(
  start: Coordinate,
  end: Coordinate,
  mode: 'WALK' | 'CAR' = 'WALK'
): RouteOption[] {
  if (!start || !end) return [];

  const directDistance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
  
  // 기본 직선 경로 외에 안전 우선 우회 경로 등 시뮬레이션 좌표 생성
  const midPoint: Coordinate = {
    lat: (start.lat + end.lat) / 2 + 0.001,
    lng: (start.lng + end.lng) / 2 - 0.001,
  };

  const directPath = [start, end];
  const safePath = [start, midPoint, end];

  const directDuration = calculateDuration(directDistance, mode);
  const safeDistance = directDistance * 1.2; // 우회로는 거리가 약간 더 김
  const safeDuration = calculateDuration(safeDistance, mode);

  const directSafetyScore = calculateSafetyScore(directPath);
  const safeSafetyScore = calculateSafetyScore(safePath);

  return [
    {
      id: 'safe-1',
      title: '안심 추천 경로',
      mode: mode,
      distance: Math.round(safeDistance),
      duration: safeDuration,
      safetyScore: Math.min(safeSafetyScore + 15, 95),
      path: safePath,
      description: 'CCTV와 방범 시설이 인접하여 야간에도 안전한 경로입니다.',
    },
    {
      id: 'fast-1',
      title: '최단 거리 경로',
      mode: mode,
      distance: Math.round(directDistance),
      duration: directDuration,
      safetyScore: directSafetyScore,
      path: directPath,
      description: '목적지까지 가장 빠르게 도달할 수 있는 직선 위주의 경로입니다.',
    },
  ];
}
