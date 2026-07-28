// src/components/MapView.tsx 예시 수정
useEffect(() => {
  if (window.kakao && window.kakao.maps) {
    const container = document.getElementById('map');
    const options = {
      center: new window.kakao.maps.LatLng(37.566826, 126.978656),
      level: 3
    };
    const map = new window.kakao.maps.Map(container, options);

    // ★ 핵심: 모바일/반응형 환경에서 지도가 깨지거나 안 뜨는 현상 방지
    setTimeout(() => {
      map.relayout();
    }, 500);

    // 윈도우 사이즈가 바뀔 때도 relayout 실행
    const handleResize = () => {
      map.relayout();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }
}, []);
