import { structuredDataJson } from '@/lib/structured-data';

export function StructuredData({
  values,
}: {
  values: readonly (Record<string, unknown> | null)[];
}) {
  return values.flatMap((value, index) =>
    value === null
      ? []
      : [
          <script key={index} type="application/ld+json">
            {structuredDataJson(value)}
          </script>,
        ],
  );
}
