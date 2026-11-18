export interface ProductItem {
  id: string;          // 고유 ID (예: item_1731900001)
  category: string;    // 카테고리 (예: "빵", "쿠키", "음료")
  name: string;        // 상품명
  price: number;       // 가격 (원)
  stock: number;       // 현재 남은 수량 (0이면 품절)
  isSoldOut: boolean;  // 재고와 독립적인 품절 표시 상태
  imageUrl: string;    // Cloudinary WebP 이미지 URL
  isVisible: boolean;  // 오늘 판매 목록 노출 여부 (시즌오프/휴무 메뉴 숨김용)
  order: number;       // 진열 순서
}

export interface StoreData {
  updatedAt: string;     // ISO 타임스탬프 (예: 2026-11-18T15:30:00.000Z)
  notice: string;        // 상단 한 줄 공지 (예: "소금빵 2차는 오후 3시에 나옵니다!")
  isOpen?: boolean;      // 영업 중 여부 (미설정 시 영업 중으로 처리)
  categories?: string[]; // (선택) 카테고리 탭 순서 관리용 (예: ["전체", "빵", "쿠키", "음료"])
  items: ProductItem[];  // 전체 상품 목록 배열
}