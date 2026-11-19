import { useEffect, useRef, useState, type FormEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Check, Eye, EyeOff, ImagePlus, LoaderCircle, Save, Search, Trash2, X } from 'lucide-react';
import { STORE_CONFIG } from '../config/storeConfig';
import { auth } from '../lib/firebaseAuth';
import { useStoreData } from '../hooks/useStoreData';
import type { ProductItem } from '../types/bakery';

type AdminTab = 'stock' | 'notice' | 'register';
type ToastState = { message: string; type: 'success' | 'error' } | null;
type ProductFormValues = Omit<ProductItem, 'id' | 'imageUrl' | 'order'>;

const NEW_CATEGORY_OPTION = '__new_category__';

interface ProductDraftFormProps {
  categories: string[];
  initialItem?: ProductItem;
  submitLabel: string;
  submitFormId?: string;
  onSubmit: (values: ProductFormValues, imageFile?: File, previewUrl?: string) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

function ProductDraftForm({
  categories,
  initialItem,
  submitLabel,
  submitFormId,
  onSubmit,
  onCancel,
  onDelete,
}: ProductDraftFormProps) {
  const initialCategory = initialItem?.category ?? '';
  const [name, setName] = useState(initialItem?.name ?? '');
  const [categorySelection, setCategorySelection] = useState(
    initialCategory && !categories.includes(initialCategory)
      ? NEW_CATEGORY_OPTION
      : initialCategory || categories[0] || NEW_CATEGORY_OPTION
  );
  const [customCategory, setCustomCategory] = useState(
    initialCategory && !categories.includes(initialCategory) ? initialCategory : ''
  );
  const [price, setPrice] = useState(initialItem ? String(initialItem.price) : '');
  const [stock, setStock] = useState(String(initialItem?.stock ?? 0));
  const [isVisible, setIsVisible] = useState(initialItem?.isVisible ?? true);
  const [isSoldOut, setIsSoldOut] = useState(initialItem?.isSoldOut ?? false);
  const [selectedFile, setSelectedFile] = useState<File>();
  const [previewUrl, setPreviewUrl] = useState(initialItem?.imageUrl ?? '');
  const previewRef = useRef<string | null>(null);
  const transferredPreviewRef = useRef(false);
  const idPrefix = initialItem ? 'edit-product' : 'new-product';

  useEffect(() => () => {
    if (previewRef.current && !transferredPreviewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    previewRef.current = nextPreviewUrl;
    transferredPreviewRef.current = false;
    setSelectedFile(file);
    setPreviewUrl(nextPreviewUrl);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const resolvedCategory = categorySelection === NEW_CATEGORY_OPTION
      ? customCategory.trim()
      : categorySelection;
    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (
      !name.trim() ||
      !resolvedCategory ||
      !Number.isSafeInteger(numericPrice) || numericPrice < 0 ||
      !Number.isSafeInteger(numericStock) || numericStock < 0 ||
      (!initialItem && !selectedFile)
    ) return;

    if (previewRef.current) transferredPreviewRef.current = true;
    onSubmit({
      name: name.trim(),
      category: resolvedCategory,
      price: numericPrice,
      stock: numericStock,
      isVisible,
      isSoldOut,
    }, selectedFile, selectedFile ? previewUrl : undefined);
  };

  return (
    <form id={submitFormId} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${idPrefix}-name`} className="mb-1 block text-sm font-semibold text-stone-800">
          상품명
        </label>
        <input
          id={`${idPrefix}-name`}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          required
          className="min-h-12 w-full rounded-lg border border-border-subtle bg-surface-card px-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}-category`} className="mb-1 block text-sm font-semibold text-stone-800">
          카테고리
        </label>
        <select
          id={`${idPrefix}-category`}
          value={categorySelection}
          onChange={(event) => setCategorySelection(event.target.value)}
          className="min-h-12 w-full rounded-lg border border-border-subtle bg-surface-card px-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        >
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          <option value={NEW_CATEGORY_OPTION}>직접 입력...</option>
        </select>
        {categorySelection === NEW_CATEGORY_OPTION && (
          <input
            type="text"
            value={customCategory}
            onChange={(event) => setCustomCategory(event.target.value)}
            placeholder="새 카테고리 이름"
            aria-label="새 카테고리 이름"
            maxLength={30}
            required
            className="mt-2 min-h-12 w-full rounded-lg border border-border-subtle bg-surface-card px-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-price`} className="mb-1 block text-sm font-semibold text-stone-800">
            가격 (원)
          </label>
          <input
            id={`${idPrefix}-price`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
            className="min-h-12 w-full rounded-lg border border-border-subtle bg-surface-card px-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-stock`} className="mb-1 block text-sm font-semibold text-stone-800">
            {initialItem ? '현재 수량' : '초기 수량'}
          </label>
          <input
            id={`${idPrefix}-stock`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={stock}
            onChange={(event) => setStock(event.target.value)}
            required
            className="min-h-12 w-full rounded-lg border border-border-subtle bg-surface-card px-3 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-border-subtle bg-surface-muted p-3">
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-stone-800">
          손님 화면에 노출
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(event) => setIsVisible(event.target.checked)}
            className="h-5 w-5 accent-brand-primary"
          />
        </label>
        <label className="flex min-h-11 items-center justify-between gap-3 text-sm font-medium text-stone-800">
          품절로 표시
          <input
            type="checkbox"
            checked={isSoldOut}
            onChange={(event) => setIsSoldOut(event.target.checked)}
            className="h-5 w-5 accent-status-danger"
          />
        </label>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-image`} className="mb-1 block text-sm font-semibold text-stone-800">
          사진 {initialItem ? '(선택)' : ''}
        </label>
        <input
          id={`${idPrefix}-image`}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          required={!initialItem}
          className="min-h-12 w-full rounded-lg border border-border-subtle bg-surface-card p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-brand-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        {previewUrl ? (
          <img src={previewUrl} alt="상품 사진 미리보기" className="mt-3 h-40 w-full rounded-lg object-cover" />
        ) : (
          <div className="mt-3 flex h-32 items-center justify-center rounded-lg bg-surface-muted text-sm text-stone-500">
            <ImagePlus size={18} className="mr-2" aria-hidden="true" />
            사진 미리보기
          </div>
        )}
        {selectedFile && <p className="mt-1 truncate text-xs text-stone-500">{selectedFile.name} · 저장 시 업로드</p>}
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-card font-semibold text-brand-primary"
          >
            <X size={17} aria-hidden="true" />
            취소
          </button>
        )}
        {!submitFormId && (
          <button type="submit" className="min-h-12 flex-1 rounded-lg bg-brand-primary px-3 font-bold text-white active:bg-brand-primary-dark">
            {submitLabel}
          </button>
        )}
      </div>

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold text-status-danger"
        >
          <Trash2 size={16} aria-hidden="true" />
          상품 삭제
        </button>
      )}
    </form>
  );
}

export default function AdminPage() {
  const [user, setUser] = useState(auth.currentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('stock');
  const [selectedStockCategory, setSelectedStockCategory] = useState('전체');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [registerFormVersion, setRegisterFormVersion] = useState(0);
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [noticeDraft, setNoticeDraft] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const previewUrlsRef = useRef<Record<string, string>>({});
  const {
    draftData,
    hasChanges,
    hasServerUpdate,
    isSaving,
    toggleDraftOpen,
    updateDraftStock,
    toggleDraftSoldOut,
    updateDraftNotice,
    updateDraftItem,
    removeDraftItem,
    saveChanges,
    discardChanges,
    loadLatestServerData,
  } = useStoreData();
  const isOpen = draftData.isOpen !== false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeoutId = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => () => {
    Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!hasChanges) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [hasChanges]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setToast({ message: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.', type: 'error' });
    }
  };

  const handleNoticeApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateDraftNotice(noticeDraft);
    setIsEditingNotice(false);
    setToast({ message: '공지사항을 초안에 반영했습니다.', type: 'success' });
  };

  const handleNoticeEdit = () => {
    setNoticeDraft(draftData.notice);
    setIsEditingNotice(true);
  };

  const handleNoticeCancel = () => {
    setNoticeDraft(draftData.notice);
    setIsEditingNotice(false);
  };

  const handleLogout = () => {
    if (hasChanges && !window.confirm('저장하지 않은 변경사항이 있습니다. 정말 로그아웃하시겠습니까?')) return;
    void signOut(auth);
  };

  const handleSaveChanges = async () => {
    try {
      await saveChanges();
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = {};
      setToast({ message: '변경사항을 저장했습니다.', type: 'success' });
    } catch {
      setToast({ message: '저장에 실패했습니다. 네트워크와 이미지 업로드 설정을 확인해주세요.', type: 'error' });
    }
  };

  const handleDiscardChanges = () => {
    if (!window.confirm('저장하지 않은 변경사항을 모두 버릴까요?')) return;
    discardChanges();
    Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = {};
    setSelectedItemId(null);
    setRegisterFormVersion((version) => version + 1);
    setNoticeDraft(draftData.notice);
    setIsEditingNotice(false);
    setToast({ message: '저장하지 않은 변경사항을 취소했습니다.', type: 'success' });
  };

  const handleLoadLatestData = () => {
    if (!window.confirm('내 초안과 대기 중인 변경사항을 버리고 최신 서버 데이터를 불러올까요?')) return;
    loadLatestServerData();
    Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = {};
    setSelectedItemId(null);
    setRegisterFormVersion((version) => version + 1);
    setNoticeDraft(draftData.notice);
    setIsEditingNotice(false);
    setToast({ message: '최신 서버 데이터를 불러왔습니다.', type: 'success' });
  };

  const keepPreviewUrl = (itemId: string, previewUrl?: string) => {
    if (!previewUrl) return;
    const previousUrl = previewUrlsRef.current[itemId];
    if (previousUrl && previousUrl !== previewUrl) URL.revokeObjectURL(previousUrl);
    previewUrlsRef.current[itemId] = previewUrl;
  };

  const handleRegisterProduct = (values: ProductFormValues, imageFile?: File, previewUrl?: string) => {
    const itemId = `item_${Date.now()}`;
    const newItem: ProductItem = {
      ...values,
      id: itemId,
      imageUrl: previewUrl ?? '',
      order: draftData.items.reduce((maxOrder, item) => Math.max(maxOrder, item.order), -1) + 1,
    };
    updateDraftItem(newItem, imageFile);
    keepPreviewUrl(itemId, previewUrl);
    setRegisterFormVersion((version) => version + 1);
    setActiveTab('stock');
    setToast({
      message: '초안에 새 상품이 추가되었습니다. 하단 저장 버튼을 눌러 반영하세요.',
      type: 'success',
    });
  };

  const handleEditProduct = (
    item: ProductItem,
    values: ProductFormValues,
    imageFile?: File,
    previewUrl?: string
  ) => {
    updateDraftItem({ ...item, ...values, imageUrl: previewUrl ?? item.imageUrl }, imageFile);
    keepPreviewUrl(item.id, previewUrl);
    setSelectedItemId(null);
    setToast({ message: '상품 정보를 초안에 반영했습니다.', type: 'success' });
  };

  const handleDeleteProduct = (item: ProductItem) => {
    if (!window.confirm(`'${item.name}' 상품을 초안에서 삭제할까요?`)) return;
    removeDraftItem(item.id);
    const previewUrl = previewUrlsRef.current[item.id];
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    delete previewUrlsRef.current[item.id];
    setSelectedItemId(null);
    setToast({ message: '상품을 초안에서 삭제했습니다.', type: 'success' });
  };

  if (!user) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center bg-surface-page p-6">
        <section className="rounded-xl border border-border-subtle bg-surface-card p-6">
        <h1 className="mb-6 text-center text-2xl font-bold text-brand-primary">사장님 로그인</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="min-h-12 rounded-lg border border-border-subtle bg-surface-card px-3 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            required
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-h-12 rounded-lg border border-border-subtle bg-surface-card px-3 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
            required
          />
          <button type="submit" className="min-h-12 rounded-lg bg-brand-primary font-bold text-white active:bg-brand-primary-dark">
            로그인
          </button>
        </form>
        </section>
        {toast && (
          <p role="status" className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded bg-red-700 px-4 py-3 text-sm text-white">
            {toast.message}
          </p>
        )}
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'stock', label: '재고 관리' },
    { id: 'notice', label: '공지사항' },
    { id: 'register', label: '등록하기' },
  ];
  const draftCategories = [...new Set([
    ...(draftData.categories ?? []),
    ...draftData.items.map((item) => item.category),
  ].filter((category) => category && category !== '전체' && category !== '품절'))];
  const configuredCategories = (draftData.categories ?? []).filter(
    (category, index, categories) => category !== '전체' && category !== '품절' && categories.indexOf(category) === index
  );
  const orderedCategories = draftData.categories?.length
    ? [
        ...configuredCategories.filter((category) => draftCategories.includes(category)),
        ...draftCategories
          .filter((category) => !configuredCategories.includes(category))
          .sort((a, b) => a.localeCompare(b, 'ko')),
      ]
    : draftCategories.sort((a, b) => a.localeCompare(b, 'ko'));
  const stockCategories = ['전체', ...orderedCategories, '품절', '미노출'];
  const filteredStockItems = draftData.items
    .filter((item) => {
      const isSoldOut = item.isSoldOut === true || item.stock === 0;
      const matchesCategory = selectedStockCategory === '전체'
        || selectedStockCategory === '미노출'
        || (selectedStockCategory === '품절' ? isSoldOut : item.category === selectedStockCategory);
      const matchesVisibility = selectedStockCategory === '미노출'
        ? !item.isVisible
        : selectedStockCategory === '품절'
          ? item.isVisible
          : true;
      const matchesSearch = item.name.toLocaleLowerCase('ko').includes(stockSearchQuery.trim().toLocaleLowerCase('ko'));
      return matchesCategory && matchesVisibility && matchesSearch;
    })
    .sort((a, b) => a.order - b.order);
  const editingItem = selectedItemId
    ? draftData.items.find((item) => item.id === selectedItemId)
    : undefined;

  return (
    <div className="mx-auto min-h-screen max-w-md bg-surface-page pb-28 text-stone-900 shadow-sm">
      <div className="sticky top-0 z-20 bg-brand-primary text-white shadow-sm">
        <header className="flex min-h-16 items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">{STORE_CONFIG.adminTitle}</h1>
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-10 rounded-lg border border-white/30 px-3 py-1.5 text-sm font-semibold text-white"
          >
            로그아웃
          </button>
        </header>
        <div className="px-4 pb-4">
          <div className="flex min-h-14 items-center justify-between gap-3 rounded-xl bg-brand-primary-light px-4 py-3">
            <div className="flex min-w-0 items-center gap-3 text-sm font-semibold">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-gray-400'}`} />
              <span>{isOpen ? '현재 매장 영업 중' : '현재 영업 종료·휴무'}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isOpen}
              aria-label="매장 영업 상태"
              onClick={toggleDraftOpen}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${isOpen ? 'bg-emerald-500' : 'bg-gray-500'}`}
            >
              <span className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${isOpen ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        <nav aria-label="관리 메뉴" className="flex border-b border-border-subtle bg-surface-card text-stone-600">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-12 flex-1 border-b-2 px-2 text-sm ${
                activeTab === tab.id
                  ? 'border-brand-primary font-bold text-brand-primary'
                  : 'border-transparent text-stone-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <main className="bg-surface-page p-4 pb-40">
        {hasServerUpdate && (
          <section role="alert" className="mb-4 space-y-3 rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-sm font-semibold leading-5 text-amber-950">
              다른 기기에서 데이터가 변경되었습니다.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleLoadLatestData}
                disabled={isSaving}
                className="min-h-11 rounded-lg border border-border-subtle bg-surface-card px-2 text-xs font-semibold text-brand-primary disabled:opacity-50"
              >
                최신 데이터 불러오기
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="min-h-11 rounded-lg bg-brand-primary px-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                내 초안으로 덮어쓰기
              </button>
            </div>
          </section>
        )}
        {activeTab === 'stock' ? (
          <section aria-labelledby="stock-heading" className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 id="stock-heading" className="text-lg font-bold text-stone-900">재고 관리</h2>
              <span className="text-xs text-stone-500">{filteredStockItems.length}개 상품</span>
            </div>

            <nav
              aria-label="재고 카테고리 필터"
              className="-mx-4 flex gap-2 overflow-x-auto whitespace-nowrap px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {stockCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-pressed={selectedStockCategory === category}
                  onClick={() => setSelectedStockCategory(category)}
                  className={`min-h-11 shrink-0 rounded-lg border px-4 text-sm font-semibold ${
                    category === '품절'
                      ? 'border-status-danger bg-surface-card text-status-danger'
                      : category === '미노출'
                        ? selectedStockCategory === category
                          ? 'border-stone-600 bg-stone-600 text-white'
                          : 'border-stone-400 bg-surface-card text-stone-700'
                      : selectedStockCategory === category
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-border-subtle bg-surface-card text-stone-700'
                  }`}
                >
                  {category}
                </button>
              ))}
            </nav>

            <label className="flex min-h-12 items-center gap-2 rounded-xl border border-border-subtle bg-surface-card px-3.5 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary">
              <Search size={18} className="shrink-0 text-stone-500" aria-hidden="true" />
              <input
                type="search"
                value={stockSearchQuery}
                onChange={(event) => setStockSearchQuery(event.target.value)}
                placeholder="상품명 빠른 검색"
                aria-label="상품명 검색"
                className="min-w-0 flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
              />
            </label>

            {filteredStockItems.length === 0 ? (
                <p className="rounded-xl border border-border-subtle bg-surface-card px-4 py-10 text-center text-sm text-stone-500">
                조건에 맞는 상품이 없습니다.
              </p>
            ) : (
              <ul className="space-y-3">
                {filteredStockItems.map((item) => {
                  const isSoldOut = item.isSoldOut === true || item.stock === 0;

                  return (
                    <li key={item.id} className={`rounded-xl border bg-surface-card p-4 ${isSoldOut && item.isVisible ? 'border-status-danger/30' : 'border-border-subtle'}`}>
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="h-[52px] w-[52px] shrink-0 rounded-lg object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <span className="rounded-lg bg-surface-muted px-2 py-1 text-xs font-medium text-stone-600">
                              {item.category}
                            </span>
                            {!item.isVisible && (
                              <span className="rounded-lg bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-700">
                                미노출
                              </span>
                            )}
                            {isSoldOut && item.isVisible && (
                              <span className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-status-danger">
                                품절 노출중
                              </span>
                            )}
                          </div>
                          <h3 className="truncate font-semibold text-stone-900">{item.name}</h3>
                          <p className="mt-0.5 text-sm text-stone-600">{item.price.toLocaleString('ko-KR')}원</p>
                        </div>
                        <button
                          type="button"
                          aria-label={item.isVisible ? `${item.name} 미노출로 전환` : `${item.name} 노출로 전환`}
                          aria-pressed={!item.isVisible}
                          onClick={() => updateDraftItem({ ...item, isVisible: !item.isVisible })}
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${item.isVisible ? 'border-border-subtle text-stone-500' : 'border-stone-400 bg-stone-100 text-stone-700'}`}
                        >
                          {item.isVisible ? <Eye size={19} aria-hidden="true" /> : <EyeOff size={19} aria-hidden="true" />}
                        </button>
                      </div>

                      {item.isVisible && <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-muted p-2">
                        <button
                          type="button"
                          aria-label={`${item.name} 수량 1 감소`}
                          onClick={() => updateDraftStock(item.id, Math.max(0, item.stock - 1))}
                          className="h-11 w-12 shrink-0 rounded-lg border border-border-subtle bg-surface-card text-lg font-bold text-brand-primary active:bg-surface-page"
                        >
                          -1
                        </button>
                        <label className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-card px-2">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            aria-label={`${item.name} 재고 수량`}
                            value={item.stock}
                            onChange={(event) => {
                              const parsedStock = Number.parseInt(event.target.value, 10);
                              updateDraftStock(item.id, Number.isNaN(parsedStock) ? 0 : Math.max(0, parsedStock));
                            }}
                            className="min-w-0 w-full bg-transparent text-center text-lg font-bold outline-none focus:text-brand-primary"
                          />
                          <span className="shrink-0 text-lg font-bold text-stone-800">개</span>
                        </label>
                        <button
                          type="button"
                          aria-label={`${item.name} 수량 1 증가`}
                          onClick={() => updateDraftStock(item.id, item.stock + 1)}
                          className="h-11 w-12 shrink-0 rounded-lg bg-brand-primary text-lg font-bold text-white active:bg-brand-primary-dark"
                        >
                          +1
                        </button>
                      </div>}

                      <div className="flex items-center justify-between gap-3 pt-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={item.isSoldOut}
                            aria-label={`${item.name} 품절 상태`}
                            onClick={() => toggleDraftSoldOut(item.id)}
                            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${item.isSoldOut ? 'bg-status-danger' : 'bg-stone-300'}`}
                          >
                            <span className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${item.isSoldOut ? 'translate-x-5' : 'translate-x-0'}`} />
                          </button>
                          <span className={`truncate text-sm font-semibold ${item.isSoldOut ? 'text-status-danger' : 'text-stone-600'}`}>
                            {item.isSoldOut ? '수량 유지 품절' : '정상 판매 중'}
                          </span>
                        </div>
                        <button
                          type="button"
                          aria-pressed={selectedItemId === item.id}
                          onClick={() => setSelectedItemId(item.id)}
                          className={`min-h-11 shrink-0 rounded-lg border px-4 text-sm font-semibold ${selectedItemId === item.id ? 'border-brand-primary bg-surface-muted text-brand-primary' : 'border-border-subtle bg-surface-card text-brand-primary'}`}
                        >
                          정보 편집
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : activeTab === 'notice' ? (
          <section aria-labelledby="notice-heading" className="space-y-4">
            <div>
              <h2 id="notice-heading" className="text-lg font-bold text-gray-900">공지사항</h2>
              <p className="mt-1 text-sm text-gray-500">
                고객 화면 상단에 표시할 공지입니다. 변경 내용은 하단 버튼으로 저장해야 반영됩니다.
              </p>
            </div>

            {isEditingNotice ? (
              <form onSubmit={handleNoticeApply} className="space-y-3">
                <label htmlFor="notice-draft" className="sr-only">공지사항 내용 편집</label>
                <textarea
                  id="notice-draft"
                  value={noticeDraft}
                  onChange={(event) => setNoticeDraft(event.target.value)}
                  rows={7}
                  maxLength={1000}
                  autoFocus
                  className="min-h-40 w-full resize-y rounded-xl border border-border-subtle bg-surface-card p-3 text-sm leading-6 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  placeholder="고객에게 전달할 공지사항을 입력하세요."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleNoticeCancel}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-border-subtle bg-surface-card font-semibold text-brand-primary"
                  >
                    <X size={17} aria-hidden="true" />
                    취소
                  </button>
                  <button
                    type="submit"
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary font-bold text-white active:bg-brand-primary-dark"
                  >
                    <Check size={17} aria-hidden="true" />
                    초안에 반영
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="min-h-32 whitespace-pre-wrap break-words rounded-xl border border-border-subtle bg-surface-card p-4 text-sm leading-6 text-stone-800">
                  {draftData.notice || '등록된 공지사항이 없습니다.'}
                </div>
                <button
                  type="button"
                  onClick={handleNoticeEdit}
                  className="min-h-12 w-full rounded-lg border border-brand-primary font-semibold text-brand-primary active:bg-surface-muted"
                >
                  편집
                </button>
              </div>
            )}
          </section>
        ) : activeTab === 'register' ? (
          <section aria-labelledby="register-heading" className="space-y-4">
            <div>
              <h2 id="register-heading" className="text-lg font-bold text-stone-900">새 상품 등록</h2>
              <p className="mt-1 text-sm text-stone-500">등록 내용과 사진은 초안에 반영되며, 하단 저장 버튼을 눌러야 반영됩니다.</p>
            </div>
            <ProductDraftForm
              key={registerFormVersion}
              categories={draftCategories}
              submitLabel="초안에 추가"
              submitFormId="register-product-form"
              onSubmit={handleRegisterProduct}
            />
          </section>
        ) : null}
      </main>

      {editingItem && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedItemId(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-heading"
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-xl border border-border-subtle bg-surface-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="edit-product-heading" className="text-lg font-bold text-brand-primary">상품 편집</h2>
              <button
                type="button"
                aria-label="편집 모달 닫기"
                onClick={() => setSelectedItemId(null)}
                className="grid h-11 w-11 place-items-center rounded-full text-stone-600 active:bg-surface-muted"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <ProductDraftForm
              key={editingItem.id}
              categories={draftCategories}
              initialItem={editingItem}
              submitLabel="초안에 반영"
              onSubmit={(values, imageFile, previewUrl) =>
                handleEditProduct(editingItem, values, imageFile, previewUrl)
              }
              onCancel={() => setSelectedItemId(null)}
              onDelete={() => handleDeleteProduct(editingItem)}
            />
          </section>
        </div>
      )}

      {(activeTab === 'register' || hasChanges) && (
        <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-subtle bg-surface-card px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg">
          <div className="mx-auto flex max-w-md flex-col gap-2">
            {activeTab === 'register' && (
              <button
                type="submit"
                form="register-product-form"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-primary px-3 font-bold text-white active:bg-brand-primary-dark"
              >
                초안에 추가
              </button>
            )}
            {hasChanges && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={isSaving}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-1 rounded-lg border border-border-subtle bg-surface-card px-3 text-sm font-semibold text-brand-primary disabled:opacity-50"
                >
                  <X size={16} aria-hidden="true" />
                  초안 버리기
                </button>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary px-3 font-bold text-white active:bg-brand-primary-dark disabled:cursor-wait disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                      저장 중...
                    </>
                  ) : (
                    <>
                      <Save size={18} aria-hidden="true" />
                      변경사항 저장하기
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </footer>
      )}

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-1/2 top-20 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-2 rounded px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-700' : 'bg-red-700'
          }`}
        >
          {toast.type === 'success' && <Check size={17} aria-hidden="true" />}
          {toast.message}
        </div>
      )}
    </div>
  );
}