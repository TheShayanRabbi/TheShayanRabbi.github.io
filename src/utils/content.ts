export function sortByPublishedDate<T extends { data: { publishedAt: Date } }>(
  entries: T[],
) {
  return [...entries].sort(
    (left, right) => right.data.publishedAt.valueOf() - left.data.publishedAt.valueOf(),
  );
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
