const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

/**
 * 원본 이미지 파일을 가로 최대 maxWidth(기본 400px)의 WebP Blob으로 압축
 */
export async function compressImageToWebP(
  file: File,
  maxWidth = 400,
  quality = 0.75
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D 컨텍스트를 생성할 수 없습니다.'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('WebP 이미지 변환에 실패했습니다.'));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 불러오는 중 오류가 발생했습니다.'));
    };

    img.src = objectUrl;
  });
}

/**
 * 이미지를 WebP로 압축한 뒤 Cloudinary에 업로드하고 HTTPS URL을 반환
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Cloudinary 환경 변수가 설정되지 않았습니다.');
  }

  const compressedBlob = await compressImageToWebP(file);

  const formData = new FormData();
  formData.append('file', compressedBlob, 'product.webp');
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || '이미지 업로드에 실패했습니다.');
  }

  const data = await response.json();
  return data.secure_url as string;
}