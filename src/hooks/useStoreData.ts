import { useEffect, useState, useCallback } from 'react';
import { onSnapshot, setDoc } from 'firebase/firestore';
import { MENU_DOC_REF } from '../lib/firebase';
import type { ProductItem, StoreData } from '../types/bakery';

const DEFAULT_STORE_DATA: StoreData = {
  updatedAt: new Date().toISOString(),
  notice: '',
  items: [],
};

export function useStoreData() {
  const [storeData, setStoreData] = useState<StoreData>(DEFAULT_STORE_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const subscribe = () => {
      if (unsubscribe) return;
      unsubscribe = onSnapshot(
        MENU_DOC_REF,
        (snapshot) => {
          if (snapshot.exists()) {
            setStoreData(snapshot.data() as StoreData);
          } else {
            setStoreData(DEFAULT_STORE_DATA);
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Firestore 구독 오류:', err);
          setError('재고 정보를 불러오지 못했습니다.');
          setLoading(false);
        }
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
      } else {
        subscribe();
      }
    };

    subscribe();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (unsubscribe) unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 전체 문서 저장 (낙관적 업데이트 포함)
  const saveStoreData = useCallback(async (nextData: Omit<StoreData, 'updatedAt'>) => {
    const payload: StoreData = {
      ...nextData,
      updatedAt: new Date().toISOString(),
    };
    setStoreData(payload);
    await setDoc(MENU_DOC_REF, payload);
  }, []);

  // 어드민용: 특정 상품 수량 증감 (-1, +1, +5 등) 또는 품절(0) 처리
  const updateStock = useCallback(
    async (id: string, delta: number, absoluteValue?: number) => {
      const nextItems = storeData.items.map((item) => {
        if (item.id !== id) return item;
        const nextStock =
          absoluteValue !== undefined ? absoluteValue : Math.max(0, item.stock + delta);
        return { ...item, stock: nextStock };
      });
      await saveStoreData({ ...storeData, items: nextItems });
    },
    [storeData, saveStoreData]
  );

  // 어드민용: 공지사항 수정
  const updateNotice = useCallback(
    async (notice: string) => {
      await saveStoreData({ ...storeData, notice });
    },
    [storeData, saveStoreData]
  );

  // 어드민용: 상품 목록 전체 갱신 (신규 추가, 수정, 숨김, 삭제 시 사용)
  const updateItems = useCallback(
    async (items: ProductItem[]) => {
      await saveStoreData({ ...storeData, items });
    },
    [storeData, saveStoreData]
  );

  return {
    storeData,
    loading,
    error,
    updateStock,
    updateNotice,
    updateItems,
  };
}