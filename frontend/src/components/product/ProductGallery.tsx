import Image from 'next/image';
import type { ProductMediaView } from '@ltv/contracts';
import type { Dictionary } from '@/lib/i18n';

export function ProductGallery({
  productName,
  featuredImageId,
  media,
  dictionary,
}: {
  productName: string;
  featuredImageId: string | null;
  media: readonly ProductMediaView[];
  dictionary: Dictionary;
}) {
  const visible = media
    .filter((item) => item.public_url !== null)
    .toSorted((left, right) => {
      if (left.media_id === featuredImageId) return -1;
      if (right.media_id === featuredImageId) return 1;
      return 0;
    });

  return (
    <section aria-label={dictionary.products.galleryLabel}>
      {visible.length === 0 ? (
        <div className="technical-product-visual relative flex aspect-[4/3] items-end overflow-hidden rounded-3xl border border-slate-200 p-8 shadow-[0_24px_70px_-44px_rgba(15,23,42,.5)]">
          <span
            className="absolute -right-12 -top-12 size-56 rounded-full border-[28px] border-blue-800/10"
            aria-hidden="true"
          />
          <div className="relative">
            <p className="section-kicker">{dictionary.products.galleryLabel}</p>
            <p
              className="mt-3 text-4xl font-black tracking-tight text-slate-700"
              aria-hidden="true"
            >
              {productName}
            </p>
            <p className="mt-3 max-w-sm text-sm font-semibold text-slate-500">
              {dictionary.products.galleryPlaceholder}
            </p>
          </div>
        </div>
      ) : (
        <>
          <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <Image
              className="h-auto w-full"
              src={visible[0]!.public_url!}
              alt={visible[0]!.alt_text ?? productName}
              width={visible[0]!.width ?? 1200}
              height={visible[0]!.height ?? 900}
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
            />
            {visible[0]!.caption === null ? null : (
              <figcaption className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                {visible[0]!.caption}
              </figcaption>
            )}
          </figure>
          {visible.length < 2 ? null : (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {visible.slice(1).map((item) => (
                <figure
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white"
                  key={item.media_id}
                >
                  <Image
                    className="aspect-square h-auto w-full object-cover"
                    src={item.public_url!}
                    alt={item.alt_text ?? productName}
                    width={item.width ?? 480}
                    height={item.height ?? 480}
                    sizes="(min-width: 640px) 33vw, 50vw"
                  />
                  {item.caption === null ? null : (
                    <figcaption className="p-2 text-xs text-slate-600">{item.caption}</figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
