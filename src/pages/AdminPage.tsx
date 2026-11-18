import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useStoreData } from '../hooks/useStoreData';
import { uploadProductImage } from '../lib/imageUpload';
import type { ProductItem } from '../types/bakery';

export default function AdminPage() {
  const [user, setUser] = useState(auth.currentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'stock' | 'menu'>('stock');
  const { storeData, updateStock, updateNotice, updateItems } = useStoreData();
  const [isSavingNotice, setIsSavingNotice] = useState(false);
  const [noticeSaveError, setNoticeSaveError] = useState('');
  const [isMenuFormOpen, setIsMenuFormOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [menuError, setMenuError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      alert('로그인 실패. 이메일과 비밀번호를 확인해주세요.');
    }
  };

  const handleLogout = () => signOut(auth);

  const handleNoticeSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const notice = new FormData(e.currentTarget).get('notice');
    if (typeof notice !== 'string') return;

    setIsSavingNotice(true);
    setNoticeSaveError('');
    try {
      await updateNotice(notice);
    } catch {
      setNoticeSaveError('공지사항을 저장하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setIsSavingNotice(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name');
    const priceValue = formData.get('price');
    const stockValue = formData.get('stock');
    const image = formData.get('image');

    if (
      typeof name !== 'string' ||
      !name.trim() ||
      typeof priceValue !== 'string' ||
      typeof stockValue !== 'string' ||
      !(image instanceof File) ||
      image.size === 0
    ) {
      return;
    }

    setMenuError('');
    try {
      setIsUploadingImage(true);
      const imageUrl = await uploadProductImage(image);
      setIsUploadingImage(false);
      setIsSavingMenu(true);

      const newItem: ProductItem = {
        id: `item_${crypto.randomUUID()}`,
        category: '빵',
        name: name.trim(),
        price: Number(priceValue),
        stock: Number(stockValue),
        isSoldOut: false,
        imageUrl,
        isVisible: true,
        order: storeData.items.reduce((maxOrder, item) => Math.max(maxOrder, item.order), -1) + 1,
      };

      await updateItems([...storeData.items, newItem]);
      form.reset();
      setIsMenuFormOpen(false);
    } catch {
      setMenuError('메뉴를 등록하지 못했습니다. 입력값과 업로드 설정을 확인해주세요.');
    } finally {
      setIsUploadingImage(false);
      setIsSavingMenu(false);
    }
  };

  const handleVisibilityToggle = async (itemId: string) => {
    const updatedItems = storeData.items.map((item) =>
      item.id === itemId ? { ...item, isVisible: !item.isVisible } : item
    );

    setMenuError('');
    try {
      await updateItems(updatedItems);
    } catch {
      setMenuError('판매 상태를 변경하지 못했습니다. 다시 시도해주세요.');
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white min-h-screen flex flex-col justify-center">
        <h1 className="text-2xl font-bold mb-6 text-center">사장님 로그인</h1>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input 
            type="email" placeholder="이메일" value={email} onChange={(e) => setEmail(e.target.value)}
            className="border p-3 rounded" required 
          />
          <input 
            type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)}
            className="border p-3 rounded" required 
          />
          <button type="submit" className="bg-blue-600 text-white p-3 rounded font-bold">로그인</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen shadow-sm pb-20">
      <header className="p-4 border-b flex justify-between items-center bg-gray-50">
        <h1 className="font-bold text-lg">매장 관리</h1>
        <button onClick={handleLogout} className="text-sm text-gray-500 underline">로그아웃</button>
      </header>

      {/* 탭 네비게이션 */}
      <div className="flex border-b">
        <button 
          className={`flex-1 p-3 text-center ${activeTab === 'stock' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-500'}`}
          onClick={() => setActiveTab('stock')}
        >
          재고 조절
        </button>
        <button 
          className={`flex-1 p-3 text-center ${activeTab === 'menu' ? 'border-b-2 border-blue-600 font-bold' : 'text-gray-500'}`}
          onClick={() => setActiveTab('menu')}
        >
          메뉴 관리
        </button>
      </div>

      <main className="p-4">
        {activeTab === 'stock' ? (
          <div className="space-y-6">
            <form onSubmit={handleNoticeSave} className="space-y-2">
              <label htmlFor="store-notice" className="block text-sm font-bold text-gray-800">
                상단 공지사항
              </label>
              <div className="flex gap-2">
                <input
                  key={storeData.notice}
                  id="store-notice"
                  name="notice"
                  type="text"
                  defaultValue={storeData.notice}
                  onChange={() => setNoticeSaveError('')}
                  placeholder="고객에게 보여줄 공지를 입력하세요"
                  className="min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isSavingNotice}
                  className="min-h-12 rounded bg-blue-600 px-4 font-bold text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {isSavingNotice ? '저장 중' : '저장'}
                </button>
              </div>
              {noticeSaveError && (
                <p role="alert" className="text-sm text-red-600">{noticeSaveError}</p>
              )}
            </form>

            <section aria-labelledby="stock-list-heading" className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 id="stock-list-heading" className="font-bold text-gray-900">오늘의 재고</h2>
                <span className="text-xs text-gray-500">{storeData.items.length}개 상품</span>
              </div>

              {storeData.items.length === 0 ? (
                <p className="rounded border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  등록된 상품이 없습니다.
                </p>
              ) : (
                <ul className="space-y-3">
                  {storeData.items.map((item) => {
                    const isSoldOut = item.stock === 0;

                    return (
                      <li
                        key={item.id}
                        className={`rounded border p-3 ${isSoldOut ? 'border-red-200 bg-red-50/60' : 'border-gray-200 bg-white'}`}
                      >
                        <div className="mb-3 flex items-center gap-3">
                          <img
                            src={item.imageUrl}
                            alt=""
                            className={`h-14 w-14 shrink-0 rounded object-cover ${isSoldOut ? 'opacity-50 grayscale' : ''}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className={`font-semibold ${isSoldOut ? 'text-gray-500' : 'text-gray-900'}`}>
                                {item.name}
                              </h3>
                              {!item.isVisible && (
                                <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                                  고객 화면 숨김
                                </span>
                              )}
                              {isSoldOut && (
                                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                                  품절
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-gray-600">
                              {item.price.toLocaleString('ko-KR')}원 · 남은 수량 {item.stock}개
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={() => updateStock(item.id, -1)}
                            className="min-h-12 rounded border border-gray-300 bg-white px-1 text-sm font-bold text-gray-800 active:bg-gray-100"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStock(item.id, 1)}
                            className="min-h-12 rounded bg-blue-600 px-1 text-sm font-bold text-white active:bg-blue-700"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStock(item.id, 5)}
                            className="min-h-12 rounded bg-blue-700 px-1 text-sm font-bold text-white active:bg-blue-800"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStock(item.id, 0, 0)}
                            className="min-h-12 rounded bg-red-600 px-1 text-xs font-bold text-white active:bg-red-700"
                          >
                            품절(0)
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-5">
            <button
              type="button"
              aria-expanded={isMenuFormOpen}
              aria-controls="new-menu-form"
              onClick={() => {
                setIsMenuFormOpen((isOpen) => !isOpen);
                setMenuError('');
              }}
              className="min-h-12 w-full rounded bg-blue-600 px-4 font-bold text-white active:bg-blue-700"
            >
              {isMenuFormOpen ? '등록 취소' : '+ 새 빵 등록'}
            </button>

            {isMenuFormOpen && (
              <form
                id="new-menu-form"
                onSubmit={handleCreateItem}
                className="space-y-4 rounded border border-gray-200 bg-gray-50 p-4"
              >
                <div>
                  <label htmlFor="new-item-name" className="mb-1 block text-sm font-semibold text-gray-800">
                    이름
                  </label>
                  <input
                    id="new-item-name"
                    name="name"
                    type="text"
                    required
                    maxLength={60}
                    className="min-h-12 w-full rounded border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="new-item-price" className="mb-1 block text-sm font-semibold text-gray-800">
                      가격 (원)
                    </label>
                    <input
                      id="new-item-price"
                      name="price"
                      type="number"
                      min="0"
                      step="1"
                      required
                      className="min-h-12 w-full rounded border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-item-stock" className="mb-1 block text-sm font-semibold text-gray-800">
                      초기 수량
                    </label>
                    <input
                      id="new-item-stock"
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue="0"
                      required
                      className="min-h-12 w-full rounded border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="new-item-image" className="mb-1 block text-sm font-semibold text-gray-800">
                    사진
                  </label>
                  <input
                    id="new-item-image"
                    name="image"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    required
                    className="min-h-12 w-full rounded border border-gray-300 bg-white p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-2"
                  />
                </div>

                {isUploadingImage && (
                  <p role="status" className="text-sm font-medium text-blue-700">
                    사진 압축 및 업로드 중...
                  </p>
                )}
                {menuError && <p role="alert" className="text-sm text-red-600">{menuError}</p>}

                <button
                  type="submit"
                  disabled={isUploadingImage || isSavingMenu}
                  className="min-h-12 w-full rounded bg-emerald-700 px-4 font-bold text-white disabled:cursor-wait disabled:opacity-60"
                >
                  {isUploadingImage ? '사진 압축 및 업로드 중...' : isSavingMenu ? '메뉴 등록 중...' : '등록하기'}
                </button>
              </form>
            )}

            <section aria-labelledby="menu-list-heading" className="space-y-3">
              <div className="flex items-baseline justify-between">
                <h2 id="menu-list-heading" className="font-bold text-gray-900">전체 메뉴</h2>
                <span className="text-xs text-gray-500">{storeData.items.length}개</span>
              </div>

              {storeData.items.length === 0 ? (
                <p className="rounded border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500">
                  등록된 메뉴가 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {storeData.items.map((item) => (
                    <li
                      key={item.id}
                      className={`flex items-center gap-3 rounded border p-3 ${item.isVisible ? 'border-gray-200 bg-white' : 'border-gray-200 bg-gray-50'}`}
                    >
                      <img
                        src={item.imageUrl}
                        alt=""
                        className={`h-16 w-16 shrink-0 rounded object-cover ${item.isVisible ? '' : 'opacity-50 grayscale'}`}
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className={`truncate font-semibold ${item.isVisible ? 'text-gray-900' : 'text-gray-500'}`}>
                          {item.name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {item.category} · {item.price.toLocaleString('ko-KR')}원 · 재고 {item.stock}개
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-center gap-1">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={item.isVisible}
                          aria-label={`${item.name} 판매 상태`}
                          onClick={() => handleVisibilityToggle(item.id)}
                          className={`relative h-7 w-12 rounded-full transition-colors ${item.isVisible ? 'bg-emerald-600' : 'bg-gray-300'}`}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${item.isVisible ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                        <span className={`text-xs font-medium ${item.isVisible ? 'text-emerald-700' : 'text-gray-500'}`}>
                          {item.isVisible ? '판매 중' : '숨김'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}