// @ts-nocheck

// 카카오 지도 로더
export function loadKakaoMaps(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => resolve(window.kakao.maps));
      return;
    }

    // 여기에 따옴표 안에 본인의 카카오 자바스크립트 API 키를 직접 넣으세요!
    const appkey = "57b1d8f8b56a30d795ab205b61759665";

    if (!appkey) {
      reject(new Error("카카오 API 키가 설정되지 않았습니다."));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false&libraries=services`;
    script.async = true;
    script.onerror = () => reject(new Error("카카오 지도 SDK 로드 실패"));
    script.onload = () => {
      window.kakao.maps.load(() => resolve(window.kakao.maps));
    };

    document.head.appendChild(script);
  });
}

export const cuteMapStyle = [];

export function loadGoogleMaps(): Promise<any> {
  return loadKakaoMaps();
}
