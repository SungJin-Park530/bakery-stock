import { useState } from 'react';
import { useStoreData } from '../hooks/useStoreData';
import { Bell, ChevronDown, ChevronUp, Clock3, RotateCcw, Search, X } from 'lucide-react';

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
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) return <div className="p-4 text-center">불러오는 중...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  const visibleItems = customerData.items.filter((item) => item.isVisible !== false);
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

  return (
    <div className="mx-auto min-h-screen max-w-md bg-stone-50 pb-10 text-stone-900 shadow-sm">
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="px-5 pb-4 pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-semibold tracking-wide text-amber-700">오늘의 빵</p>
              <h1 className="text-2xl font-bold leading-tight">동네빵집 재고알리미</h1>
            </div>
            <div className="mt-1 flex shrink-0 items-center gap-1 text-right text-xs text-stone-500">
              <Clock3 size={14} aria-hidden="true" />
              <span>{formatUpdatedAt(customerData.updatedAt)}</span>
            </div>
          </div>

          {customerData.notice.trim() && (
            <section className="mt-4 rounded-md border border-amber-200 bg-amber-100 text-sm leading-5 text-amber-950">
              <div className="flex items-start gap-3 px-3 py-2.5">
                <Bell className="mt-0.5 shrink-0 text-amber-700" size={17} aria-hidden="true" />
                <button
                  type="button"
                  aria-expanded={isNoticeExpanded}
                  onClick={() => setIsNoticeExpanded((expanded) => !expanded)}
                  className="flex min-w-0 flex-1 items-start justify-between gap-2 text-left"
                >
                  <p className={`min-w-0 flex-1 whitespace-pre-wrap ${isNoticeExpanded ? 'max-h-40 overflow-y-auto' : 'line-clamp-1'}`}>
                    {customerData.notice}
                  </p>
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-800">
                    {isNoticeExpanded ? '접기' : '펼치기'}
                    {isNoticeExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </span>
                </button>
              </div>
            </section>
          )}
        </div>

        <nav
          aria-label="상품 카테고리"
          className="flex gap-2 overflow-x-auto whitespace-nowrap border-b border-stone-100 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              aria-pressed={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
              className={`min-h-11 shrink-0 border-b-2 px-2 text-sm font-semibold ${
                selectedCategory === category
                  ? 'border-amber-700 text-amber-800'
                  : 'border-transparent text-stone-500'
              }`}
            >
              {category}
            </button>
          ))}
        </nav>

        <div className="px-4 py-3">
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 focus-within:border-amber-600">
            <Search size={18} className="shrink-0 text-stone-500" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="빵 이름 검색"
              aria-label="상품명 검색"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="검색어 전체 삭제"
                onClick={() => setSearchQuery('')}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-stone-500 active:bg-stone-200"
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </label>
        </div>
      </header>

      <main className="px-4 pt-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-bold">오늘 준비된 빵</h2>
          <span className="text-xs text-stone-500">{filteredItems.length}가지</span>
        </div>

        {filteredItems.length === 0 ? (
          selectedCategory !== '전체' || searchQuery.trim() ? (
            <div className="flex flex-col items-center rounded-md bg-white px-4 py-10 text-center">
              <p className="text-sm text-stone-600">조건에 맞는 상품이 없습니다.</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('전체');
                  setSearchQuery('');
                }}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-stone-300 px-4 text-sm font-semibold text-stone-700 active:bg-stone-100"
              >
                <RotateCcw size={16} aria-hidden="true" />
                검색 초기화
              </button>
            </div>
          ) : (
            <p className="rounded-md bg-white px-4 py-10 text-center text-sm text-stone-500">
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
                  className="flex min-h-28 overflow-hidden rounded-md border border-stone-200 bg-white"
                >
                  <div className={`relative h-28 w-28 shrink-0 ${isSoldOut ? 'opacity-50 grayscale' : ''}`}>
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2 p-3">
                    <div className={`min-w-0 ${isSoldOut ? 'opacity-50 grayscale' : ''}`}>
                      <p className="mb-1 inline-flex rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        {item.category}
                      </p>
                      <h3 className="truncate font-semibold">{item.name}</h3>
                      <p className="mt-1 text-sm font-medium text-stone-700">
                        {item.price.toLocaleString('ko-KR')}원
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {isSoldOut ? (
                        <span className="rounded-sm bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                          품절
                        </span>
                      ) : (
                        <span className="text-right text-xs text-stone-500">
                          남은 수량: {item.stock}개
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}