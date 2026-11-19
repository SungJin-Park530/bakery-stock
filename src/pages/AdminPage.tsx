import { useEffect, useRef, useState, type FormEvent } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Check, Eye, EyeOff, LoaderCircle, Menu, Save, Search, Trash2, X } from 'lucide-react';
import { STORE_CONFIG } from '../config/storeConfig';
import defaultProductImage from '../assets/defaultimg.webp';
import { auth } from '../lib/firebaseAuth';
import { useStoreData } from '../hooks/useStoreData';
import type { ProductItem, StoreData } from '../types/bakery';

type AdminTab = 'stock' | 'notice' | 'register';
type ToastState = { message: string; type: 'success' | 'error' } | null;
type ProductFormValues = Omit<ProductItem, 'id' | 'imageUrl' | 'order'>;

const NEW_CATEGORY_OPTION = '__new_category__';
const DRAFT_MODE_STORAGE_KEY = 'bakery-stock-admin-draft-mode';

function createProductId() {
  return `item_${crypto.randomUUID()}`;
}

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
      !Number.isSafeInteger(numericStock) || numericStock < 0
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

      <div>
        <label htmlFor={`${idPrefix}-image`} className="mb-1 block text-sm font-semibold text-stone-800">
          사진 {initialItem ? '(선택)' : ''}
        </label>
        <input
          id={`${idPrefix}-image`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="min-h-12 w-full rounded-lg border border-border-subtle bg-surface-card p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-brand-primary focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
        />
        <img
          src={previewUrl || defaultProductImage}
          alt="상품 사진 미리보기"
          className="mt-3 h-40 w-full rounded-lg bg-surface-muted object-cover"
        />
        {selectedFile && <p className="mt-1 truncate text-xs text-stone-500">{selectedFile.name} · 저장 시 업로드</p>}
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDraftMode, setIsDraftMode] = useState(() => {
    try {
      return window.localStorage.getItem(DRAFT_MODE_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const [selectedStockCategory, setSelectedStockCategory] = useState('전체');
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [registerFormVersion, setRegisterFormVersion] = useState(0);
  const [isEditingNotice, setIsEditingNotice] = useState(false);
  const [noticeDraft, setNoticeDraft] = useState('');
  const [closedTitleDraft, setClosedTitleDraft] = useState('');
  const [kakaoChatUrlDraft, setKakaoChatUrlDraft] = useState('');
  const [orderGuideTextDraft, setOrderGuideTextDraft] = useState('');
  const [toast, setToast] = useState<ToastState>(null);
  const previewUrlsRef = useRef<Record<string, string>>({});
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuPopupRef = useRef<HTMLElement>(null);
  const immediateMutationPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const {
    draftData,
    hasChanges,
    hasServerUpdate,
    isSaving,
    updateDraftStock,
    toggleDraftSoldOut,
    updateDraftSettings,
    updateDraftItem,
    removeDraftItem,
    saveChanges,
    updateStoreImmediately,
    discardChanges,
    loadLatestServerData,
  } = useStoreData();
  const isOpen = draftData.isOpen !== false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuButtonRef.current?.contains(target) || menuPopupRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

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
    updateDraftSettings({
      notice: noticeDraft,
      closedTitle: closedTitleDraft,
      kakaoChatUrl: kakaoChatUrlDraft.trim(),
      orderGuideText: orderGuideTextDraft,
    });
    setIsEditingNotice(false);
    setToast({ message: '공지사항을 초안에 반영했습니다.', type: 'success' });
  };

  const handleNoticeEdit = () => {
    setNoticeDraft(draftData.notice);
    setClosedTitleDraft(draftData.closedTitle);
    setKakaoChatUrlDraft(draftData.kakaoChatUrl);
    setOrderGuideTextDraft(draftData.orderGuideText);
    setIsEditingNotice(true);
  };

  const handleNoticeCancel = () => {
    setNoticeDraft(draftData.notice);
    setClosedTitleDraft(draftData.closedTitle);
    setKakaoChatUrlDraft(draftData.kakaoChatUrl);
    setOrderGuideTextDraft(draftData.orderGuideText);
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
      return true;
    } catch {
      setToast({ message: '저장에 실패했습니다. 네트워크와 이미지 업로드 설정을 확인해주세요.', type: 'error' });
      return false;
    }
  };

  const runImmediateMutation = (
    update: (current: StoreData, uploadedImageUrls: Map<string, string>) => StoreData,
    imageFiles: Record<string, File> = {}
  ) => {
    const operation = immediateMutationPromiseRef.current.then(async () => {
      try {
        await updateStoreImmediately(update, imageFiles);
        return true;
      } catch {
        setToast({ message: '변경사항을 저장하지 못했습니다. 네트워크 연결을 확인하고 다시 시도해주세요.', type: 'error' });
        return false;
      }
    });
    immediateMutationPromiseRef.current = operation.then(() => undefined);
    return operation;
  };

  const handleDraftModeToggle = async () => {
    const persistMode = (enabled: boolean) => {
      try {
        window.localStorage.setItem(DRAFT_MODE_STORAGE_KEY, String(enabled));
      } catch {
        setToast({ message: '초안 모드 설정을 이 기기에 저장하지 못했습니다.', type: 'error' });
      }
      setIsDraftMode(enabled);
    };

    if (!isDraftMode) {
      persistMode(true);
      return;
    }
    if (hasChanges) {
      if (!window.confirm('초안 변경사항을 저장한 뒤 즉시 저장 모드로 전환할까요?')) return;
      if (!await handleSaveChanges()) return;
    }
    persistMode(false);
  };

  const handleStockChange = (itemId: string, stock: number) => {
    if (isDraftMode) {
      updateDraftStock(itemId, stock);
      return;
    }
    void runImmediateMutation((current) => ({
      ...current,
      items: current.items.map((item) => item.id === itemId ? { ...item, stock: Math.max(0, stock) } : item),
    }));
  };

  const handleBusinessStatusToggle = () => {
    const nextIsOpen = !isOpen;
    const prompt = nextIsOpen
      ? '매장을 영업 중으로 변경할까요?'
      : '매장을 영업 종료·휴무 상태로 변경할까요?';
    if (!window.confirm(prompt)) return;

    void runImmediateMutation((current) => ({
      ...current,
      isOpen: nextIsOpen,
    }));
  };

  const releasePreviewUrl = (itemId: string) => {
    const previewUrl = previewUrlsRef.current[itemId];
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl);
    delete previewUrlsRef.current[itemId];
  };

  const handleDiscardChanges = () => {
    if (!window.confirm('저장하지 않은 변경사항을 모두 버릴까요?')) return;
    discardChanges();
    Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = {};
    setSelectedItemId(null);
    setRegisterFormVersion((version) => version + 1);
    setNoticeDraft(draftData.notice);
    setClosedTitleDraft(draftData.closedTitle);
    setKakaoChatUrlDraft(draftData.kakaoChatUrl);
    setOrderGuideTextDraft(draftData.orderGuideText);
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
    setClosedTitleDraft(draftData.closedTitle);
    setKakaoChatUrlDraft(draftData.kakaoChatUrl);
    setOrderGuideTextDraft(draftData.orderGuideText);
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
    const itemId = createProductId();
    const newItem: ProductItem = {
      ...values,
      id: itemId,
      imageUrl: previewUrl ?? '',
      order: draftData.items.reduce((maxOrder, item) => Math.max(maxOrder, item.order), -1) + 1,
    };
    if (isDraftMode) {
      updateDraftItem(newItem, imageFile);
      keepPreviewUrl(itemId, previewUrl);
      setRegisterFormVersion((version) => version + 1);
      setActiveTab('stock');
      setToast({
        message: '초안에 새 상품이 추가되었습니다. 하단 저장 버튼을 눌러 반영하세요.',
        type: 'success',
      });
      return;
    }

    keepPreviewUrl(itemId, previewUrl);
    void runImmediateMutation((current, uploadedImageUrls) => ({
      ...current,
      items: [...current.items, {
        ...newItem,
        imageUrl: uploadedImageUrls.get(itemId) ?? newItem.imageUrl,
      }],
    }), imageFile ? { [itemId]: imageFile } : {}).then((saved) => {
      if (!saved) return;
      releasePreviewUrl(itemId);
      setRegisterFormVersion((version) => version + 1);
      setActiveTab('stock');
    });
  };

  const handleEditProduct = (
    item: ProductItem,
    values: ProductFormValues,
    imageFile?: File,
    previewUrl?: string
  ) => {
    const updatedItem = { ...item, ...values, imageUrl: previewUrl ?? item.imageUrl };
    if (isDraftMode) {
      updateDraftItem(updatedItem, imageFile);
      keepPreviewUrl(item.id, previewUrl);
      setSelectedItemId(null);
      setToast({ message: '상품 정보를 초안에 반영했습니다.', type: 'success' });
      return;
    }

    keepPreviewUrl(item.id, previewUrl);
    void runImmediateMutation((current, uploadedImageUrls) => ({
      ...current,
      items: current.items.map((currentItem) => currentItem.id === item.id
        ? { ...updatedItem, imageUrl: uploadedImageUrls.get(item.id) ?? updatedItem.imageUrl }
        : currentItem),
    }), imageFile ? { [item.id]: imageFile } : {}).then((saved) => {
      if (!saved) return;
      releasePreviewUrl(item.id);
      setSelectedItemId(null);
    });
  };

  const handleDeleteProduct = (item: ProductItem) => {
    if (!window.confirm(`'${item.name}' 상품을 초안에서 삭제할까요?`)) return;
    if (isDraftMode) {
      removeDraftItem(item.id);
      releasePreviewUrl(item.id);
      setSelectedItemId(null);
      setToast({ message: '상품을 초안에서 삭제했습니다.', type: 'success' });
      return;
    }

    void runImmediateMutation((current) => ({
      ...current,
      items: current.items.filter((currentItem) => currentItem.id !== item.id),
    })).then((saved) => {
      if (!saved) return;
      releasePreviewUrl(item.id);
      setSelectedItemId(null);
    });
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
      <div className="sticky top-0 z-40 shadow-sm">
        <header className="relative flex h-16 items-center justify-between bg-brand-primary px-4 text-white">
          <div className="flex min-w-0 items-center gap-2.5">
            <h1 className="truncate text-xl font-bold">{STORE_CONFIG.adminTitle}</h1>
            <span
              aria-label={isOpen ? '현재 매장 영업 중' : '현재 영업 종료·휴무'}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-2 py-1 text-[11px] font-semibold ${isOpen ? 'text-emerald-100' : 'text-white/70'}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-stone-400'}`} />
              {isOpen ? '영업 중' : '휴무'}
            </span>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={isMenuOpen ? '관리 메뉴 닫기' : '관리 메뉴 열기'}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
            className="grid h-11 w-11 place-items-center rounded-lg border border-white/25 text-2xl leading-none text-white"
          >
            {isMenuOpen ? <X size={21} aria-hidden="true" /> : <Menu size={23} aria-hidden="true" />}
          </button>
          {isMenuOpen && (
            <section
              ref={menuPopupRef}
              className="absolute right-3 top-[calc(100%-0.25rem)] z-50 w-72 rounded-xl border border-border-subtle bg-surface-card p-3 text-stone-800 shadow-xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-2 py-3">
                <span className="text-sm font-semibold">{isOpen ? '현재 매장 영업 중' : '현재 영업 종료·휴무'}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isOpen}
                  aria-label="매장 영업 상태"
                  onClick={handleBusinessStatusToggle}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ${isOpen ? 'bg-brand-primary' : 'bg-stone-300'}`}
                >
                  <span className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-2 py-3">
                <span className="text-sm font-semibold">초안 모드</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isDraftMode}
                  aria-label="초안 모드"
                  onClick={() => void handleDraftModeToggle()}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ${isDraftMode ? 'bg-brand-primary' : 'bg-stone-300'}`}
                >
                  <span className={`absolute left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${isDraftMode ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-11 w-full px-2 text-left text-sm font-semibold text-status-danger"
              >
                로그아웃
              </button>
            </section>
          )}
        </header>
        <nav aria-label="관리 메뉴" className="flex h-12 border-b border-border-subtle bg-surface-card text-stone-600">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              aria-current={activeTab === tab.id ? 'page' : undefined}
              onClick={() => setActiveTab(tab.id)}
                className={`h-12 flex-1 border-b-2 px-2 text-sm ${
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
            <div className="sticky top-28 z-20 -mx-4 space-y-3 bg-surface-page px-4 pb-3 pt-4">
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
            </div>

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
                          src={item.imageUrl || defaultProductImage}
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
                          onClick={() => {
                            if (isDraftMode) {
                              updateDraftItem({ ...item, isVisible: !item.isVisible });
                              return;
                            }
                            void runImmediateMutation((current) => ({
                              ...current,
                              items: current.items.map((currentItem) => currentItem.id === item.id
                                ? { ...currentItem, isVisible: !currentItem.isVisible }
                                : currentItem),
                            }));
                          }}
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg border ${item.isVisible ? 'border-border-subtle text-stone-500' : 'border-stone-400 bg-stone-100 text-stone-700'}`}
                        >
                          {item.isVisible ? <Eye size={19} aria-hidden="true" /> : <EyeOff size={19} aria-hidden="true" />}
                        </button>
                      </div>

                      {item.isVisible && <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-muted p-2">
                        <button
                          type="button"
                          aria-label={`${item.name} 수량 1 감소`}
                          onClick={() => void handleStockChange(item.id, Math.max(0, item.stock - 1))}
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
                              void handleStockChange(item.id, Number.isNaN(parsedStock) ? 0 : Math.max(0, parsedStock));
                            }}
                            className="min-w-0 w-full bg-transparent text-center text-lg font-bold outline-none focus:text-brand-primary"
                          />
                          <span className="shrink-0 text-lg font-bold text-stone-800">개</span>
                        </label>
                        <button
                          type="button"
                          aria-label={`${item.name} 수량 1 증가`}
                          onClick={() => void handleStockChange(item.id, item.stock + 1)}
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
                            onClick={() => {
                              if (isDraftMode) {
                                toggleDraftSoldOut(item.id);
                                return;
                              }
                              void runImmediateMutation((current) => ({
                                ...current,
                                items: current.items.map((currentItem) => currentItem.id === item.id
                                  ? { ...currentItem, isSoldOut: !currentItem.isSoldOut }
                                  : currentItem),
                              }));
                            }}
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
                <div>
                  <label htmlFor="closed-title-draft" className="mb-1 block text-sm font-semibold text-stone-800">
                    휴무 안내 문구
                  </label>
                  <textarea
                    id="closed-title-draft"
                    value={closedTitleDraft}
                    onChange={(event) => setClosedTitleDraft(event.target.value)}
                    rows={3}
                    maxLength={500}
                    className="min-h-24 w-full resize-y rounded-xl border border-border-subtle bg-surface-card p-3 text-sm leading-6 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    placeholder="비워두면 기본 휴무 안내 문구를 표시합니다."
                  />
                </div>
                <div>
                  <label htmlFor="kakao-chat-url-draft" className="mb-1 block text-sm font-semibold text-stone-800">
                    카카오톡 채팅방 링크
                  </label>
                  <input
                    id="kakao-chat-url-draft"
                    type="url"
                    value={kakaoChatUrlDraft}
                    onChange={(event) => setKakaoChatUrlDraft(event.target.value)}
                    className="min-h-12 w-full rounded-lg border border-border-subtle bg-surface-card px-3 text-sm text-stone-900 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    placeholder="https://pf.kakao.com/_채널ID/chat"
                  />
                </div>
                <div>
                  <label htmlFor="order-guide-draft" className="mb-1 block text-sm font-semibold text-stone-800">
                    주문 양식 안내
                  </label>
                  <textarea
                    id="order-guide-draft"
                    value={orderGuideTextDraft}
                    onChange={(event) => setOrderGuideTextDraft(event.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="min-h-28 w-full resize-y rounded-xl border border-border-subtle bg-surface-card p-3 text-sm leading-6 focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    placeholder="예) 성함 / 빵 종류 및 수량 / 픽업 예정 시간"
                  />
                </div>
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
                    저장하기
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="min-h-32 whitespace-pre-wrap break-words rounded-xl border border-border-subtle bg-surface-card p-4 text-sm leading-6 text-stone-800">
                  {draftData.notice || '등록된 공지사항이 없습니다.'}
                </div>
                <dl className="space-y-3 rounded-xl border border-border-subtle bg-surface-card p-4">
                  <div>
                    <dt className="mb-1 text-xs font-semibold text-stone-500">휴무 안내 문구</dt>
                    <dd className="min-h-10 whitespace-pre-line rounded-lg bg-surface-muted px-3 py-2 text-sm text-stone-800">
                      {draftData.closedTitle || '현재 영업 준비 중이거나 휴무일입니다.'}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-xs font-semibold text-stone-500">카카오톡 채팅방 링크</dt>
                    <dd className="min-h-10 break-all rounded-lg bg-surface-muted px-3 py-2 text-sm text-stone-800">
                      {draftData.kakaoChatUrl || '설정되지 않음'}
                    </dd>
                  </div>
                  <div>
                    <dt className="mb-1 text-xs font-semibold text-stone-500">주문 양식 안내</dt>
                    <dd className="min-h-10 whitespace-pre-line rounded-lg bg-surface-muted px-3 py-2 text-sm text-stone-800">
                      {draftData.orderGuideText || '설정되지 않음'}
                    </dd>
                  </div>
                </dl>
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
            </div>
            <ProductDraftForm
              key={registerFormVersion}
              categories={draftCategories}
              submitLabel="새 빵 등록"
              submitFormId="register-product-form"
              onSubmit={handleRegisterProduct}
            />
          </section>
        ) : null}
      </main>

      {editingItem && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/50"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedItemId(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-product-heading"
            className="flex h-[80dvh] max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-xl"
          >
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-3">
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
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <ProductDraftForm
                key={editingItem.id}
                categories={draftCategories}
                initialItem={editingItem}
                submitLabel="저장하기"
                onSubmit={(values, imageFile, previewUrl) =>
                  handleEditProduct(editingItem, values, imageFile, previewUrl)
                }
                onCancel={() => setSelectedItemId(null)}
                onDelete={() => handleDeleteProduct(editingItem)}
              />
            </div>
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
                새 빵 등록
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