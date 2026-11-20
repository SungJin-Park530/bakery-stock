import { useEffect, useRef, useState } from 'react';
import { useStoreData } from '../hooks/useStoreData';
import { STORE_CONFIG } from '../config/storeConfig';
import defaultProductImage from '../assets/defaultimg.webp';
import { Bell, Check, ChevronDown, Copy, MessageCircle, RotateCcw, Search, X } from 'lucide-react';

function formatUpdatedAt(value: string) {
  const updatedAt = new Date(value);
  if (Number.isNaN(updatedAt.getTime())) return '업데이트 시간 확인 불가';

  const time = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(updatedAt);
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(updatedAt);
  const updatedDate = dateParts.map((part) => part.value).join('');
  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const today = todayParts.map((part) => part.value).join('');

  if (updatedDate === today) return `오늘 ${time} 업데이트`;

  const date = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  }).format(updatedAt);
  return `${date} ${time} 업데이트`;
}

export default function CustomerPage() {
  const { serverData, storeData, loading, error } = useStoreData();
  const customerData = serverData ?? storeData;
  const [isNoticeExpanded, setIsNoticeExpanded] = useState(false);
  const [isNoticeScrollable, setIsNoticeScrollable] = useState(false);
  const [isNoticeAtBottom, setIsNoticeAtBottom] = useState(false);
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [isOrderGuideCopied, setIsOrderGuideCopied] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const noticeContentRef = useRef<HTMLSpanElement>(null);

  const copyOrderGuide = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(customerData.orderGuideText);
      } else {
        const temporaryInput = document.createElement('textarea');
        temporaryInput.value = customerData.orderGuideText;
        temporaryInput.style.position = 'fixed';
        temporaryInput.style.opacity = '0';
        document.body.appendChild(temporaryInput);
        temporaryInput.select();
        const copied = document.execCommand('copy');
        temporaryInput.remove();
        if (!copied) throw new Error('Clipboard copy was rejected');
      }
      setIsOrderGuideCopied(true);
      window.setTimeout(() => setIsOrderGuideCopied(false), 1800);
    } catch {
      setIsOrderGuideCopied(false);
    }
  };

  useEffect(() => {
    const content = noticeContentRef.current;
    if (!isNoticeExpanded || !content) {
      setIsNoticeScrollable(false);
      setIsNoticeAtBottom(false);
      return;
    }

    const updateScrollState = () => {
      const canScroll = content.scrollHeight > content.clientHeight + 1;
      setIsNoticeScrollable(canScroll);
      setIsNoticeAtBottom(!canScroll || content.scrollTop + content.clientHeight >= content.scrollHeight - 1);
    };
    const animationFrame = requestAnimationFrame(updateScrollState);
    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(content);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [customerData.notice, isNoticeExpanded]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-page text-brand-primary">
        <span
          className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-border-subtle border-t-brand-primary"
          role="status"
          aria-label="불러오는 중"
        />
        <p className="text-sm font-medium">매장 정보를 불러오는 중입니다...</p>
      </div>
    );
  }
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  const visibleItems = customerData.items.filter((item) => item.isVisible !== false);
  const isOpen = customerData.isOpen !== false;
  const availableCategories = [...new Set(visibleItems.map((item) => item.category).filter(Boolean))];
  const configuredCategories = (customerData.categories ?? []).filter(
    (category, index, categories) => category !== '전체' && categories.indexOf(category) === index
  );
  const orderedCategories = customerData.categories?.length
    ? [
        ...configuredCategories.filter((category) => availableCategories.includes(category)),
        ...availableCategories
          .filter((category) => !configuredCategories.includes(category))
          .sort((a, b) => a.localeCompare(b, 'ko')),
      ]
    : availableCategories.sort((a, b) => a.localeCompare(b, 'ko'));
  const categories = ['전체', ...orderedCategories];
  const filteredItems = [...visibleItems]
    .filter((item) => selectedCategory === '전체' || item.category === selectedCategory)
    .filter((item) => item.name.toLocaleLowerCase('ko').includes(searchQuery.trim().toLocaleLowerCase('ko')))
    .sort((a, b) => {
      const aIsSoldOut = a.isSoldOut === true || a.stock === 0;
      const bIsSoldOut = b.isSoldOut === true || b.stock === 0;
      const stockOrder = Number(aIsSoldOut) - Number(bIsSoldOut);
      return stockOrder || a.order - b.order;
    });
  const selectedProduct = selectedProductId
    ? visibleItems.find((item) => item.id === selectedProductId)
    : undefined;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-surface-page pb-8 text-stone-900 shadow-sm">
      <header className="sticky top-0 z-20 bg-brand-primary text-white shadow-sm">
        <div className="px-5 pb-5 pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="rounded-md bg-brand-accent px-3 py-1.5 text-sm font-bold text-white">
              {STORE_CONFIG.badgeText}
            </p>
            <span className="shrink-0 text-right text-xs text-white/70">
              {formatUpdatedAt(customerData.updatedAt)}
            </span>
          </div>
          <h1 className="mt-4 whitespace-nowrap text-2xl font-bold leading-tight">
            {STORE_CONFIG.storeName}
          </h1>

          {customerData.notice.trim() && (
            <section className="mt-5 rounded-lg border border-white/10 bg-brand-primary-dark text-sm leading-5 text-white">
              <button
                type="button"
                aria-label={isNoticeExpanded ? '공지사항 접기' : '공지사항 펼치기'}
                aria-expanded={isNoticeExpanded}
                onClick={() => {
                  if (isNoticeExpanded && noticeContentRef.current) {
                    noticeContentRef.current.scrollTop = 0;
                  }
                  setIsNoticeExpanded((expanded) => !expanded);
                }}
                className="flex w-full items-center gap-3 px-3.5 py-4 text-left"
              >
                <Bell className="shrink-0 text-brand-accent" size={20} aria-hidden="true" />
                <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <span
                    ref={noticeContentRef}
                    onScroll={(event) => {
                      const content = event.currentTarget;
                      setIsNoticeAtBottom(content.scrollTop + content.clientHeight >= content.scrollHeight - 1);
                    }}
                    style={{
                      maskImage: isNoticeScrollable && !isNoticeAtBottom
                        ? 'linear-gradient(to bottom, black 70%, transparent 100%)'
                        : 'none',
                      WebkitMaskImage: isNoticeScrollable && !isNoticeAtBottom
                        ? 'linear-gradient(to bottom, black 70%, transparent 100%)'
                        : 'none',
                    }}
                    className={`min-w-0 flex-1 whitespace-pre-wrap text-sm ${isNoticeExpanded ? 'max-h-32 overflow-y-auto' : 'line-clamp-1 overflow-hidden'}`}
                  >
                    {customerData.notice}
                  </span>
                  <ChevronDown
                    size={18}
                    aria-hidden="true"
                    className={`shrink-0 transition-transform ${isNoticeExpanded ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>
            </section>
          )}
        </div>

        {isOpen && (
          <>
            <nav
              aria-label="상품 카테고리"
              className="flex gap-5 overflow-x-auto whitespace-nowrap border-b border-border-subtle bg-surface-card px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selectedCategory === category}
                  onClick={() => setSelectedCategory(category)}
                  className={`min-h-11 shrink-0 border-b-2 px-2 text-sm ${
                    selectedCategory === category
                      ? 'border-brand-primary font-bold text-brand-primary'
                      : 'border-transparent font-semibold text-stone-500'
                  }`}
                >
                  {category}
                </button>
              ))}
            </nav>

            <div className="bg-surface-card px-4 py-3.5">
              <label className="flex min-h-12 items-center gap-2 rounded-lg border border-border-subtle bg-surface-muted px-3.5 focus-within:border-brand-primary">
                <Search size={18} className="shrink-0 text-stone-500" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="찾으시는 빵 이름을 입력하세요"
                  aria-label="상품명 검색"
                  className="min-w-0 flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                />
              </label>
            </div>
          </>
        )}
      </header>

      <main className="px-4 pt-5">
        {!isOpen ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <section className="w-full rounded-xl border border-border-subtle bg-surface-card px-6 py-10 text-center">
              <p className="whitespace-pre-line text-lg font-bold text-brand-primary">
                {customerData.closedTitle.trim() || '현재 영업 준비 중이거나 휴무일입니다.'}
              </p>
            </section>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-xl font-bold">오늘 준비된 빵</h2>
              <span className="text-sm font-medium text-stone-500">{filteredItems.length}가지</span>
            </div>

            {filteredItems.length === 0 ? (
              selectedCategory !== '전체' || searchQuery.trim() ? (
                <div className="flex flex-col items-center rounded-xl border border-border-subtle bg-surface-card px-4 py-10 text-center">
                  <p className="text-sm text-stone-600">조건에 맞는 상품이 없습니다.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('전체');
                      setSearchQuery('');
                    }}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-border-subtle px-4 text-sm font-semibold text-brand-primary active:bg-surface-muted"
                  >
                    <RotateCcw size={16} aria-hidden="true" />
                    검색 초기화
                  </button>
                </div>
              ) : (
                <p className="rounded-xl border border-border-subtle bg-surface-card px-4 py-10 text-center text-sm text-stone-500">
                  아직 등록된 빵이 없습니다.
                </p>
              )
            ) : (
              <ul className="space-y-3">
                {filteredItems.map((item) => {
                  const isSoldOut = item.isSoldOut === true || item.stock === 0;

                  return (
                    <li
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.name} 상세 정보 보기`}
                      onClick={() => setSelectedProductId(item.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedProductId(item.id);
                        }
                      }}
                      className={`flex min-h-28 items-center gap-3.5 rounded-xl border border-border-subtle bg-surface-card p-3.5 ${isSoldOut ? 'opacity-60' : ''}`}
                    >
                      <div className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-lg ${isSoldOut ? 'grayscale' : ''}`}>
                        <img
                          src={item.imageUrl || defaultProductImage}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="mb-1 inline-flex rounded bg-surface-muted px-2 py-1 text-xs font-medium text-stone-600">
                            {item.category}
                          </p>
                          <h3 className="truncate text-base font-bold">{item.name}</h3>
                          <p className="mt-1 text-sm font-medium text-stone-700">
                            {item.price.toLocaleString('ko-KR')}원
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center justify-center">
                          {isSoldOut ? (
                            <span className="-rotate-6 rounded border border-status-soldout/60 px-3 py-1 text-sm font-bold text-status-soldout">
                              품절
                            </span>
                          ) : (
                            <span className="min-w-[76px] rounded-lg bg-brand-primary px-3 py-2 text-center text-white">
                              <span className="mx-auto mb-1 block h-1.5 w-1.5 rounded-full bg-white/60" />
                              <span className="block text-xs text-white/75">남은 수량</span>
                              <span className="mt-0.5 block text-2xl font-bold leading-tight">{item.stock}개</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
      <footer className="px-4 pb-12 pt-5 text-center">
        <p className="text-xs text-stone-500">{STORE_CONFIG.footerNotice}</p>
        <p className="mt-1 text-[11px] text-stone-400">{STORE_CONFIG.inAppBrowserNotice}</p>
      </footer>
      {selectedProduct && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedProductId(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-detail-title"
            className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-surface-card shadow-xl"
          >
            <header className="sticky top-0 z-10 flex min-h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4">
              <h2 id="product-detail-title" className="truncate pr-3 text-lg font-bold text-brand-primary">
                {selectedProduct.name}
              </h2>
              <button
                type="button"
                aria-label="상품 상세 닫기"
                onClick={() => setSelectedProductId(null)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-stone-600 active:bg-surface-muted"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </header>
            <div className="min-h-0 overflow-y-auto">
              <img
                src={selectedProduct.imageUrl || defaultProductImage}
                alt={selectedProduct.name}
                className="aspect-square w-full object-contain"
              />
              <div className="space-y-3 p-5">
                <span className="inline-flex rounded-lg bg-surface-muted px-2.5 py-1 text-xs font-semibold text-stone-600">
                  {selectedProduct.category}
                </span>
                <h3 className="text-xl font-bold text-stone-900">{selectedProduct.name}</h3>
                <p className="text-lg font-semibold text-stone-800">
                  {selectedProduct.price.toLocaleString('ko-KR')}원
                </p>
                {selectedProduct.isSoldOut === true || selectedProduct.stock === 0 ? (
                  <p className="text-sm font-bold text-status-soldout">품절</p>
                ) : (
                  <p className="text-sm text-stone-600">남은 수량 {selectedProduct.stock}개</p>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
      {customerData.kakaoChatUrl.trim() && (
        <button
          type="button"
          onClick={() => setIsOrderSheetOpen(true)}
          className="fixed bottom-6 right-5 z-30 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#FEE500] px-4 text-sm font-bold text-stone-900 shadow-lg"
        >
          <MessageCircle size={19} aria-hidden="true" />
          카톡 주문/문의
        </button>
      )}
      {isOrderSheetOpen && customerData.kakaoChatUrl.trim() && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOrderSheetOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-sheet-title"
            className="flex max-h-[68dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-surface-card p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="order-sheet-title" className="text-lg font-bold text-brand-primary">카카오톡 주문/문의</h2>
              <button
                type="button"
                aria-label="주문 안내 닫기"
                onClick={() => setIsOrderSheetOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-full text-stone-600 active:bg-surface-muted"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <div className="mb-3 min-h-20 max-h-[34dvh] shrink overflow-y-auto whitespace-pre-line rounded-xl border border-border-subtle bg-surface-muted p-4 text-sm leading-6 text-stone-700">
              {customerData.orderGuideText}
            </div>
            <button
              type="button"
              onClick={() => void copyOrderGuide()}
              className="mb-3 flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-card px-4 text-sm font-semibold text-brand-primary active:bg-surface-muted"
            >
              {isOrderGuideCopied ? <Check size={18} aria-hidden="true" /> : <Copy size={18} aria-hidden="true" />}
              {isOrderGuideCopied ? '복사했습니다' : '주문 양식 복사하기'}
            </button>
            <a
              href={customerData.kakaoChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 text-sm font-bold text-stone-900"
            >
              <MessageCircle size={19} aria-hidden="true" />
              카카오톡 채팅방 열기
            </a>
          </section>
        </div>
      )}
    </div>
  );
}