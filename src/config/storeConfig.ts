export const STORE_CONFIG = {
	badgeText: "TODAY'S BAKE",
	storeName: "리리빵집 오늘의 빵",
	footerNotice: "매장 상황에 따라 재고가 달라질 수 있어요.",
	inAppBrowserNotice: "카카오톡 내부 브라우저에서는 실시간 갱신이 지연될 수 있어요. 사파리나 크롬 이용을 권장합니다.",
	adminTitle: "리리빵집 재고관리(관리자용)",
} as const;

export const {
	badgeText,
	storeName,
	footerNotice,
	inAppBrowserNotice,
	adminTitle,
} = STORE_CONFIG;