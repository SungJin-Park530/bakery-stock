import { useEffect, useState, useCallback, useRef } from 'react';
import { onSnapshot, setDoc } from 'firebase/firestore';
import { MENU_DOC_REF } from '../lib/firebase';
import type { ProductItem, StoreData } from '../types/bakery';
import { uploadProductImage } from '../lib/imageUpload';

function createDefaultStoreData(): StoreData {
  return {
    updatedAt: new Date().toISOString(),
    notice: '',
    items: [],
  };
}

function normalizeStoreData(data: StoreData): StoreData {
  return {
    ...data,
    items: data.items.map((item) => ({
      ...item,
      isSoldOut: item.isSoldOut ?? false,
    })),
  };
}

function hasSameEditableData(left: StoreData, right: StoreData) {
  return (
    left.notice === right.notice &&
    JSON.stringify(left.categories ?? []) === JSON.stringify(right.categories ?? []) &&
    JSON.stringify(left.items) === JSON.stringify(right.items)
  );
}

export function useStoreData() {
  const [serverData, setServerData] = useState<StoreData>(createDefaultStoreData);
  const [draftData, setDraftData] = useState<StoreData>(serverData);
  const [hasChanges, setHasChanges] = useState(false);
  const [pendingImages, setPendingImages] = useState<Record<string, File>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serverDataRef = useRef(serverData);
  const draftDataRef = useRef(draftData);
  const pendingImagesRef = useRef(pendingImages);
  const hasChangesRef = useRef(false);
  const draftRevisionRef = useRef(0);
  const isSavingRef = useRef(false);

  const commitDraft = useCallback((nextDraft: StoreData, nextPendingImages = pendingImagesRef.current) => {
    draftDataRef.current = nextDraft;
    pendingImagesRef.current = nextPendingImages;
    setDraftData(nextDraft);
    setPendingImages(nextPendingImages);
    draftRevisionRef.current += 1;

    const changed =
      Object.keys(nextPendingImages).length > 0 ||
      !hasSameEditableData(serverDataRef.current, nextDraft);
    hasChangesRef.current = changed;
    setHasChanges(changed);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const subscribe = () => {
      if (unsubscribe) return;
      unsubscribe = onSnapshot(
        MENU_DOC_REF,
        (snapshot) => {
          const nextServerData = snapshot.exists()
            ? normalizeStoreData(snapshot.data() as StoreData)
            : createDefaultStoreData();

          serverDataRef.current = nextServerData;
          setServerData(nextServerData);

          if (!hasChangesRef.current) {
            draftDataRef.current = nextServerData;
            setDraftData(nextServerData);
          } else {
            const changed =
              Object.keys(pendingImagesRef.current).length > 0 ||
              !hasSameEditableData(nextServerData, draftDataRef.current);
            hasChangesRef.current = changed;
            setHasChanges(changed);
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

  const updateDraftStock = useCallback((id: string, newStock: number) => {
    const nextDraft = {
      ...draftDataRef.current,
      items: draftDataRef.current.items.map((item) =>
        item.id === id ? { ...item, stock: Math.max(0, newStock) } : item
      ),
    };
    commitDraft(nextDraft);
  }, [commitDraft]);

  const toggleDraftSoldOut = useCallback((id: string) => {
    const nextDraft = {
      ...draftDataRef.current,
      items: draftDataRef.current.items.map((item) =>
        item.id === id ? { ...item, isSoldOut: !item.isSoldOut } : item
      ),
    };
    commitDraft(nextDraft);
  }, [commitDraft]);

  const updateDraftNotice = useCallback((notice: string) => {
    commitDraft({ ...draftDataRef.current, notice });
  }, [commitDraft]);

  const updateDraftItem = useCallback((item: ProductItem, imageFile?: File) => {
    const items = draftDataRef.current.items;
    const existingIndex = items.findIndex((currentItem) => currentItem.id === item.id);
    const nextItems = existingIndex === -1
      ? [...items, { ...item, isSoldOut: item.isSoldOut ?? false }]
      : items.map((currentItem) =>
          currentItem.id === item.id
            ? { ...item, isSoldOut: item.isSoldOut ?? false }
            : currentItem
        );
    const nextPendingImages = imageFile
      ? { ...pendingImagesRef.current, [item.id]: imageFile }
      : pendingImagesRef.current;

    commitDraft({ ...draftDataRef.current, items: nextItems }, nextPendingImages);
  }, [commitDraft]);

  const saveChanges = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    const draftSnapshot = draftDataRef.current;
    const pendingImagesSnapshot = pendingImagesRef.current;
    const revisionAtSave = draftRevisionRef.current;

    try {
      const uploadedImages = await Promise.all(
        Object.entries(pendingImagesSnapshot).map(async ([itemId, file]) => [
          itemId,
          await uploadProductImage(file),
        ] as const)
      );
      const uploadedImageUrls = new Map(uploadedImages);
      const payload: StoreData = {
        ...draftSnapshot,
        updatedAt: new Date().toISOString(),
        items: draftSnapshot.items.map((item) => {
          const imageUrl = uploadedImageUrls.get(item.id);
          return imageUrl ? { ...item, imageUrl } : item;
        }),
      };

      await setDoc(MENU_DOC_REF, payload);
      serverDataRef.current = payload;
      setServerData(payload);

      if (draftRevisionRef.current === revisionAtSave) {
        draftDataRef.current = payload;
        setDraftData(payload);
        pendingImagesRef.current = {};
        setPendingImages({});
      }

      const changed =
        Object.keys(pendingImagesRef.current).length > 0 ||
        !hasSameEditableData(payload, draftDataRef.current);
      hasChangesRef.current = changed;
      setHasChanges(changed);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, []);

  const discardChanges = useCallback(() => {
    const currentServerData = serverDataRef.current;
    draftDataRef.current = currentServerData;
    pendingImagesRef.current = {};
    hasChangesRef.current = false;
    draftRevisionRef.current += 1;
    setDraftData(currentServerData);
    setPendingImages({});
    setHasChanges(false);
  }, []);

  const updateStock = useCallback((id: string, delta: number, absoluteValue?: number) => {
    const currentStock = draftDataRef.current.items.find((item) => item.id === id)?.stock ?? 0;
    updateDraftStock(id, absoluteValue ?? currentStock + delta);
  }, [updateDraftStock]);

  const updateNotice = updateDraftNotice;
  const updateItems = useCallback((items: ProductItem[]) => {
    commitDraft({ ...draftDataRef.current, items });
  }, [commitDraft]);

  return {
    serverData,
    draftData,
    hasChanges,
    pendingImages,
    isSaving,
    loading,
    error,
    updateDraftStock,
    toggleDraftSoldOut,
    updateDraftNotice,
    updateDraftItem,
    saveChanges,
    discardChanges,
    storeData: draftData,
    updateStock,
    updateNotice,
    updateItems,
  };
}