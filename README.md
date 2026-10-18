# Niskala

Dashboard kualitas udara dari Google Maps Platform Air Quality API: Universal AQI terkini, kadar polutan, prakiraan 24 jam, riwayat per jam, dan rekomendasi kesehatan. Mencakup 38 provinsi: 109 lokasi, yaitu semua kota di Indonesia, Jakarta, ibu kota provinsi yang berupa kabupaten, dan seluruh 11 kabupaten/kota di Jambi.

- **Pantauan** (`/`): kartu per lokasi dengan gauge AQI, empat polutan utama, dan sparkline prakiraan. Wilayah aktif tersimpan di URL (`?region=jawa-barat`).
- **Detail lokasi** (`/location/[id]`, mis. `/location/bandung`): halaman sendiri berisi gauge, ringkasan 24 jam (terendah, tertinggi, rata-rata, jam terbaik berikutnya), rekomendasi, tren 24 jam terakhir + prakiraan, dan enam polutan. `/location/me` meminta lokasi perangkat di halaman itu sendiri; `/location/point#lat,lng` untuk titik dari peta. Koordinat perangkat tidak pernah masuk URL, dan koordinat titik peta hanya ada di hash sehingga tidak terkirim ke server.
- **Peta** (`/map`): Google Map berpusat di Jambi dengan heatmap Universal AQI dan hotspot NASA FIRMS (VIIRS) 24 jam terakhir. Klik titik mana pun untuk membuka halaman detail kualitas udara di titik itu.
- **Riwayat** (`/history`): tabel per jam (24 atau 72 jam) dengan panel detail untuk jam yang dipilih.

Stack: Next.js 16 (App Router, TypeScript strict), React 19, Tailwind CSS v4, [shadcn/ui](https://ui.shadcn.com) (Radix), Recharts untuk grafik, TanStack Table untuk tabel Riwayat, Motion untuk animasi, ikon Lucide. Tanpa database, tanpa akun. Cuaca, suhu, dan angin tidak ditampilkan karena tidak tersedia di Air Quality API.

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
    api/air-quality/             POST /api/air-quality, /history, /forecast; GET /tiles/[z]/[x]/[y]
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
| `GET /api/air-quality/tiles/z/x/y`| —                                 | `heatmapTiles` UAQI_RED_GREEN |
| `GET /api/fires`                  | —                                 | NASA FIRMS area API (3 satelit VIIRS) |

Tile heatmap diproksikan lewat server agar key Air Quality tidak pernah sampai ke browser. Proksi hanya melayani tile yang bersinggungan dengan Sumatra dan zoom ≤ 14, sehingga tidak bisa dipakai untuk menguras kuota di wilayah lain. Hotspot diambil untuk area Provinsi Jambi plus margin (`FIRE_AREA` di `src/lib/config/map.ts`), 2 hari terakhir dari FIRMS lalu dipangkas ke 24 jam, dan di-cache 10 menit di memori server. Data NASA boleh di-cache, berbeda dengan konten Google.

Server menolak input lain (field tambahan, `hours` selain 24/72, body > 1 KB, content-type selain JSON, request lintas situs), lalu memanggil Google dengan key di header `X-Goog-Api-Key`, timeout 10 detik. Respons divalidasi saat runtime; indeks dipilih berdasarkan `code: "uaqi"`. Semua respons memakai `Cache-Control: no-store`.

Key dibaca dari `process.env` saat request lewat `src/lib/server/env.ts` (ditandai `server-only`, jadi build gagal jika modul itu diimpor dari kode browser). Halaman yang membutuhkan key memanggil `connection()` agar dirender per request, bukan saat build. Ini sudah dicek dengan mencari key di `.next/static` setelah build. Log server hanya mencatat kode error, status/reason Google, dan durasi; tanpa key dan tanpa koordinat.

## Jumlah request ke Google

Setiap request di bawah ditagih per SKU Air Quality API; cek harga dan kuota gratis terbaru di halaman pricing Google Maps Platform.

- Membuka Pantauan: 2 request per lokasi di wilayah aktif (kondisi terkini + prakiraan). Jambi = 22; provinsi lain 2 sampai 18 (Jawa Barat dan Jawa Timur, 9 lokasi). Data kota disimpan di memori browser selama sesi dan dipakai bersama halaman detail, jadi berpindah wilayah atau kembali dari detail tidak memuat ulang; data yang lebih tua dari 30 menit dimuat ulang.
- Membuka halaman detail kota: +1 (history 24 jam), +2 jika data kota itu belum ada di memori. Lokasi perangkat dan titik peta: 3.
- Halaman Riwayat: 1 per pilihan kota/rentang.
- "Perbarui semua": 2 per lokasi di wilayah aktif.
- Halaman Peta: 1 pemuatan peta (SKU Dynamic Maps, Maps JavaScript API) + 1 request per tile heatmap yang terlihat. Menggeser atau zoom memuat tile baru, karena tile tidak di-cache. Klik titik: membuka halaman detail (3 request).
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
- Data ditampilkan apa adanya; tidak ada cache. Jika nanti menambah cache, ikuti batasan caching di perjanjian Google Maps Platform.
- Halaman `/privacy` dan `/terms` merujuk ke Kebijakan Privasi Google dan Ketentuan Google Maps. Tinjau ulang isinya sebelum rilis publik, terutama jika alamat penagihan Google Cloud berada di EEA (tautan ketentuannya berbeda).
