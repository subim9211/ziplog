import React, { useEffect, useRef } from 'react';

interface MapViewProps {
  mode?: 'WALK' | 'CAR';
  start?: { lat: number; lng: number };
  end?: { lat: number; lng: number };
}

declare global {
  interface Window {
    kakao: any;
  }
}

export default function MapView({ mode = 'WALK', start, end }: MapViewProps) {
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const initMap = () => {
      if (window.kakao && window.kakao.maps) {
        window.kakao.maps.load(() => {
          const container = document.getElementById('map-container');
          if (!container) return;

          const defaultLat = start?.lat || 37.566826;
          const defaultLng = start?.lng || 126.978656;

          const options = {
            center: new window.kakao.maps.LatLng(defaultLat, defaultLng),
            level: 4,
          };

          const map = new window.kakao.maps.Map(container, options);
          mapRef.current = map;

          // 출발지 마커
          if (start) {
            const startPosition = new window.kakao.maps.LatLng(start.lat, start.lng);
            new window.kakao.maps.Marker({
              position: startPosition,
              map: map,
            });
          }

          // 목적지 마커
          if (end) {
            const endPosition = new window.kakao.maps.LatLng(end.lat, end.lng);
            new window.kakao.maps.Marker({
              position: endPosition,
              map: map,
            });
          }

          // 모바일 환경에서 지도가 회색으로 깨지거나 렌더링되지 않는 문제 방지
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.relayout();
              mapRef.current.setCenter(new window.kakao.maps.LatLng(defaultLat, defaultLng));
            }
          }, 300);
        });
      }
    };

    if (window.kakao && window.kakao.maps) {
      initMap();
    } else {
      const checkInterval = setInterval(() => {
        if (window.kakao && window.kakao.maps) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, [start, end, mode]);

  // 창 크기 변경 시 모바일 화면 대응 리사이즈 처리
  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.relayout();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div id="map-container" className="w-full h-full absolute inset-0 z-10 bg-gray-100">
      {/* 카카오맵이 렌더링되는 컨테이너 */}
    </div>
  );
}
