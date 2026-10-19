# Niskala

Dashboard kualitas udara dari Google Maps Platform Air Quality API: Universal AQI terkini, kadar polutan, prakiraan 24 jam, riwayat per jam, dan rekomendasi kesehatan. Mencakup 38 provinsi: 109 lokasi, yaitu semua kota di Indonesia, Jakarta, ibu kota provinsi yang berupa kabupaten, dan seluruh 11 kabupaten/kota di Jambi.

- **Pantauan** (`/`): kartu per lokasi dengan gauge AQI, empat polutan utama, dan sparkline prakiraan. Wilayah aktif tersimpan di URL (`?region=jawa-barat`).
- **Detail lokasi** (`/location/[id]`, mis. `/location/bandung`): halaman sendiri berisi gauge, ringkasan 24 jam (terendah, tertinggi, rata-rata, jam terbaik berikutnya), rekomendasi, tren 24 jam terakhir + prakiraan, dan enam polutan. `/location/me` meminta lokasi perangkat di halaman itu sendiri; `/location/point#lat,lng` untuk titik dari peta. Koordinat perangkat tidak pernah masuk URL, dan koordinat titik peta hanya ada di hash sehingga tidak terkirim ke server.
- **Peta** (`/map`): Google Map seluruh Indonesia (awalnya berpusat di Jambi) dengan heatmap Universal AQI, hotspot NASA FIRMS (VIIRS) 24 jam terakhir, dan aliran angin 10 m dari Open-Meteo yang dianimasikan sebagai partikel (panah diam bila *reduced motion* aktif). Klik titik mana pun untuk membuka halaman detail kualitas udara di titik itu.
- **Riwayat** (`/history`): tabel per jam (24 atau 72 jam) dengan panel detail untuk jam yang dipilih.

Stack: Next.js 16 (App Router, TypeScript strict), React 19, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com) (Radix), Recharts untuk grafik, TanStack Table untuk tabel Riwayat, Motion untuk animasi, ikon Lucide. Tanpa database, tanpa akun. Angin hanya ada di Peta, dari [Open-Meteo](https://open-meteo.com/) (model ECMWF/ICON/GFS, CC BY 4.0) pada grid 1,5°; satu kali ambil berisi prakiraan per jam selama 2 hari dan disimpan 3 jam di server (429 titik × 8 = 3.432 panggilan/hari, di bawah batas gratis 10.000). API gratis Open-Meteo hanya untuk penggunaan non-komersial; isi `OPEN_METEO_API_KEY` bila situs memakai iklan atau langganan.

## Setup

Butuh Node.js 22.17 atau lebih baru.

```bash
npm ci
cp .env.example .env
```

Isi `.env`:

| Variabel                     | Sifat         | Untuk                                              |
| ---------------------------- | ------------- | -------------------------------------------------- |
| `GOOGLE_AIR_QUALITY_API_KEY` | server saja   | kondisi terkini, prakiraan, riwayat, tile heatmap  |
| `FIRMS_MAP_KEY`              | server saja   | hotspot NASA FIRMS ([minta gratis](https://firms.modaps.eosdis.nasa.gov/api/map_key/)) |
| `PUBLIC_GOOGLE_MAPS_API_KEY` | dikirim ke browser | Maps JavaScript API di halaman Peta           |
| `OPEN_METEO_API_KEY`         | server saja   | opsional: API komersial Open-Meteo untuk angin; tanpa ini memakai API gratis (non-komersial) |

Semua opsional saat start. Bagian yang key-nya kosong menampilkan status "belum dikonfigurasi", bukan angka karangan.

## Perintah

| Perintah        | Fungsi                                   |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Server pengembangan di `localhost:3000`  |
| `npm run check` | Type-check (`tsc`, TS strict)            |
| `npm test`      | Unit test validasi dan endpoint          |
| `npm run build` | Build produksi ke `.next/`               |
| `npm start`     | Menjalankan hasil build (port 3000)      |

## Struktur

```
src/
  app/
    page.tsx                     dashboard (Pantauan)
    riwayat/                     halaman Riwayat
    peta/                        halaman Peta (Google Maps + FIRMS)
    api/air-quality/             POST /api/air-quality, /history, /forecast; GET /region/[region], /tiles/[z]/[x]/[y]
    api/fires/                   GET hotspot FIRMS (cache 10 menit)
    privasi/, ketentuan/         halaman kebijakan (statis)
    globals.css                  token tema Tailwind/shadcn
  components/                    komponen aplikasi (client components)
  components/ui/                 komponen shadcn/ui
  lib/
    config/cities.ts             wilayah, kota/kabupaten, koordinat referensi (edit di sini)
    client/                      fetch dengan timeout/abort, store state per lokasi
    aqi.ts                       warna skala UAQI dan pita kategori
    types.ts                     tipe data bersama
    coordinates.ts               validasi koordinat
    format.ts                    format angka, satuan, waktu, pesan error
    server/env.ts                akses env var (server-only)
    server/google-air-quality.ts panggilan ke Google + validasi respons
    server/air-quality-cache.ts  cache server ≤ 1 jam, satu request Google per lokasi bersamaan
    server/region-air-quality.ts lookup per wilayah untuk halaman dan endpoint NDJSON
    server/handle-air-quality.ts validasi request, pemetaan error, log
```

Menambah lokasi: tambahkan entri di `src/lib/config/cities.ts` dengan `region`, `kind` (`kota`/`kabupaten`), `point` (nama tempat titik referensi), dan `timeZone` IANA (`Asia/Jakarta`, `Asia/Pontianak`, `Asia/Makassar`, atau `Asia/Jayapura`) agar waktu tampil sebagai WIB/WITA/WIT. Wilayah (provinsi) ada di `REGIONS`; wilayah default diatur lewat `DEFAULT_REGION`.

Titik kabupaten di Jambi adalah ibu kota kabupaten (mis. Batanghari → Muara Bulian), diambil dari node permukiman OpenStreetMap, bukan titik tengah wilayah. Satu titik mewakili kondisi di sekitar kota tersebut, bukan rata-rata seluruh kabupaten.

## Cara kerja API

| Endpoint internal                 | Body                              | Google                     |
| --------------------------------- | --------------------------------- | -------------------------- |
| `POST /api/air-quality`           | `{ latitude, longitude }`         | `currentConditions:lookup` |
| `POST /api/air-quality/forecast`  | `{ latitude, longitude }`         | `forecast:lookup` (24 jam) |
| `POST /api/air-quality/history`   | `{ latitude, longitude, hours }`  | `history:lookup` (24/72)   |
| `GET /api/air-quality/region/[id]`| —                                 | `currentConditions` + `forecast` untuk semua kota di wilayah, NDJSON |
| `GET /api/air-quality/tiles/z/x/y`| —                                 | `heatmapTiles` UAQI_RED_GREEN |
| `GET /api/fires`                  | —                                 | NASA FIRMS area API (3 satelit VIIRS) |

### Cache server dan streaming Pantauan

Kondisi terkini, prakiraan, dan riwayat disimpan di memori server (`src/lib/server/air-quality-cache.ts`) dan dipakai bersama semua pengunjung. Ketentuan Google Maps Platform (Service Specific Terms, Air Quality API 2.2) mengizinkan cache kondisi terkini dan prakiraan per jam paling lama **1 jam**, lalu wajib dihapus. Entri kedaluwarsa pada yang lebih dulu: 55 menit setelah diambil, atau menit ke-10 jam berikutnya (saat Google sudah menerbitkan nilai jam baru). Lima menit sisanya untuk salinan di Cloudflare (lihat di bawah), jadi total semua lapisan tetap di bawah 1 jam. Semua batas ada di `src/lib/config/cache.ts`. Entri kedaluwarsa dihapus berkala walau tidak diminta lagi. Request yang sama dan bersamaan dibagi menjadi satu panggilan ke Google, kegagalan tidak di-cache, dan jumlah entri dibatasi 1.000 (sekitar 9 MB). Panggilan `forecast:lookup` dibatasi 6 sekaligus untuk semua pengunjung: diukur di VPS, 11 prakiraan paralel bisa butuh 9,3 detik (hampir menyentuh timeout 10 detik), sedangkan 6 sekaligus tetap di bawah 4 detik dengan total waktu yang sama. Kondisi terkini tidak dibatasi karena tidak melambat. Cache ada di satu proses Node; restart server mengosongkannya.

Kota terdaftar selalu dicek di titik referensinya. Titik lain (lokasi perangkat, klik di peta) dibulatkan ke grid 1/200 derajat (sekitar 550 m, paling jauh sekitar 390 m dari titik asli), mendekati resolusi model Google 500 m. Dengan begitu pengunjung yang berdekatan memakai satu hasil cache, dan biaya Google tidak naik sebanding jumlah pengguna.

Pantauan tidak lagi menunggu JavaScript untuk mulai memuat data. Server memulai semua lookup wilayah di URL saat merender halaman dan mengirim hasil per kota begitu selesai (React Suspense streaming). Jika cache hangat, data sudah ada di HTML pertama. Kondisi terkini tampil tanpa menunggu prakiraan yang lebih lambat (prakiraan Google butuh 1–6 detik, kondisi terkini sekitar 1,4 detik dari VPS). Ganti wilayah dan "Perbarui" memakai satu request streaming per wilayah (`/api/air-quality/region/[id]`), satu baris JSON per kota dan bagian, sesuai urutan selesai. Endpoint itu hanya menerima wilayah yang terdaftar, jadi tidak bisa diarahkan ke koordinat sembarang.

### Cache Cloudflare

Satu proses Node di VPS (2 vCPU) hanya sanggup merender Pantauan sekitar 30 kali per detik, karena tiap tampilan merender data 11 kota (diukur dengan cache hangat; endpoint wilayah sekitar 300/detik, halaman statis sekitar 450/detik). Supaya lonjakan pengunjung tidak mengantre di VPS, `/` dan `/api/air-quality/region/[id]` mengirim `Cache-Control: public, max-age=0, s-maxage=60`: Cloudflare boleh menyajikan salinannya 60 detik, browser selalu memeriksa ulang. VPS cukup merender sekali per menit per wilayah, berapa pun jumlah pengunjungnya. Request navigasi klien Next.js (header `RSC` atau query `_rsc`) tidak diberi header ini, karena Cloudflare mengabaikan `Vary` dan tidak boleh menyajikan payload RSC sebagai HTML.

Cloudflare tidak meng-cache HTML secara bawaan. Pasang sekali di dashboard Cloudflare → zona `udaraniskala.web.id`:

1. **Caching → Cache Rules → Create rule**, nama `Pantauan edge cache`, *Custom filter expression* → *Edit expression*:
   ```
   (http.request.method eq "GET" and not http.request.uri.query contains "_rsc" and (http.request.uri.path eq "/" or starts_with(http.request.uri.path, "/api/air-quality/region/")))
   ```
   *Cache eligibility*: **Eligible for cache**. *Edge TTL*: **Use cache-control header if present, bypass cache if not**. *Browser TTL*: **Respect origin TTL**. Simpan.
2. **Security → WAF → Rate limiting rules → Create rule**, nama `API air quality`: bila `starts_with(http.request.uri.path, "/api/air-quality")`, hitung per IP, lebih dari 60 request per 10 detik → **Block** selama 10 detik. Ini rem untuk lokasi perangkat dan titik peta, yang tetap memanggil Google untuk setiap sel grid baru.
3. Cek: `curl -sI https://udaraniskala.web.id/` dua kali; yang kedua harus `cf-cache-status: HIT`.

Jika nanti halaman memilih bahasa dari header `Accept-Language` atau cookie di URL yang sama, cache rule ini harus disesuaikan dulu, karena Cloudflare tidak membedakan salinan berdasarkan header itu.

Tile heatmap diproksikan lewat server agar key Air Quality tidak pernah sampai ke browser. Proksi hanya melayani tile yang bersinggungan dengan Sumatra dan zoom ≤ 14, sehingga tidak bisa dipakai untuk menguras kuota di wilayah lain. Hotspot diambil untuk area Provinsi Jambi plus margin (`FIRE_AREA` di `src/lib/config/map.ts`), 2 hari terakhir dari FIRMS lalu dipangkas ke 24 jam, dan di-cache 10 menit di memori server. Data NASA boleh di-cache, berbeda dengan konten Google.

Server menolak input lain (field tambahan, `hours` selain 24/72, body > 1 KB, content-type selain JSON, request lintas situs), lalu memanggil Google dengan key di header `X-Goog-Api-Key`, timeout 10 detik. Respons divalidasi saat runtime; indeks dipilih berdasarkan `code: "uaqi"`. Respons JSON ke browser memakai `Cache-Control: no-store`; cache hanya ada di server (lihat di atas).

Key dibaca dari `process.env` saat request lewat `src/lib/server/env.ts` (ditandai `server-only`, jadi build gagal jika modul itu diimpor dari kode browser). Halaman yang membutuhkan key memanggil `connection()` agar dirender per request, bukan saat build. Ini sudah dicek dengan mencari key di `.next/static` setelah build. Log server hanya mencatat kode error, status/reason Google, dan durasi; tanpa key dan tanpa koordinat.

## Jumlah request ke Google

Setiap request di bawah ditagih per SKU Air Quality API; cek harga dan kuota gratis terbaru di halaman pricing Google Maps Platform. Angka di bawah adalah batas atas saat cache server kosong. Selama entri masih berlaku, pengunjung berikutnya tidak menambah request, jadi satu lokasi paling banyak menghabiskan sekitar 1 request per jenis data per jam, berapa pun jumlah pengunjungnya.

- Membuka Pantauan: 2 request per lokasi di wilayah aktif (kondisi terkini + prakiraan). Jambi = 22; provinsi lain 2 sampai 18 (Jawa Barat dan Jawa Timur, 9 lokasi). Data kota disimpan di memori browser selama sesi dan dipakai bersama halaman detail, jadi kembali dari detail tidak memuat ulang; data yang lebih tua dari 30 menit dimuat ulang (dari cache server bila masih berlaku).
- Membuka halaman detail kota: +1 (history 24 jam), +2 jika data kota itu belum ada di memori. Lokasi perangkat dan titik peta: 3 per sel grid sekitar 550 m yang belum ada di cache.
- Halaman Riwayat: 1 per pilihan kota/rentang.
- "Perbarui": 2 per lokasi di wilayah aktif jika cache sudah kedaluwarsa. Selama cache berlaku, hasilnya sama dengan data yang tampil, karena Google memperbarui datanya per jam.
- Halaman Peta: 1 pemuatan peta (SKU Dynamic Maps, Maps JavaScript API) + 1 request per tile heatmap yang belum ada di cache server (30 menit). Klik titik: membuka halaman detail (3 request).
- FIRMS: 3 transaksi per 10 menit paling banyak (dibagi ke semua pengunjung), jauh di bawah batas 5.000 per 10 menit.

## Deployment

Aplikasi berjalan sebagai server Node (`next start`), cocok untuk Railway, Render, Fly.io, VPS, Docker, atau Vercel.

1. Build: `npm ci && npm run build`
2. Start: `npm start` (port dari `PORT`, default 3000)
3. Set environment variable `GOOGLE_AIR_QUALITY_API_KEY`, `FIRMS_MAP_KEY`, dan `PUBLIC_GOOGLE_MAPS_API_KEY` di platform (bukan di repo).

Untuk VPS Niskala, panduan akses `.env` melalui OpenSSH di atas Tailscale dan
pendaftaran public key perangkat baru tersedia di [deploy/ACCESS.md](deploy/ACCESS.md).

## Mengamankan API key di Google Cloud

Key ini hanya dipakai dari server, jadi pembatasannya berbeda dari key untuk browser.

1. **Batasi API**: Google Cloud Console → APIs & Services → Credentials → pilih key → *API restrictions* → *Restrict key* → centang hanya **Air Quality API**.
2. **Batasi aplikasi**: jangan pakai *HTTP referrers* (request datang dari server, bukan browser). Jika server punya IP keluar yang tetap, pakai *IP addresses*. Banyak PaaS (termasuk Railway tanpa static IP) tidak punya IP tetap; dalam kasus itu andalkan pembatasan API dan kuota di bawah.
3. **Batasi kuota**: APIs & Services → Air Quality API → *Quotas & System Limits* → turunkan *requests per minute* ke angka yang wajar untuk trafikmu (misalnya 60–300). Ini rem utama jika endpoint disalahgunakan, karena `/api/air-quality` bisa dipanggil siapa saja yang tahu URL-nya.
4. **Pasang budget alert**: Billing → Budgets & alerts, dengan notifikasi di 50%, 90%, dan 100%.
5. **Rotasi**: jika key bocor, buat key baru, deploy, lalu hapus key lama.

Key Maps JavaScript (`PUBLIC_GOOGLE_MAPS_API_KEY`) memang terlihat di browser, jadi pembatasannya berbeda:

1. *Application restrictions* → **Websites (HTTP referrers)**: isi domain produksi (mis. `https://udara.example.id/*`) dan `http://localhost:3000/*` untuk pengembangan.
2. *API restrictions* → hanya **Maps JavaScript API**. Jangan centang Air Quality API pada key ini; tile heatmap sudah lewat server.
3. Pasang kuota harian untuk *Map loads* agar penyalahgunaan dari domain palsu tetap terbatas.

## Kepatuhan Google

- Atribusi "Google Maps" dan "Source: Includes air quality data from Google" tampil di dalam area data, tidak diterjemahkan (`translate="no"`).
- Data ditampilkan apa adanya. Cache server mengikuti batas Service Specific Terms Air Quality API: kondisi terkini dan prakiraan paling lama 1 jam untuk semua lapisan (55 menit di server plus paling lama 60 detik di Cloudflare), tile heatmap 30 menit (browser hanya boleh menyimpan sisa waktunya). Jika batas di ketentuan Google berubah, sesuaikan `src/lib/config/cache.ts` dan `TILE_TTL_MS` di `src/lib/server/handle-map.ts`.
- Halaman `/privacy` dan `/terms` merujuk ke Kebijakan Privasi Google dan Ketentuan Google Maps. Tinjau ulang isinya sebelum rilis publik, terutama jika alamat penagihan Google Cloud berada di EEA (tautan ketentuannya berbeda).
