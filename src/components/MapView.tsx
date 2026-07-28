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

export function MapView({ mode = 'WALK', start, end }: MapViewProps) {
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

          if (start) {
            const startPosition = new window.kakao.maps.LatLng(start.lat, start.lng);
            new window.kakao.maps.Marker({
              position: startPosition,
              map: map,
            });
          }

          if (end) {
            const endPosition = new window.kakao.maps.LatLng(end.lat, end.lng);
            new window.kakao.maps.Marker({
              position: endPosition,
              map: map,
            });
          }

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
      {/* 지도 렌더링 컨테이너 */}
    </div>
  );
}
