# Bahasa publik dan tipografi Niskala

Tanggal riset: 19 Oktober 2026. Lingkup: pembacaan sumber aplikasi dan sumber primer untuk keputusan bahasa dan tipografi; tanpa pengujian aplikasi atau perubahan kode antarmuka.

## Rekomendasi untuk Niskala

Gunakan bahasa Indonesia yang netral, jelas, dan ringkas di seluruh permukaan publik. Hindari sapaan `kamu`, akhiran `-mu`, dan bentuk akrab `lokasiku`. Sebut objeknya langsung: kota, wilayah pilihan, lokasi perangkat, atau koneksi internet. Gunakan `Anda` hanya jika kalimat membutuhkan pelaku atau kepemilikan yang tidak dapat dijelaskan dengan baik tanpa sapaan.

Untuk tipografi, pertahankan pasangan **Gambetta dan Plus Jakarta Sans** yang sudah ada. Usulan ini mengikuti peran font dalam `AGENTS.md`: Gambetta memberi karakter pada identitas dan judul, sedangkan Plus Jakarta Sans membawa isi, kontrol, dan data. Penilaian bahwa pasangan ini sesuai untuk kesan berkelas adalah pertimbangan desain, bukan hasil pengujian pengguna.

Kesan bernilai perlu didukung informasi yang berguna: kondisi udara, arti angka, waktu data, sumber, keterbatasan, dan tindakan berikutnya. Jangan menambah klaim seperti data selalu akurat atau real-time hanya untuk memperkuat citra.

Arahan ini disetujui untuk diterapkan pada 19 Oktober 2026. Redaksi Indonesia dan Inggris serta peran tipografi bersama telah ditulis ke sumber aplikasi. Penerapan mencakup beranda, peta, riwayat, detail lokasi, artikel, pesan status, header, footer, picker, dan metadata. Font tetap Gambetta dan Plus Jakarta Sans. Tidak ada pengujian, build validasi, typecheck, lint, atau pemeriksaan browser/visual yang dijalankan. Commit dan push tidak dilakukan.

## Temuan dari sumber aplikasi

Pembacaan berikut merupakan inventaris kode pada saat riset, sebelum implementasi. Bagian ini disimpan sebagai dasar keputusan, bukan deskripsi hasil render terbaru.

| Area | Temuan sumber | Implikasi |
| --- | --- | --- |
| Font dan token | `src/app/[lang]/layout.tsx` memuat Plus Jakarta Sans dan Gambetta. `src/app/globals.css:20` memetakan `font-heading` ke sans. | Fondasi sudah membedakan identitas dan informasi operasional; tidak perlu mengganti font untuk memulai. |
| Beranda dan metadata | `src/lib/i18n/dictionaries/id.ts:5` serta `:282` memakai “Kualitas udara di sekitarmu”; lead memakai “lokasimu”. | Judul dan cuplikan pencarian perlu mengikuti nada yang sama. |
| Error dan lokasi | Dictionary yang sama memuat “internetmu”, “kotamu”, “Kamu”, “Mencari lokasimu”, dan “Gunakan lokasiku”. | Penyuntingan harus mencakup status gagal, izin, pencarian, dan loading. |
| Privasi dan Ketentuan | `src/content/privacy/id.tsx` dan `src/content/terms/id.tsx` berulang kali memakai sapaan personal. | Tulis ulang per kalimat sambil mempertahankan fakta aliran data, izin, penyimpanan, dan ketentuan penyedia. |
| Judul halaman | `PageIntro` dan `LegalArticle` memakai `text-4xl` lalu `sm:text-5xl`; hero mencapai `lg:text-6xl`; About memakai `text-5xl` lalu `sm:text-6xl`. | Ada peran display yang sudah jelas. Tetapkan perbedaan ini sebagai peran yang disengaja; tidak semua H1 harus sama besar. |
| Nama lokasi | `src/components/location-detail.tsx:173` memakai 1,75rem pada layar sempit, 2rem mulai 400px, lalu `sm:text-5xl`. | Nama tempat yang panjang perlu pengecualian terkontrol, bukan dipaksa sebesar hero. |
| Saran kesehatan | `src/components/info-blocks.tsx:42` dan `:66` sudah memakai `text-base leading-relaxed`. | Pertahankan keterbacaan ini sebagai acuan paragraf utama di kartu. |
| Teks kecil | Gauge kecil memakai label 10px; sejumlah label grafik dan filter memakai 11px; detail hotspot memakai isi 13px dan metadata 12px. | Jangan menyamakan semuanya dengan paragraf utama. Prioritaskan pembesaran teks yang menyampaikan makna penting; keterbacaan aktual belum diperiksa. |
| Artikel | `LegalArticle` dan halaman About memakai pembatas luar `max-w-3xl`; beberapa paragraf About memakai `max-w-prose`. | Lebar paragraf dapat diberi peran tersendiri, misalnya sekitar 65ch, terpisah dari lebar halaman. Panjang baris aktual belum diukur. |
| Heading komponen | Panel khusus banyak memakai semibold; bawaan `CardTitle`, `DialogTitle`, dan `EmptyTitle` masih medium. | Bedakan peran label/heading secara konsisten. Periksa pemakaian sebelum mengubah primitive karena sebagian sudah diberi override lokal. |
| Sapaan waktu | `dashboard.greetings` terdapat dalam dictionary ID dan EN; pencarian referensi sumber menemukan deklarasinya saja. | Jangan menganggap sapaan pagi/malam sedang tampil berdasarkan keberadaan string saja. |

## Arahan bahasa untuk seluruh halaman

Bahasa formal tidak harus panjang atau penuh istilah birokrasi. Utamakan verba langsung seperti `Pilih`, `Lihat`, `Perbarui`, dan `Coba lagi`. Hindari menambah kata “Anda” jika objek dan tindakannya sudah jelas.

Contoh berikut menjadi acuan redaksi untuk penerapan:

| Konteks | Sebelum perubahan | Redaksi Indonesia | Padanan Inggris |
| --- | --- | --- | --- |
| Judul beranda | Kualitas udara di sekitarmu | Pantauan kualitas udara | Air quality overview |
| Metadata utama | Niskala · Kualitas udara di sekitarmu | Niskala · Pantauan kualitas udara Indonesia | Niskala · Air quality in Indonesia |
| Pengantar beranda | Pilih wilayah atau gunakan lokasimu untuk melihat kondisinya. | Pilih wilayah atau gunakan lokasi perangkat untuk melihat kualitas udara. | Select a region or use the device location to view air quality. |
| Tombol geolokasi | Gunakan lokasiku / Gunakan lokasi saya | Gunakan lokasi perangkat | Use device location |
| Nama lokasi geolokasi | Lokasi saya | Lokasi perangkat | Device location |
| Status geolokasi | Mencari lokasimu… | Menentukan lokasi perangkat… | Finding device location… |
| Izin ditolak | Izin lokasi ditolak. Kamu tetap bisa memilih kota dari daftar. | Izin lokasi ditolak. Pilih kota dari daftar untuk melanjutkan. | Location access denied. Select a city from the list to continue. |
| Error jaringan | Periksa koneksi internetmu, lalu coba lagi. | Periksa koneksi internet, lalu coba lagi. | Check the internet connection, then try again. |
| Error peta | Periksa koneksi internetmu, lalu muat ulang halaman. | Periksa koneksi internet, lalu muat ulang halaman. | Check the internet connection, then reload the page. |
| Halaman tidak ditemukan | …melihat kualitas udara di kotamu. | Alamat ini tidak tersedia. Periksa tautan atau buka Pantauan untuk memilih lokasi. | This address is not available. Check the link or open Overview to select a location. |
| Heading Privasi | Yang disimpan di perangkatmu | Penyimpanan pada perangkat | Storage on the device |

`Gunakan lokasi saya` sebenarnya masih dapat diterima sebagai tombol dari sudut pandang pengguna. Usulan `Gunakan lokasi perangkat` dipilih agar istilah fungsi dan penjelasan privasi sama, bukan karena kata `saya` salah atau tidak resmi.

Untuk artikel Privasi, pertahankan pelaku pemrosesan secara eksplisit. Contoh: “Setelah tombol ‘Gunakan lokasi perangkat’ dipilih, browser meminta izin akses lokasi. Koordinat perangkat kemudian dibulatkan menjadi sekitar 100 meter sebelum dikirim.” Jangan menghilangkan informasi izin demi memendekkan kalimat.

Lingkup penyuntingan mencakup `/`, `/map`, `/history`, `/location/[id]`, `/location/me`, `/location/point`, `/about`, `/privacy`, `/terms`, halaman tidak ditemukan dan gagal, serta header, footer, pencarian, picker, filter, pesan loading, metadata, dan teks aksesibilitas. Untuk ID dan EN, selaraskan makna dan tingkat formalitas; tidak perlu memaksakan susunan kata yang sama. Kata yang berakhir dengan huruf `mu` tidak boleh dipotong otomatis tanpa membaca konteks. Redaksi sumber eksternal, atribusi, dan lisensi penyedia tidak termasuk penyuntingan nada aplikasi.

## Usulan sistem tipografi

Nilai berikut merupakan titik awal desain yang mengikuti batas proyek, bukan angka yang telah diuji. Ukuran ditulis dalam rem; ekuivalen piksel hanya berlaku jika ukuran dasar browser 16px.

| Peran | Font | Ukuran usulan | Ketebalan dan jarak baris |
| --- | --- | --- | --- |
| Hero beranda | Gambetta | 2,25 → 3 → 3,75rem sesuai breakpoint | 400; line-height 1,1 |
| Judul halaman umum | Gambetta | 2,25 → 3rem | 400; line-height 1,1 |
| Judul editorial About | Gambetta | 3 → 3,75rem, mempertahankan peran editorial yang ada | 400; line-height 1,1 |
| Nama tempat panjang | Gambetta | 1,75 → 2 → 3rem sesuai ruang | 400; line-height 1,1; izinkan pembungkusan |
| Judul bagian | Plus Jakarta Sans | 1,25–1,5rem | 600; line-height 1,3–1,4 |
| Judul panel/kartu | Plus Jakarta Sans | 1,125rem | 600; line-height 1,35 |
| Isi utama dan saran kesehatan | Plus Jakarta Sans | 1rem; pengantar tertentu 1,125rem | 400; line-height 1,5–1,65 |
| Kontrol, label dan metadata | Plus Jakarta Sans | 0,875–1rem menurut peran | 400–600 menurut fungsi; hindari bobot berbeda untuk peran yang sama |
| Angka pembanding | Plus Jakarta Sans | Sesuai ruang dan prioritas; pertahankan skala gauge per ukuran | 600–700; `tabular-nums` |

Aturan penggunaan:

- Batasi Gambetta pada branding, hero, judul halaman, copy identitas footer, serta kode error dekoratif sesuai `AGENTS.md`. Informasi polutan, timestamp, tabel, picker, dan kontrol tetap sans.
- Gunakan paragraph measure sekitar 60–70ch pada layar yang cukup lebar. Pada mobile, ikuti ruang yang tersedia; jangan menetapkan lebar minimum 60ch. `ch` mengacu pada lebar glyph angka nol, sehingga bukan hitungan karakter aktual yang pasti.
- Rata kiri untuk isi panjang. Ratakan angka yang dibandingkan menurut struktur tabel; tidak perlu semua konten ditaruh di tengah.
- Pertahankan tracking normal pada body dan kontrol. Tracking rapat pada judul display digunakan terbatas; singkatan seperti AQI tetap boleh kapital.
- Utamakan ukuran, ketebalan, dan jarak untuk hierarki. Jangan mengandalkan teks yang semakin pucat untuk setiap tingkat sekunder.
- Kelompokkan nilai sebagai peran bersama: display, page title, section title, panel title, body, label, metadata, metric. Gunakan skala rem yang ada dan breakpoint yang terbatas; hindari ukuran baru untuk tiap halaman.
- Keterangan pendek khusus boleh lebih kecil daripada body. Teks petunjuk, arti skala AQI/ISPU, status data, dan saran kesehatan perlu prioritas keterbacaan karena membantu pengambilan keputusan.
- Teks dan tautan atribusi penyedia tetap harus terbaca. Jangan mengubah kata, logo, atau perlakuan atribusi berdasarkan saran estetika saja.

Urutan penerapan yang disarankan: redaksi lintas halaman dan metadata, konsistensi istilah ID/EN, peran tipografi bersama, lalu penyesuaian teks kecil yang penting. Font baru belum menjadi kebutuhan yang ditunjukkan oleh pembacaan sumber ini.

## Kesimpulan yang didukung sumber

Menghindari sapaan `-mu` masuk akal sebagai pilihan nada Niskala yang lebih netral. Namun, sumber yang dibaca tidak menetapkan bahwa layanan publik harus menghindari sapaan langsung. Kesan berkelas merupakan penilaian desain; sumber di bawah lebih kuat mendukung keterbacaan, konsistensi, kejelasan, dan kemudahan penggunaan.

## 1. EYD V: bentuk `-mu` sah secara ejaan

Sumber: [Badan Bahasa — Kata ganti ku-, kau-, -ku, -mu, dan -nya](https://ejaan.kemendikdasmen.go.id/eyd/penulisan-kata/kata-ganti/).

- Pedoman mengatur bahwa `-ku`, `-mu`, dan `-nya` ditulis serangkai dengan kata sebelumnya.
- Halaman ini mengatur ejaan, bukan tingkat keformalan atau kesesuaian nada merek.
- Implikasi: jangan menyebut `kotamu` atau `lokasimu` sebagai bentuk salah/bukan bahasa baku berdasarkan pedoman ini. Pengganti seperti `kota`, `lokasi saat ini`, atau nama kota merupakan keputusan editorial menurut konteks.

## 2. GOV.UK: berwibawa tetap jelas dan manusiawi

Sumber: [GOV.UK — Use the right tone](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/right-tone/).

- Pedoman meminta bahasa spesifik, informatif, ringkas, serius tanpa dibuat megah, dan tetap manusiawi.
- Pedoman justru menganjurkan sapaan langsung `you` bila memungkinkan.
- Implikasi: nada resmi tidak mengharuskan kalimat impersonal, pasif, panjang, atau penuh istilah birokrasi.
- Batas: pedoman bahasa Inggris tidak menentukan nuansa sosial `kamu`, `-mu`, atau `Anda` dalam bahasa Indonesia. Menghindari `-mu` di Niskala adalah pilihan ragam bahasa, bukan terjemahan langsung aturan GOV.UK.

## 3. USWDS: keterbacaan ditentukan sistem penataan huruf

Sumber: [U.S. Web Design System — Typography](https://designsystem.digital.gov/components/typography/).

- Anjuran praktis: kebanyakan teks memakai ukuran efektif minimal 16px; teks lebih kecil digunakan seperlunya untuk keterangan pendamping atau unsur khusus.
- Untuk teks panjang, kisaran baris 45–90 karakter dengan sasaran 66 karakter; paragraf panjang memakai line-height minimal 1,5. Judul pendek dapat lebih rapat.
- Rata kiri memberi titik awal baris yang konsisten. Huruf sans yang netral sesuai untuk antarmuka; serif/sans bukan pembagian mutlak.
- Gunakan tebal, miring, dan kapital penuh secara terbatas. Spasi memperjelas hubungan: judul lebih dekat pada isi yang diperkenalkannya.
- Implikasi Niskala: pertahankan teks utama dan saran kesehatan 1rem, leading 1,5–1,65, paragraf terukur, dan hierarki konsisten. Arah ini sejalan dengan aturan repositori yang sudah ada; tidak membutuhkan font tambahan.
- Batas: ukuran dan rentang ini adalah rekomendasi desain USWDS, bukan semua persyaratan WCAG.

## 4. GOV.UK: gunakan skala dan gaya yang sudah ada

Sumber: [GOV.UK Design System — Type scale](https://design-system.service.gov.uk/styles/type-scale/).

- Sistem menghubungkan ukuran huruf dan line-height dalam skala bersama; komponen baru dimulai dari gaya tipografi yang tersedia.
- Satuan relatif membantu teks mengikuti pembesaran. Skala memiliki perilaku responsif.
- Implikasi: lebih bernilai merapikan peran judul, subjudul, isi, label, metadata, dan angka daripada menambah variasi ukuran per halaman.
- Batas: skala angka GOV.UK adalah keputusan sistem mereka; tidak perlu disalin mentah ke Niskala.

## 5. WCAG 2.2: kontras minimum merupakan kriteria aksesibilitas

Sumber: [W3C — Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

- Level AA menetapkan kontras minimal 4,5:1 untuk teks biasa, dan 3:1 untuk teks besar sesuai definisi WCAG; terdapat pengecualian yang dijelaskan dalam kriteria.
- Font yang sangat tipis dapat terlihat lebih samar meskipun warna secara numerik memenuhi ambang.
- Implikasi: tampilan tenang tidak sebaiknya bergantung pada teks kecil, tipis, dan terlalu pucat. Metadata tetap membawa informasi.
- Batas: ini adalah kriteria aksesibilitas, bukan formula untuk tampilan mewah. Tidak ada pemeriksaan kontras aplikasi dalam riset ini.

## 6. WCAG 2.2: teks harus dapat menerima pengaturan spasi pengguna

Sumber: [W3C — Understanding SC 1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html).

- Level AA meminta tidak ada kehilangan isi/fungsi saat pengguna menerapkan line-height 1,5; jarak setelah paragraf 2 kali ukuran huruf; letter-spacing 0,12 kali; dan word-spacing 0,16 kali, bersamaan.
- Nilai tersebut bukan kewajiban gaya bawaan. Kriterianya adalah kemampuan isi beradaptasi pada pengaturan pengguna.
- Implikasi: tinggi komponen dan pemotongan teks tidak boleh diasumsikan selalu aman hanya karena tampilan bawaan ringkas.
- Batas: sumber ini tidak menetapkan 16px sebagai ukuran font minimum WCAG. Tidak ada pengujian pengaturan spasi aplikasi dalam riset ini.

Pembedaan level: [SC 1.4.8 Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html) berada di **AAA**, bukan AA. Kriterianya mencakup tersedianya mekanisme untuk mencapai lebar blok maksimal 80 karakter (40 untuk CJK), tanpa rata kiri-kanan, serta pengaturan tampilan lainnya. Angka 80 karakter tersebut jangan dilaporkan sebagai kewajiban AA atau disamakan dengan rentang rekomendasi USWDS. Mekanisme dapat berasal dari browser; nilai itu tidak semuanya harus menjadi gaya bawaan.

## Arah editorial dan visual yang dapat dipakai

Berikut rekomendasi desain untuk Niskala, bukan klaim universal dari sumber:

- Pakai nama objek dan tindakan langsung: `Kualitas udara kota`, `Pilih kota`, `Gunakan lokasi saat ini`, `Lokasi tersimpan`.
- Jika kepemilikan atau izin perlu jelas, `Anda` dapat digunakan seperlunya. Hindari mengganti setiap `-mu` secara mekanis; `lokasimu` dapat berarti koordinat perangkat, lokasi pilihan, atau lokasi tersimpan.
- Pertahankan Gambetta pada peran identitas dan judul halaman sesuai aturan proyek; Plus Jakarta Sans untuk operasi dan isi. Gunakan semibold secukupnya, angka tabular untuk perbandingan data, dan skala rem yang sudah tersedia.
- Utamakan informasi konkret: lokasi, waktu pembaruan, satuan, sumber, status data, dan tindakan yang bisa dilakukan. Bahasa agung atau font baru sendiri tidak membuktikan nilai layanan.

Semua sumber diakses untuk riset pada tanggal di atas. Dokumen ini tidak menyatakan bahwa tampilan atau perilaku Niskala telah diuji atau diverifikasi.
