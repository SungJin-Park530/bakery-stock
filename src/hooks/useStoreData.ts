import { useEffect, useState, useCallback, useRef } from 'react';
import { onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { db, MENU_DOC_REF } from '../lib/firebase';
import type { ProductItem, StoreData } from '../types/bakery';

function createDefaultStoreData(): StoreData {
  return {
    updatedAt: new Date().toISOString(),
    notice: '',
    closedTitle: '',
    kakaoChatUrl: '',
    orderGuideText: '',
    isOpen: true,
    items: [],
  };
}

function normalizeStoreData(data: StoreData): StoreData {
  return {
    ...data,
    isOpen: data.isOpen ?? true,
    closedTitle: data.closedTitle ?? '',
    kakaoChatUrl: data.kakaoChatUrl ?? '',
    orderGuideText: data.orderGuideText ?? '',
    items: data.items.map((item) => ({
      ...item,
      isSoldOut: item.isSoldOut ?? false,
    })),
  };
}

function hasSameEditableData(left: StoreData, right: StoreData) {
  return (
    left.notice === right.notice &&
    left.closedTitle === right.closedTitle &&
    left.kakaoChatUrl === right.kakaoChatUrl &&
    left.orderGuideText === right.orderGuideText &&
    (left.isOpen ?? true) === (right.isOpen ?? true) &&
    JSON.stringify(left.categories ?? []) === JSON.stringify(right.categories ?? []) &&
    JSON.stringify(left.items) === JSON.stringify(right.items)
  );
}

export function useStoreData() {
  const [serverData, setServerData] = useState<StoreData>(createDefaultStoreData);
  const [draftData, setDraftData] = useState<StoreData>(serverData);
  const [hasChanges, setHasChanges] = useState(false);
  const [hasServerUpdate, setHasServerUpdate] = useState(false);
  const [pendingImages, setPendingImages] = useState<Record<string, File>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const serverDataRef = useRef(serverData);
  const draftDataRef = useRef(draftData);
  const pendingImagesRef = useRef(pendingImages);
  const hasChangesRef = useRef(false);
  const hasServerUpdateRef = useRef(false);
  const draftRevisionRef = useRef(0);
  const isSavingRef = useRef(false);
  const lastImmediateWriteUpdatedAtRef = useRef<string | null>(null);

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
          const previousServerData = serverDataRef.current;
          const serverDataChanged =
            previousServerData.updatedAt !== nextServerData.updatedAt ||
            !hasSameEditableData(previousServerData, nextServerData);

          serverDataRef.current = nextServerData;
          setServerData(nextServerData);

          const isImmediateWrite = nextServerData.updatedAt === lastImmediateWriteUpdatedAtRef.current;
          if (isImmediateWrite) lastImmediateWriteUpdatedAtRef.current = null;

          if (!hasChangesRef.current) {
            draftDataRef.current = nextServerData;
            setDraftData(nextServerData);
          } else if (serverDataChanged && !isImmediateWrite) {
            hasServerUpdateRef.current = true;
            setHasServerUpdate(true);
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

  const updateDraftSettings = useCallback((settings: Partial<Pick<StoreData, 'notice' | 'closedTitle' | 'kakaoChatUrl' | 'orderGuideText'>>) => {
    commitDraft({ ...draftDataRef.current, ...settings });
  }, [commitDraft]);

  const toggleDraftOpen = useCallback(() => {
    commitDraft({
      ...draftDataRef.current,
      isOpen: !(draftDataRef.current.isOpen ?? true),
    });
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

  const removeDraftItem = useCallback((id: string) => {
    const nextPendingImages = { ...pendingImagesRef.current };
    delete nextPendingImages[id];
    commitDraft(
      {
        ...draftDataRef.current,
        items: draftDataRef.current.items.filter((item) => item.id !== id),
      },
      nextPendingImages
    );
  }, [commitDraft]);

  const saveChanges = useCallback(async () => {
    if (isSavingRef.current) return;

    isSavingRef.current = true;
    setIsSaving(true);
    const draftSnapshot = draftDataRef.current;
    const pendingImagesSnapshot = pendingImagesRef.current;
    const revisionAtSave = draftRevisionRef.current;

    try {
      const pendingImageEntries = Object.entries(pendingImagesSnapshot);
      const uploadedImages = pendingImageEntries.length > 0
        ? await (async () => {
            const { uploadProductImage } = await import('../lib/imageUpload');
            return Promise.all(
              pendingImageEntries.map(async ([itemId, file]) => [
                itemId,
                await uploadProductImage(file),
              ] as const)
            );
          })()
        : [];
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
      hasServerUpdateRef.current = false;
      setHasServerUpdate(false);

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

  const updateStoreImmediately = useCallback(async (
    update: (current: StoreData, uploadedImageUrls: Map<string, string>) => StoreData,
    imageFiles: Record<string, File> = {}
  ) => {
    if (isSavingRef.current) throw new Error('다른 저장 작업이 진행 중입니다.');

    isSavingRef.current = true;
    setIsSaving(true);
    const previousServerData = serverDataRef.current;
    try {
      const uploadedImages = await Promise.all(
        Object.entries(imageFiles).map(async ([itemId, file]) => {
          const { uploadProductImage } = await import('../lib/imageUpload');
          return [itemId, await uploadProductImage(file)] as const;
        })
      );
      const uploadedImageUrls = new Map(uploadedImages);
      let serverChangedDuringMutation = false;
      const payload = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(MENU_DOC_REF);
        const currentData = snapshot.exists()
          ? normalizeStoreData(snapshot.data() as StoreData)
          : createDefaultStoreData();
        serverChangedDuringMutation ||= currentData.updatedAt !== previousServerData.updatedAt;
        const nextData = update(currentData, uploadedImageUrls);
        const previousTimestamp = Date.parse(currentData.updatedAt);
        const updatedAt = new Date(Math.max(
          Date.now(),
          Number.isNaN(previousTimestamp) ? 0 : previousTimestamp + 1
        )).toISOString();
        const nextPayload = normalizeStoreData({
          ...nextData,
          updatedAt,
        });
        lastImmediateWriteUpdatedAtRef.current = nextPayload.updatedAt;
        transaction.set(MENU_DOC_REF, nextPayload);
        return nextPayload;
      });

      const currentDraftData = draftDataRef.current;
      const hasDraftEdits = hasChangesRef.current;
      const nextDraftData = hasDraftEdits
        ? {
            ...payload,
            ...(currentDraftData.notice !== previousServerData.notice ? { notice: currentDraftData.notice } : {}),
            ...(currentDraftData.closedTitle !== previousServerData.closedTitle ? { closedTitle: currentDraftData.closedTitle } : {}),
            ...(currentDraftData.kakaoChatUrl !== previousServerData.kakaoChatUrl ? { kakaoChatUrl: currentDraftData.kakaoChatUrl } : {}),
            ...(currentDraftData.orderGuideText !== previousServerData.orderGuideText ? { orderGuideText: currentDraftData.orderGuideText } : {}),
            ...((currentDraftData.isOpen ?? true) !== (previousServerData.isOpen ?? true) ? { isOpen: currentDraftData.isOpen } : {}),
            ...(JSON.stringify(currentDraftData.categories ?? []) !== JSON.stringify(previousServerData.categories ?? [])
              ? { categories: currentDraftData.categories }
              : {}),
            ...(JSON.stringify(currentDraftData.items) !== JSON.stringify(previousServerData.items)
              ? { items: currentDraftData.items }
              : {}),
          }
        : payload;

      serverDataRef.current = payload;
      draftDataRef.current = nextDraftData;
      const changed = Object.keys(pendingImagesRef.current).length > 0 || !hasSameEditableData(payload, nextDraftData);
      hasChangesRef.current = changed;
      setHasChanges(changed);
      const hasServerUpdate = changed && (hasServerUpdateRef.current || serverChangedDuringMutation);
      hasServerUpdateRef.current = hasServerUpdate;
      setServerData(payload);
      setDraftData(nextDraftData);
      setHasServerUpdate(hasServerUpdate);
    } catch (error) {
      lastImmediateWriteUpdatedAtRef.current = null;
      throw error;
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
    hasServerUpdateRef.current = false;
    draftRevisionRef.current += 1;
    setDraftData(currentServerData);
    setPendingImages({});
    setHasChanges(false);
    setHasServerUpdate(false);
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
    hasServerUpdate,
    pendingImages,
    isSaving,
    loading,
    error,
    updateDraftStock,
    toggleDraftSoldOut,
    toggleDraftOpen,
    updateDraftNotice,
    updateDraftSettings,
    updateDraftItem,
    removeDraftItem,
    saveChanges,
    updateStoreImmediately,
    discardChanges,
    loadLatestServerData: discardChanges,
    storeData: draftData,
    updateStock,
    updateNotice,
    updateItems,
  };
}