// Supabase (PostgREST) domyślnie ucina każdy wynik do ustawienia "Max Rows"
// projektu (domyślnie 1000) - BEZ błędu. `error` zostaje `null`, `data` po prostu
// ma tylko pierwsze `pageSize` wierszy. Zapytania bez jawnej paginacji cicho gubią
// starsze rekordy (przy `order: date desc` - to właśnie one wypadają z wyniku).
// Ta funkcja pobiera dane stronami przez `.range()`, aż strona zwróci mniej niż
// `pageSize` wierszy.
export const SUPABASE_PAGE_SIZE = 1000;

export interface PagedResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PagedResult<T>>,
  pageSize: number = SUPABASE_PAGE_SIZE
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
