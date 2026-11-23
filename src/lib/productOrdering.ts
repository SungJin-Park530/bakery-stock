import type { ProductItem } from '../types/bakery';

export function normalizeProductOrder(items: readonly ProductItem[]): ProductItem[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

export function reorderCategoryItems(
  items: readonly ProductItem[],
  category: string,
  orderedItemIds: readonly string[]
): ProductItem[] {
  if (new Set(orderedItemIds).size !== orderedItemIds.length) {
    throw new Error('재정렬 대상 상품 ID가 중복되었습니다.');
  }

  const currentItems = items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftOrder = Number.isFinite(left.item.order) ? left.item.order : left.index;
      const rightOrder = Number.isFinite(right.item.order) ? right.item.order : right.index;
      return leftOrder - rightOrder || left.index - right.index;
    })
    .map(({ item }) => item);
  const categoryItems = new Map(
    currentItems
      .filter((item) => item.category === category)
      .map((item) => [item.id, item])
  );

  for (const id of orderedItemIds) {
    if (!categoryItems.has(id)) {
      throw new Error(`상품 ${id}이(가) '${category}' 카테고리에 없습니다.`);
    }
  }

  const reorderedItems = [...currentItems];
  const targetIds = new Set(orderedItemIds);
  const targetSlots = currentItems.flatMap((item, index) =>
    item.category === category && targetIds.has(item.id) ? [index] : []
  );

  targetSlots.forEach((slot, index) => {
    reorderedItems[slot] = categoryItems.get(orderedItemIds[index])!;
  });

  return normalizeProductOrder(reorderedItems);
}