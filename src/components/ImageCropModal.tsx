import { useEffect, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

interface ImageCropModalProps {
  file: File;
  imageUrl: string;
  onCancel: () => void;
  onApply: (file: File) => void;
}

function createCroppedFile(imageUrl: string, area: Area, originalFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(area.width);
      canvas.height = Math.round(area.height);

      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.'));
        return;
      }

      context.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('크롭한 이미지를 생성하지 못했습니다.'));
          return;
        }

        const baseName = originalFile.name.replace(/\.[^.]+$/, '') || 'product';
        resolve(new File([blob], `${baseName}-cropped.png`, { type: blob.type }));
      }, 'image/png');
    };
    image.onerror = () => reject(new Error('이미지를 불러오는 중 오류가 발생했습니다.'));
    image.src = imageUrl;
  });
}

export default function ImageCropModal({ file, imageUrl, onCancel, onApply }: ImageCropModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();

    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const handleApply = async () => {
    if (!imageUrl || !croppedAreaPixels) return;

    setIsCreating(true);
    setErrorMessage('');
    try {
      const croppedFile = await createCroppedFile(imageUrl, croppedAreaPixels, file);
      onApply(croppedFile);
    } catch {
      setErrorMessage('사진을 처리하지 못했습니다. 다른 사진으로 다시 시도해주세요.');
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    if (!isCreating) onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="image-crop-title"
      onCancel={(event) => {
        event.preventDefault();
        handleCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleCancel();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-transparent p-0 text-stone-900 backdrop:bg-black/70"
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <section className="w-full max-w-md rounded-lg bg-surface-card p-4 shadow-xl">
          <h2 id="image-crop-title" className="mb-3 text-lg font-bold text-stone-900">
            사진 자르기
          </h2>

          <div className="relative h-[min(60dvh,26rem)] min-h-48 w-full overflow-hidden rounded-md bg-stone-950">
            {imageUrl && (
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                minZoom={1}
                maxZoom={4}
                cropShape="rect"
                objectFit="contain"
                showGrid
                zoomWithScroll={false}
                disableAutomaticStylesInjection
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_croppedArea, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                cropperProps={{ 'aria-label': '상품 사진 크롭 영역' }}
                mediaProps={{ alt: '크롭할 상품 사진' }}
              />
            )}
          </div>

          <label htmlFor="image-crop-zoom" className="mt-4 flex items-center justify-between text-sm font-medium">
            <span>확대</span>
            <span>{zoom.toFixed(1)}배</span>
          </label>
          <input
            id="image-crop-zoom"
            type="range"
            min="1"
            max="4"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            aria-label="사진 확대 비율"
            className="mt-2 min-h-8 w-full accent-brand-primary"
          />

          {errorMessage && <p role="alert" className="mt-2 text-sm text-status-danger">{errorMessage}</p>}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCreating}
              className="min-h-12 flex-1 rounded-md border border-border-subtle bg-surface-card px-3 font-semibold text-stone-700 disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void handleApply()}
              disabled={!croppedAreaPixels || isCreating}
              className="min-h-12 flex-1 rounded-md bg-brand-primary px-3 font-semibold text-white disabled:opacity-60"
            >
              {isCreating ? '처리 중...' : '이 사진 사용'}
            </button>
          </div>
        </section>
      </div>
    </dialog>
  );
}