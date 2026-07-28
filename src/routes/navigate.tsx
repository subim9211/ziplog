import React, { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import MapView from '@/components/MapView';
import { generateRouteOptions } from '@/lib/routes.core';

export function NavigateRoute() {
  const navigate = useNavigate();
  const [transportMode, setTransportMode] = useState<'WALK' | 'CAR'>('WALK');
  const [startPoint, setStartPoint] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ name: string; lat: number; lng: number } | null>(null);

  const defaultStart = { name: '현재 위치', lat: 37.5559, lng: 126.9723 };
  const defaultEnd = { name: '목적지', lat: 37.5665, lng: 126.9780 };

  const currentStart = startPoint || defaultStart;
  const currentEnd = endPoint || defaultEnd;

  const routeOptions = generateRouteOptions(
    { lat: currentStart.lat, lng: currentStart.lng },
    { lat: currentEnd.lat, lng: currentEnd.lng },
    transportMode
  );

  const selectedRoute = routeOptions[0] || { distance: 0, duration: 0 };
  const distanceKm = (selectedRoute.distance / 1000).toFixed(1);

  return (
    <div className="flex flex-col h-screen w-full relative overflow-hidden bg-background">
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2">
        <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-lg border flex items-center justify-between">
          <h1 className="font-bold text-base text-gray-800">안심 경로 안내</h1>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTransportMode('WALK')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                transportMode === 'WALK'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              도보
            </button>
            <button
              onClick={() => setTransportMode('CAR')}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                transportMode === 'CAR'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              차량
            </button>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-md p-3 rounded-xl shadow-md border flex items-center justify-between text-sm">
          <div>
            <span className="text-gray-500">거리: </span>
            <span className="font-bold text-gray-800">{distanceKm} km</span>
          </div>
          <div>
            <span className="text-gray-500">예상 시간: </span>
            <span className="font-bold text-blue-600 text-base">{selectedRoute.duration} 분</span>
          </div>
          <div>
            <span className="text-gray-500">안심 지수: </span>
            <span className="font-bold text-emerald-600">{selectedRoute.safetyScore}점</span>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative">
        <MapView mode={transportMode} start={currentStart} end={currentEnd} />
      </div>
    </div>
  );
}
