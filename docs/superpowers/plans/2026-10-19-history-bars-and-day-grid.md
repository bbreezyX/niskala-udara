# Riwayat: grafik batang per jam dan kisi hari × jam

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti tabel per jam di halaman Riwayat dengan grafik batang (rentang 24 jam) dan kisi hari × jam (rentang 72 jam). Memilih batang atau sel menampilkan detail jam itu di bawahnya.

**Architecture:** Logika murni (baris per jam, jam lokal kota, pengelompokan per hari, navigasi tombol panah) pindah ke `src/lib/history.ts` dan dites dengan Vitest. Dua komponen presentasi baru, `HistoryBars` dan `HistoryGrid`, sama-sama berupa radiogroup dengan roving tabindex, memakai fungsi navigasi yang sama. `history-view.tsx` kehilangan TanStack Table, paginasi, dan kolom detail yang menempel; tata letaknya jadi satu kartu grafik selebar halaman, lalu detail jam dan rekomendasi kesehatan di bawahnya.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, Radix Tabs (sudah dipakai), Vitest.

**Spec:** mockup di scratchpad sesi ini, `history-mock/a-timeline.html` (tampilan utama) dan `history-mock/b-pattern.html` (kisi 72 jam). Mockup memakai data contoh untuk Sabtu dan Minggu; implementasi memakai data API.

## Global Constraints

- Tab untuk indentasi di TS/TSX, nama file kebab-case, import `@/`. Komentar menjelaskan alasan, bukan apa.
- Setiap teks UI ada di `id.ts` (sumber, mendefinisikan `Dictionary`) dan `en.ts` (British English). Nilai kamus berupa string biasa dengan placeholder `{name}`, diisi dengan `fill`.
- Warna band hanya dari `AQI_BANDS` di `src/lib/aqi.ts`: isian `band.fill`, garis tepi `bandEdge(band)`, teks di atas isian `band.onFill`. Skala UAQI: makin tinggi makin baik.
- Gambetta (`font-display`) tidak dipakai di komponen baru. Angka yang dibandingkan memakai `tabular-nums`. Judul operasional `font-semibold`.
- Jam dan hari selalu dihitung di zona waktu kota (`city.timeZone`), bukan zona browser.
- Tidak ada warna, state, atau pola dari Material 3.
- Gerbang deploy: `npm run doctor` harus mencetak tepat `100`.

## Review Focus

1. **API melewatkan satu jam.** Di kisi, jam yang hilang harus jadi sel kosong di kolom jam yang benar, bukan menggeser sel lain. Dites di Task 1 (`dayGrid` dengan celah).
2. **Kota di WITA/WIT.** Kolom kisi dan label sumbu memakai jam lokal kota; Jayapura pukul 00.00 tidak boleh jatuh di baris hari sebelumnya. Dites di Task 1 (`clockHour`, `dayGrid` dengan `Asia/Jayapura`).
3. **AQI 0 atau sangat rendah.** Batang tetap terlihat dan bisa diklik (tinggi minimum 3%, sama seperti batang tabel sekarang). Dicek di Task 2 langkah browser.
4. **Ganti rentang saat jam lama terpilih.** Pilihan kembali ke jam terbaru dan fokus keyboard tidak hilang ke `body`. `setSelectedTime(null)` di efek fetch sudah menangani pilihan; dicek di Task 4 langkah browser.
5. **Band terang (Sedang, Baik) di atas putih.** Batang dan sel tetap terbaca karena `bandEdge`; angka di sel memakai `band.onFill`. Dicek di Task 3 langkah browser dengan data kota yang AQI-nya ≥ 40.

---

### Task 1: Logika riwayat di `src/lib/history.ts`

**Files:**
- Create: `src/lib/history.ts`
- Test: `src/lib/history.test.ts`

**Interfaces:**
- Produces:
  - `interface HourRow { t: number; hour: AirQualityData; change: number | null }` (pindahan dari `history-view.tsx`, komentar `change` ikut dipindah)
  - `toHourRows(hours: AirQualityData[]): HourRow[]`: urutan input dipertahankan (lama ke baru), `change` = AQI dikurangi AQI baris sebelumnya, `null` untuk baris pertama.
  - `clockHour(iso: string, timeZone: string): number`: 0–23, lewat `Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone })`.
  - `interface DayRow { key: string; cells: (HourRow | null)[]; min: number; max: number }`: `key` = tanggal lokal `YYYY-MM-DD` (format `en-CA`), `cells` selalu panjang 24 dengan indeks = jam lokal.
  - `dayGrid(rows: HourRow[], timeZone: string): DayRow[]`: hari terbaru di atas. Semua hari dalam rentang ikut, termasuk hari parsial (jam di luar rentang jadi `null`), supaya rentang 72 jam tidak menyembunyikan data.
  - `nextHourIndex(key: string, index: number, count: number): number | null`: `ArrowLeft` −1, `ArrowRight` +1, `Home` 0, `End` count − 1, dibatasi ke `[0, count − 1]`; tombol lain `null`.
  - `sameHourOtherDay(days: DayRow[], t: number, direction: -1 | 1): number | null`: `t` dari sel di jam lokal yang sama pada baris hari di atas (−1) atau di bawah (+1); `null` bila baris itu tidak ada atau selnya kosong.

- [ ] **Step 1: Tulis tes yang gagal**

Buat helper `hour(iso: string, aqi: number): AirQualityData` di file tes (isi `index` minimal: `aqi`, `aqiDisplay: String(aqi)`, sisanya `null`/string kosong; `pollutants: []`, `recommendations: {}`).

```ts
describe('toHourRows', () => {
	it('records the change against the hour before', () => {
		const rows = toHourRows([hour('2026-10-19T13:00:00Z', 10), hour('2026-10-19T14:00:00Z', 19), hour('2026-10-19T15:00:00Z', 12)]);
		expect(rows.map((r) => r.change)).toEqual([null, 9, -7]);
		expect(rows[0].t).toBe(Date.parse('2026-10-19T13:00:00Z'));
	});
});

describe('clockHour', () => {
	it('reads the hour in the city’s zone', () => {
		expect(clockHour('2026-10-19T15:00:00Z', 'Asia/Jakarta')).toBe(22);
		expect(clockHour('2026-10-19T15:00:00Z', 'Asia/Jayapura')).toBe(0);
	});
});

describe('dayGrid', () => {
	it('puts each hour in its local day and clock column, newest day first', () => {
		// 22.00 and 23.00 WIB on the 18th, 00.00 WIB on the 19th
		const days = dayGrid(toHourRows([hour('2026-10-18T15:00:00Z', 15), hour('2026-10-18T16:00:00Z', 14), hour('2026-10-18T17:00:00Z', 9)]), 'Asia/Jakarta');
		expect(days.map((d) => d.key)).toEqual(['2026-10-19', '2026-10-18']);
		expect(days[0].cells[0]?.hour.index.aqi).toBe(9);
		expect(days[1].cells[23]?.hour.index.aqi).toBe(14);
		expect(days[1].cells[0]).toBeNull();
		expect(days.every((d) => d.cells.length === 24)).toBe(true);
		expect(days[1]).toMatchObject({ min: 14, max: 15 });
	});

	it('leaves a missing hour empty instead of shifting the row', () => {
		const days = dayGrid(toHourRows([hour('2026-10-19T01:00:00Z', 20), hour('2026-10-19T03:00:00Z', 24)]), 'Asia/Jakarta');
		expect(days[0].cells[8]?.hour.index.aqi).toBe(20);
		expect(days[0].cells[9]).toBeNull();
		expect(days[0].cells[10]?.hour.index.aqi).toBe(24);
	});

	it('uses the city’s zone for the day boundary', () => {
		const days = dayGrid(toHourRows([hour('2026-10-19T15:00:00Z', 30)]), 'Asia/Jayapura');
		expect(days[0].key).toBe('2026-10-20');
		expect(days[0].cells[0]?.hour.index.aqi).toBe(30);
	});
});

describe('nextHourIndex', () => {
	it('moves by hour and to the ends, within bounds', () => {
		expect(nextHourIndex('ArrowRight', 5, 24)).toBe(6);
		expect(nextHourIndex('ArrowLeft', 0, 24)).toBe(0);
		expect(nextHourIndex('ArrowRight', 23, 24)).toBe(23);
		expect(nextHourIndex('End', 3, 24)).toBe(23);
		expect(nextHourIndex('ArrowUp', 3, 24)).toBeNull();
		expect(nextHourIndex('Enter', 3, 24)).toBeNull();
	});
});

describe('sameHourOtherDay', () => {
	it('moves to the same clock hour on the neighbouring day, or stays put', () => {
		// 22.00 WIB on the 18th and the 19th, 23.00 WIB only on the 18th
		const days = dayGrid(toHourRows([hour('2026-10-18T15:00:00Z', 15), hour('2026-10-18T16:00:00Z', 14), hour('2026-10-19T15:00:00Z', 11)]), 'Asia/Jakarta');
		const t19 = Date.parse('2026-10-19T15:00:00Z');
		expect(sameHourOtherDay(days, t19, 1)).toBe(Date.parse('2026-10-18T15:00:00Z'));
		expect(sameHourOtherDay(days, t19, -1)).toBeNull();
		expect(sameHourOtherDay(days, Date.parse('2026-10-18T16:00:00Z'), -1)).toBeNull();
	});
});
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `npx vitest run src/lib/history.test.ts`
Expected: FAIL, modul `./history` tidak ditemukan.

- [ ] **Step 3: Implementasikan keenam ekspor di `src/lib/history.ts`**

Formatter `Intl` untuk `clockHour` dan `key` hari dibuat sekali per zona (cache `Map`, seperti `dateTimeFormat`). `dayGrid` mengelompokkan dengan `Map<string, DayRow>` lalu mengurutkan `key` menurun.

- [ ] **Step 4: Jalankan, pastikan lulus**

Run: `npx vitest run src/lib/history.test.ts`
Expected: PASS, 7 tes.

- [ ] **Step 5: Commit**

```bash
git add src/lib/history.ts src/lib/history.test.ts
git commit -m "Add hourly history rows, local day grid and arrow-key navigation helpers"
```

---

### Task 2: Grafik batang 24 jam, `HistoryBars`

**Files:**
- Create: `src/components/history-bars.tsx`
- Modify: `src/lib/i18n/dictionaries/id.ts` dan `en.ts`, blok `history`

**Interfaces:**
- Consumes: `HourRow`, `clockHour`, `nextHourIndex` dari Task 1; `aqiBand`, `bandEdge`, `AQI_BANDS` dari `@/lib/aqi`; `formatHour`, `formatDay` dari `@/lib/format`.
- Produces: `HistoryBars({ rows, selectedTime, onSelect, timeZone, label }: { rows: HourRow[]; selectedTime: number | undefined; onSelect: (t: number) => void; timeZone: string; label: string })`. Kunci kamus baru dipakai juga oleh Task 3 dan 4: `history.hourOption`, `history.hint`, `history.chartLabel`, `history.gridLabel`, `history.noData`, `history.dayRange`, `history.previousHour`, `history.nextHour`.

- [ ] **Step 1: Tambah kunci kamus**

| Kunci | id | en |
|---|---|---|
| `chartLabel` | `AQI per jam di {name}` | `Hourly AQI in {name}` |
| `gridLabel` | `AQI per jam di {name}, satu baris per hari` | `Hourly AQI in {name}, one row per day` |
| `hourOption` | `{time}, {day}: AQI {aqi}, {band}` | `{time}, {day}: AQI {aqi}, {band}` |
| `hint` | `Pilih jam untuk melihat detailnya. Tombol panah berpindah jam.` | `Select an hour to see its details. Arrow keys move between hours.` |
| `noData` | `Tidak ada data` | `No data` |
| `dayRange` | `Rentang` | `Range` |
| `previousHour` | `Jam sebelumnya` | `Previous hour` |
| `nextHour` | `Jam berikutnya` | `Next hour` |

- [ ] **Step 2: Bangun `HistoryBars`**

Struktur, mengikuti mockup A:
- Wadah `role="radiogroup"` dengan `aria-label={label}`. Tiap batang adalah `<button role="radio" aria-checked>` dengan `aria-label` dari `hourOption` (jam via `formatHour`, hari via `formatDay`, band via `t.aqi.bands[band.key]`). Hanya batang terpilih yang `tabIndex={0}`, sisanya `-1`.
- `onKeyDown` di wadah: `nextHourIndex(event.key, index, rows.length)`; jika bukan `null`, `preventDefault`, panggil `onSelect`, lalu fokuskan tombol dengan `data-t` itu (ref ke wadah, `querySelector`).
- Zona band di belakang batang: satu `div` per `AQI_BANDS`, posisi `bottom: min%`, tinggi sampai `min` band berikutnya (atau 100), latar `color-mix(in oklab, ${band.fill} 10%, transparent)`, label band di kiri luar plot (`t.aqi.bands`), disembunyikan di bawah `sm`.
- Batang: tinggi `Math.max(3, Math.min(100, aqi))%`, latar `band.fill`, `boxShadow: bandEdge(band)`, sudut atas membulat. Terpilih: cincin `ring-2 ring-primary ring-offset-2 ring-offset-card`. Fokus: `focus-visible:ring-3 focus-visible:ring-ring/50`.
- Angka di atas batang (`aqiDisplay`, `text-xs font-semibold tabular-nums`), disembunyikan di bawah `sm`.
- Sumbu `aria-hidden`: label jam tiap 3 jam (tiap 6 jam di bawah `sm`); pada jam lokal 0 tampilkan nama hari pendek (`formatDay`) dengan garis tegak `border-l` sebagai pemisah hari.
- Di bawah plot: `history.hint` lalu `t.common.scale`, `text-sm text-muted-foreground`.
- Tinggi plot `h-56 sm:h-72`.

- [ ] **Step 3: Cek tipe**

Run: `npm run check`
Expected: tanpa error. Kunci lama yang belum dihapus masih valid sampai Task 4.

- [ ] **Step 4: Commit**

```bash
git add src/components/history-bars.tsx src/lib/i18n/dictionaries/id.ts src/lib/i18n/dictionaries/en.ts
git commit -m "Add hourly bar chart for the history page"
```

---

### Task 3: Kisi hari × jam 72 jam, `HistoryGrid`

**Files:**
- Create: `src/components/history-grid.tsx`

**Interfaces:**
- Consumes: `DayRow`, `dayGrid`, `nextHourIndex`, `sameHourOtherDay`, `HourRow` dari Task 1; kunci kamus dari Task 2.
- Produces: `HistoryGrid({ rows, selectedTime, onSelect, timeZone, label }: { rows: HourRow[]; selectedTime: number | undefined; onSelect: (t: number) => void; timeZone: string; label: string })`, props sama dengan `HistoryBars` supaya `history-view` bisa menukar keduanya.

- [ ] **Step 1: Bangun `HistoryGrid`**

Struktur, mengikuti mockup B:
- `const days = useMemo(() => dayGrid(rows, timeZone), …)`. Grid CSS: kolom nama hari (`7rem`), 24 kolom `minmax(0,1fr)`, kolom rentang (`7.5rem`), `gap-[3px]`.
- Baris kepala `aria-hidden`: jam tiap 3 jam, lalu `history.dayRange`.
- Per hari: nama hari (`weekday: 'long'`) dan tanggal (`day: 'numeric', month: 'short'`) lewat `dateTimeFormat(locale, { …, timeZone })` dari `@/lib/date-format`; 24 sel; lalu rentang `min–max` dan nama band min (plus "–" band max bila beda).
- Sel berisi data: `<button role="radio" aria-checked>`, `aria-label` dari `hourOption`, latar `band.fill`, teks `band.onFill`, `boxShadow: bandEdge(band)`, isi `aqiDisplay` `text-xs font-semibold tabular-nums`, `aspect-[1/1.15] rounded-md`. Terpilih: cincin sama dengan batang.
- Sel kosong: `<span aria-hidden>` berpola garis miring dari `bg-muted`, dengan `title={t.history.noData}`. Tidak bisa difokus.
- Radiogroup satu untuk seluruh kisi. Navigasi: daftar datar sel berisi data dalam urutan tampil (hari terbaru dulu, jam 0–23), `nextHourIndex(key, index, list.length)` untuk kiri/kanan dan Home/End. `ArrowUp`/`ArrowDown` memakai `sameHourOtherDay(days, selectedTime, -1 | 1)`; bila `null`, tidak bergerak. Fokus mengikuti seperti di `HistoryBars`.
- Di bawah `md`, bungkus kisi dengan `overflow-x-auto` dan `min-w-[40rem]` pada kisinya; label jam tetap terlihat.
- Di bawah kisi: legenda band (kotak kecil `band.fill` + `bandEdge`, nama band, rentang angka), lalu `history.hint` dan `t.common.scale`.

- [ ] **Step 2: Cek tipe**

Run: `npm run check`
Expected: tanpa error.

- [ ] **Step 3: Commit**

```bash
git add src/components/history-grid.tsx
git commit -m "Add day-by-hour grid for the 72-hour history"
```

---

### Task 4: Rangkai di `history-view.tsx` dan buang tabel

**Files:**
- Modify: `src/components/history-view.tsx`
- Modify: `src/lib/i18n/dictionaries/id.ts`, `en.ts`
- Modify: `package.json`, `package-lock.json` (hapus `@tanstack/react-table`, hanya dipakai file ini)

**Interfaces:**
- Consumes: `toHourRows`, `HourRow` (Task 1), `HistoryBars` (Task 2), `HistoryGrid` (Task 3).

- [ ] **Step 1: Ganti isi kartu**

- `rows` dihitung dengan `toHourRows(hours)`. Hapus `features`, `helper`, `columnsFor`, `COLUMN_CLASS`, `EMPTY`, `headerText`, `useHistoryTable`, `HistoryTableHead`, `HistoryRows`, `HistoryPager`, `PAGE_SIZE`, dan import TanStack, `Table*`, `ArrowUpDown`, `ChevronLeft`/`ChevronRight` yang tidak terpakai lagi.
- `deltaOf` tetap, dipakai di detail jam.
- Konten tab: saat memuat, `Skeleton` setinggi plot (`h-56 sm:h-72`); saat berhasil, `range === 24 ? <HistoryBars …/> : <HistoryGrid …/>` dengan `label={fill(t.history.chartLabel | gridLabel, { name: city.name })}`; saat gagal, `HistoryError` seperti sekarang.
- `select(t)` cukup `setSelectedTime(t)`. Hapus `scrollIntoView` dan `matchMedia`: detail ada tepat di bawah grafik, dan menggulir halaman saat orang menelusuri batang dengan panah akan mengganggu.

- [ ] **Step 2: Ubah tata letak**

Wrapper luar jadi `grid gap-5`; kartu grafik selebar penuh; di bawahnya `grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]` berisi panel detail dan `Recommendation`. Panel detail tidak lagi `sticky` dan tidak punya lapisan gulir dalam (`max-h`, `overflow-y-auto`, `my-4 mr-1` dihapus); padding `p-6`.

- [ ] **Step 3: Sesuaikan `HourDetail`**

- Hapus bagian `TrendChart` (grafik di atas sudah menampilkan tren) beserta prop `hours` dan `range`.
- Judul jadi jam terpilih: `<h2 id="detail-title">` berisi `formatHour`, di bawahnya `formatDay`; nama kota tidak diulang karena sudah jadi judul kartu.
- Tambah baris perubahan di bawah `AqiBadge` dari `deltaOf(change, t.history.delta).spoken`, warna dari `className`-nya.
- Tambah tombol `history.previousHour` dan `history.nextHour` (`Button variant="outline" size="lg"`), memilih baris sebelum/sesudah di `rows`; `disabled` di ujung. Props baru `HourDetail`: `{ city, row, onStep: (direction: -1 | 1) => void, canStep: { previous: boolean; next: boolean } }`.

- [ ] **Step 4: Bersihkan kamus**

Hapus dari `history` di `id.ts` dan `en.ts`: `caption`, `columns`, `delta.sameShort`, `pagesLabel`, `previous`, `next`, `page`, `showHour`, `trendTitle`, `trendLabel`. Pastikan dengan `grep` bahwa tidak ada pemakaian tersisa sebelum menghapus.

- [ ] **Step 5: Hapus dependensi yatim**

Run: `npm uninstall @tanstack/react-table`
Lalu `grep -r "react-table" src` harus kosong.

- [ ] **Step 6: Tes, tipe, gerbang deploy**

Run: `npm test` lalu `npm run check` lalu `npm run doctor`
Expected: semua tes lulus, `tsc` tanpa error, doctor mencetak tepat `100`.

- [ ] **Step 7: Cek di browser**

Dengan `npm run dev`, buka `/history` dan `/en/history` di 1440 × 900 dan 375 × 812:
- 24 jam: 24 batang, batang terbaru terpilih, detail menampilkan jam itu. Klik batang lain, detail ikut berubah. Tab masuk ke grup, panah kiri/kanan/Home/End berpindah dan fokus mengikuti.
- 72 jam: kisi tampil dengan hari terbaru di atas, sel di luar rentang bergaris, panah atas/bawah pindah hari di jam yang sama. Di 375 px kisi bisa digeser horizontal tanpa menggeser halaman.
- Ganti 72 → 24 saat sel lama terpilih: pilihan kembali ke jam terbaru.
- Pilih kota yang AQI-nya ≥ 40 (band Sedang/Baik) dan kota WIT (mis. Jayapura): batang dan angka sel terbaca, label jam sesuai jam lokal.
- Tombol jam sebelumnya/berikutnya mati di ujung.

- [ ] **Step 8: Commit**

```bash
git add src/components/history-view.tsx src/lib/i18n/dictionaries/id.ts src/lib/i18n/dictionaries/en.ts package.json package-lock.json
git commit -m "Replace the history table with an hourly bar chart and a 72-hour day grid"
```
