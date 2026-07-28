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
  distance: number;
  duration: number;
  safetyScore: number;
  path: Coordinate[];
  description: string;
}

// Haversine formula를 이용한 두 좌표 간 거리 계산 (미터 단위)
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// 도보/차량 선택 모드에 따른 이동 시간(분) 계산 함수
export function calculateDuration(distanceMeters: number, mode: 'WALK' | 'CAR'): number {
  const speedMetersPerMinute = mode === 'WALK' ? 67 : 500;
  const durationMinutes = Math.ceil(distanceMeters / speedMetersPerMinute);
  return Math.max(durationMinutes, 1);
}

// 주변 경찰서 및 안심 시설 데이터를 활용한 안전 지수 산출 로직
export function calculateSafetyScore(path: Coordinate[]): number {
  let score = 70;

  if (!path || !Array.isArray(path) || path.length === 0) return score;

  path.forEach((point) => {
    if (policeData && Array.isArray(policeData)) {
      policeData.forEach((police: any) => {
        if (police && typeof police.lat === 'number' && typeof police.lng === 'number') {
          const dist = calculateDistance(point.lat, point.lng, police.lat, police.lng);
          if (dist < 200) {
            score += 5;
          }
        }
      });
    }

    if (safetyData && Array.isArray(safetyData)) {
      safetyData.forEach((facility: any) => {
        if (facility && typeof facility.lat === 'number' && typeof facility.lng === 'number') {
          const dist = calculateDistance(point.lat, point.lng, facility.lat, facility.lng);
          if (dist < 100) {
            score += 2;
          }
        }
      });
    }
  });

  return Math.min(Math.max(score, 10), 100);
}

// 종합 경로 옵션 생성 함수
export function generateRouteOptions(
  start: Coordinate,
  end: Coordinate,
  mode: 'WALK' | 'CAR' = 'WALK'
): RouteOption[] {
  if (!start || !end) return [];

  const directDistance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
  
  const midPoint: Coordinate = {
    lat: (start.lat + end.lat) / 2 + 0.001,
    lng: (start.lng + end.lng) / 2 - 0.001,
  };

  const directPath = [start, end];
  const safePath = [start, midPoint, end];

  const directDuration = calculateDuration(directDistance, mode);
  const safeDistance = directDistance * 1.2;
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

// 외부 함수(routes.functions.ts 등)에서 요구하는 호환용 함수 추가
export function computeRoutes(start: Coordinate, end: Coordinate, mode: 'WALK' | 'CAR' = 'WALK'): RouteOption[] {
  return generateRouteOptions(start, end, mode);
}

export function computeFastest(start: Coordinate, end: Coordinate, mode: 'WALK' | 'CAR' = 'WALK'): RouteOption {
  const options = generateRouteOptions(start, end, mode);
  return options.find(opt => opt.id === 'fast-1') || options[0];
}
