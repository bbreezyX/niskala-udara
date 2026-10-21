// Placeholders in {braces} are filled by `fill`/`plural`. Entries with `one`/`other` are counts:
// Indonesian has no plural, so both forms match; English picks one by Intl plural rules.
// Titles and short labels use Title Case, with function words lowercase inside titles.
// Descriptions, advice, placeholders and measurement units keep sentence case.
export const id = {
	meta: {
		title: 'Niskala · Pantauan Kualitas Udara Indonesia',
		description:
			'Pantau kualitas udara terkini, kadar polutan, prakiraan, dan rekomendasi kesehatan di kota-kota Indonesia.'
	},
	skipToContent: 'Lewati ke Konten',
	nav: {
		label: 'Navigasi utama',
		brandHome: 'Niskala, beranda',
		home: 'Pantauan',
		map: 'Peta',
		history: 'Riwayat'
	},
	search: {
		label: 'Cari Kota',
		placeholder: 'Cari kota atau kabupaten…',
		inputLabel: 'Cari kota pantauan',
		open: 'Cari Kota (Ctrl K)',
		close: 'Tutup Pencarian',
		empty: 'Kota tidak ditemukan. Hanya kota pantauan yang tersedia.',
		locationGroup: 'Lokasi',
		myLocation: 'Lokasi Perangkat',
		// Search aliases also recognise the familiar first-person wording.
		myLocationKeywords: ['perangkat', 'sekitar', 'saya', 'terdekat']
	},
	languageSwitch: { switchTo: 'Ganti ke {name}' },
	install: {
		shortcut: 'Pasang',
		action: 'Pasang Niskala',
		installing: 'Memasang…',
		title: 'Pasang Niskala',
		description: 'Tambahkan Niskala ke layar utama untuk membukanya dalam tampilan aplikasi.',
		close: 'Tutup Panduan Instalasi',
		androidTitle: 'Android · Chrome',
		androidStep1: 'Buka menu tiga titik (⋮) di Chrome.',
		androidStep2: 'Pilih Instal dan Buat Pintasan, lalu Instal. Nama menu bisa juga berupa Instal Aplikasi atau Tambahkan ke Layar Utama.',
		androidStep3: 'Konfirmasi dengan Instal atau Tambahkan untuk menyimpan ikon Niskala.',
		iphoneTitle: 'iPhone dan iPad · Safari',
		iphoneStep1: 'Buka menu Safari, lalu ketuk Bagikan.',
		iphoneStep2: 'Pilih Tambah ke Layar Utama. Jika tersedia, aktifkan Buka sebagai App Web.',
		iphoneStep3: 'Ketuk Tambah. Buka Niskala melalui ikon di layar utama.',
		browserHint: 'Jika menu instalasi tidak muncul, buka situs ini langsung di Chrome atau Safari. Koneksi internet tetap diperlukan untuk mengambil data.'
	},
	footer: {
		// Keep the two sentences separate while allowing the name to use italic type.
		taglineLead: 'Udara itu',
		taglineAfterName: '.',
		taglineClosing: 'Kami membuatnya terbaca.',
		pages: 'Halaman',
		information: 'Informasi',
		about: 'Tentang',
		privacy: 'Privasi',
		terms: 'Ketentuan Penggunaan',
		dataSources: 'Sumber Data',
		airQualitySource: 'Kualitas Udara: Google Air Quality API',
		ispuSource: 'ISPU Stasiun:',
		hotspotSource: 'Hotspot:',
		windSource: 'Angin:'
	},
	pages: {
		map: {
			title: 'Peta',
			heading: 'Peta Kualitas Udara dan Hotspot',
			description: 'Peta kualitas udara (Universal AQI), hotspot kebakaran 24 jam, dan arah angin di seluruh Indonesia.'
		},
		history: {
			title: 'Riwayat',
			heading: 'Riwayat Kualitas Udara',
			description: 'Riwayat kualitas udara per jam untuk kota-kota pantauan.'
		},
		about: { title: 'Tentang', description: 'Apa itu Niskala, cara membaca Universal AQI, sumber data, dan batasannya.' },
		privacy: { title: 'Privasi', heading: 'Kebijakan Privasi' },
		terms: { title: 'Ketentuan Penggunaan', heading: 'Ketentuan Penggunaan' },
		locationMe: { title: 'Lokasi Perangkat' },
		locationPoint: { title: 'Titik di Peta' },
		city: { description: 'Kualitas udara terkini, tren 24 jam, prakiraan, dan kadar polutan di {name}.' }
	},
	legal: {
		updated: 'Terakhir diperbarui: {date}',
		// Only translations carry a note; the Indonesian original needs none.
		translationNote: ''
	},
	common: {
		refresh: 'Perbarui',
		refreshing: 'Memperbarui…',
		retry: 'Coba Lagi',
		notAvailable: 'Belum Tersedia',
		dataNotAvailable: 'Data Belum Tersedia',
		loadingPlace: 'Memuat data {name}',
		locations: { one: '{n} lokasi', other: '{n} lokasi' },
		scale: 'Skala 0–100, semakin tinggi semakin baik.',
		scaleIspu: 'AQI 0–100, semakin tinggi semakin baik. ISPU sebaliknya, semakin tinggi semakin buruk.',
		howToRead: 'Cara Membaca AQI',
		dominantPollutant: 'Polutan Dominan',
		backToOverview: 'Kembali ke Pantauan',
		backToMap: 'Kembali ke Peta',
		forecast: 'Prakiraan'
	},
	aqi: {
		bands: { poor: 'Buruk', low: 'Rendah', moderate: 'Sedang', good: 'Baik', excellent: 'Sangat Baik' },
		gauge: 'AQI {value} dari 100',
		categories: 'Kategori'
	},
	ispu: {
		label: 'ISPU',
		spoken: 'ISPU {value}, {category}',
		atLeast: '≥ {value}',
		bands: {
			good: 'Baik',
			moderate: 'Sedang',
			unhealthy: 'Tidak Sehat',
			veryUnhealthy: 'Sangat Tidak Sehat',
			hazardous: 'Berbahaya'
		},
		sourceStation: 'ISPU dari stasiun KLH/BPLH {name}, {time}.',
		sourceModel: 'ISPU dihitung Google dari data model; belum ada stasiun KLH/BPLH aktif untuk lokasi ini.',
		direction: 'Semakin tinggi semakin buruk.'
	},
	health: {
		title: 'Rekomendasi Kesehatan',
		groupsLabel: 'Saran untuk Kelompok',
		groups: {
			generalPopulation: 'Umum',
			children: 'Anak',
			elderly: 'Lansia',
			pregnantWomen: 'Ibu Hamil',
			lungDiseasePopulation: 'Penyakit Paru',
			heartDiseasePopulation: 'Penyakit Jantung',
			athletes: 'Atlet'
		},
		/** One line to act on, by UAQI band (0 = worst). Google's own advice follows it verbatim. */
		headlines: [
			'Sebaiknya tetap di dalam ruangan',
			'Kurangi aktivitas berat di luar ruangan',
			'Kelompok sensitif perlu berhati-hati',
			'Aman untuk beraktivitas di luar ruangan',
			'Udara bersih, nikmati aktivitas di luar'
		],
		missing: 'Saran lengkap belum tersedia untuk lokasi ini.'
	},
	pollutants: {
		/** Plain-language explanations for readers who do not know the pollutant codes. */
		info: {
			pm25: {
				name: 'Partikel Halus',
				about: 'Debu sangat halus, lebih kecil dari 2,5 mikrometer, sekitar 1/30 tebal rambut. Bisa masuk dalam ke paru-paru hingga aliran darah.',
				sources: 'Asap kebakaran hutan dan lahan, kendaraan, pembakaran sampah.'
			},
			pm10: {
				name: 'Partikel Kasar',
				about: 'Debu berukuran sampai 10 mikrometer. Tertahan di hidung dan saluran napas atas, bisa memicu batuk dan iritasi.',
				sources: 'Debu jalan, konstruksi, asap pembakaran.'
			},
			no2: {
				name: 'Nitrogen Dioksida',
				about: 'Gas dari pembakaran bahan bakar. Mengiritasi saluran napas, terutama bagi penderita asma.',
				sources: 'Kendaraan bermotor, pembangkit listrik, industri.'
			},
			o3: {
				name: 'Ozon Permukaan',
				about: 'Gas yang terbentuk saat polutan lain bereaksi di bawah sinar matahari, biasanya naik di siang hari. Bisa membuat dada terasa sesak.',
				sources: 'Asap kendaraan dan industri yang bereaksi dengan sinar matahari.'
			},
			so2: {
				name: 'Sulfur Dioksida',
				about: 'Gas berbau tajam dari pembakaran bahan bakar yang mengandung belerang. Mengiritasi mata dan saluran napas.',
				sources: 'Pembangkit listrik batu bara, industri, gunung api.'
			},
			co: {
				name: 'Karbon Monoksida',
				about: 'Gas tak berwarna dan tak berbau dari pembakaran yang tidak sempurna. Mengurangi kemampuan darah membawa oksigen.',
				sources: 'Kendaraan, kebakaran, genset dan kompor.'
			}
		},
		units: {
			MICROGRAMS_PER_CUBIC_METER: 'mikrogram per meter kubik udara',
			PARTS_PER_BILLION: 'bagian per miliar bagian udara'
		} as Record<string, string>,
		commonSources: 'Sumber umum: ',
		levels: 'Kadar Polutan',
		levelsLatest: 'Pada jam data terakhir, dibanding pedoman WHO',
		levelsThisHour: 'Kadar Polutan pada Jam Ini',
		main: 'Polutan Utama',
		timesWho: '{ratio} pedoman WHO',
		belowWho: 'Di bawah pedoman WHO',
		whoSuffix: ' pedoman WHO',
		whoNote: 'Garis tegak = pedoman WHO 2021 (rata-rata 24 jam; O₃ 8 jam). Angka di sini per jam, jadi perbandingannya indikatif.'
	},
	// Full-page states: a URL with no page behind it, and a page that failed to render.
	errorPage: {
		notFound: {
			title: 'Halaman Tidak Ditemukan',
			description: 'Alamat ini tidak tersedia. Periksa tautan atau buka Pantauan untuk memilih lokasi.'
		},
		failed: {
			title: 'Halaman Gagal Dimuat',
			description: 'Terjadi gangguan saat memuat halaman ini. Coba lagi atau tunggu beberapa menit.'
		}
	},
	errors: {
		not_configured: {
			title: 'Sumber Data Belum Dikonfigurasi',
			description: 'Server belum memiliki kunci akses ke data kualitas udara, jadi belum ada angka yang bisa ditampilkan.'
		},
		not_authorized: {
			title: 'Akses ke Sumber Data Ditolak',
			description: 'Server tidak diizinkan mengambil data kualitas udara saat ini.'
		},
		quota_exceeded: {
			title: 'Batas Permintaan Tercapai',
			description: 'Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa saat lagi.'
		},
		location_unsupported: {
			title: 'Lokasi Belum Didukung',
			description: 'Data kualitas udara tidak tersedia untuk lokasi ini. Coba pilih kota lain.'
		},
		no_data: {
			title: 'Data Belum Tersedia',
			description: 'Sumber data tidak mengirim nilai kualitas udara untuk lokasi ini.'
		},
		timeout: {
			title: 'Waktu Permintaan Habis',
			description: 'Sumber data terlalu lama merespons.'
		},
		upstream_error: {
			title: 'Data Gagal Dimuat',
			description: 'Terjadi gangguan saat mengambil data kualitas udara.'
		},
		invalid_request: {
			title: 'Permintaan Tidak Valid',
			description: 'Lokasi yang dikirim tidak dapat diproses.'
		},
		network: {
			title: 'Tidak Dapat Terhubung',
			description: 'Periksa koneksi internet, lalu coba lagi.'
		}
	},
	location: {
		lastData: 'Data Terakhir',
		next24: '24 Jam ke Depan',
		bestPin: 'Terbaik {hour}, AQI {aqi}',
		bestSpoken: 'Terbaik {detail}',
		plannerHint: 'Arahkan, ketuk, atau geser pita untuk melihat AQI tiap jam.',
		plannerMissing: 'Prakiraan per jam belum tersedia untuk lokasi ini.',
		trendTitle: 'Tren 48 Jam',
		trendDescription: '24 jam terakhir dan prakiraan 24 jam ke depan, waktu {zone}',
		recorded: 'Tercatat',
		trendLabel: 'Tren AQI {name}, 24 jam terakhir dan prakiraan 24 jam',
		trendMissing: 'Tren belum tersedia untuk lokasi ini.',
		low24: 'Terendah 24 Jam',
		high24: 'Tertinggi 24 Jam',
		average24: 'Rata-Rata 24 Jam',
		fromHours: { one: 'dari {n} jam data', other: 'dari {n} jam data' },
		relatedTitle: 'Lokasi Lain di {region}',
		thisArea: 'Wilayah Ini',
		relatedOrder: 'Urut dari udara terbaik',
		thisPage: 'halaman ini',
		notLoaded: 'Belum Dimuat',
		relatedNote: 'Angka tampil untuk lokasi yang sudah dimuat di Pantauan, tanpa permintaan data baru.'
	},
	device: {
		name: 'Lokasi Perangkat',
		note: 'Berdasarkan lokasi perangkat, dibulatkan sekitar 100 m',
		unsupported: 'Browser ini tidak mendukung lokasi perangkat. Pilih kota dari daftar.',
		denied: 'Izin lokasi ditolak. Pilih kota dari daftar untuk melanjutkan.',
		notFound: 'Lokasi tidak dapat ditemukan. Coba lagi atau pilih kota dari daftar.',
		errorTitle: 'Lokasi Belum Tersedia',
		pickCity: 'Pilih Kota',
		locating: 'Menentukan Lokasi Perangkat…',
		locatingHint: 'Izinkan akses lokasi di browser. Koordinat dibulatkan sekitar 100 meter sebelum dikirim.'
	},
	point: {
		name: 'Titik Pilihan',
		invalidTitle: 'Titik Tidak Valid',
		invalidDescription: 'Pilih titik langsung di peta untuk melihat kualitas udaranya.',
		openMap: 'Buka Peta'
	},
	card: {
		forecast24: 'Prakiraan 24 Jam',
		forecastLabel: 'Prakiraan AQI 24 jam untuk {name}',
		forecastMissing: 'Prakiraan Belum Tersedia',
		dataAt: 'Data {time}'
	},
	chart: {
		summary: '{label}. Terendah {min}, tertinggi {max}.',
		now: 'Sekarang',
		forecastSuffix: ' · prakiraan'
	},
	dashboard: {
		greetings: {
			morning: 'Selamat pagi',
			midday: 'Selamat siang',
			afternoon: 'Selamat sore',
			evening: 'Selamat malam',
			neutral: 'Halo'
		},
		heading: 'Pantauan Kualitas Udara',
		lead: 'Pilih wilayah atau gunakan lokasi perangkat untuk melihat kualitas udara.',
		useMyLocation: 'Gunakan Lokasi Perangkat',
		overviewPrefix: 'Pantauan, ',
		dataAt: 'Data {time}',
		refreshData: 'Perbarui',
		refreshingData: 'Memperbarui…',
		listLabel: 'Daftar lokasi pantauan',
		emptyTitle: 'Tidak Ada Lokasi di Kategori Ini',
		emptyDescription: 'Pilih kategori AQI lain atau atur ulang filter untuk melihat semua lokasi.',
		resetFilter: 'Atur Ulang Filter',
		hidden: { one: '{n} lokasi disembunyikan oleh filter.', other: '{n} lokasi disembunyikan oleh filter.' },
		showAll: 'Tampilkan Semua',
		loading: { one: 'Memuat data {n} lokasi.', other: 'Memuat data {n} lokasi.' },
		loaded: { one: 'Data {n} lokasi dimuat.', other: 'Data {n} lokasi dimuat.' }
	},
	spread: {
		label: 'Sebaran kategori AQI',
		segment: '{band}: {count}',
		showAll: 'Tampilkan semua kategori',
		showOnly: 'Tampilkan kategori ini saja',
		worst: ' · {n} {band}'
	},
	filter: {
		trigger: 'Filter',
		active: '(aktif)',
		title: 'Filter Kualitas Udara',
		hint: 'Ketuk satu atau beberapa kategori.',
		bandsLabel: 'Kategori AQI',
		bandOption: '{band}, AQI {min} sampai {max}, {count}',
		sort: 'Urutkan',
		sorts: {
			default: { label: 'Bawaan', description: 'Urutan bawaan, seperti daftar wilayah.' },
			best: { label: 'Terbaik', description: 'Urutkan dari AQI tertinggi: kualitas udara terbaik di atas.' },
			worst: { label: 'Terburuk', description: 'Urutkan dari AQI terendah: kualitas udara terburuk di atas.' },
			name: { label: 'A–Z', description: 'Nama kota dari A sampai Z.' }
		},
		pending: {
			one: '{n} lokasi yang datanya belum termuat tetap ditampilkan.',
			other: '{n} lokasi yang datanya belum termuat tetap ditampilkan.'
		},
		reset: 'Atur Ulang',
		pickOne: 'Pilih Minimal Satu',
		apply: { one: 'Tampilkan {n} Lokasi', other: 'Tampilkan {n} Lokasi' }
	},
	cityPicker: {
		trigger: 'Kota: {name}. Ganti kota',
		placeholder: 'Cari kota, kabupaten, atau provinsi…',
		empty: 'Kota tidak ditemukan.',
		nearest: 'Terdekat',
		locating: 'Menentukan Lokasi Perangkat…',
		denied: 'Izin lokasi ditolak di browser',
		useMine: 'Gunakan Lokasi Perangkat',
		useMineKeywords: ['lokasi', 'perangkat', 'terdekat', 'dekat', 'saya']
	},
	regionPicker: {
		trigger: 'Wilayah: {name}. Ganti wilayah',
		placeholder: 'Cari provinsi atau kota…',
		empty: 'Wilayah tidak ditemukan.',
		selected: ' (dipilih)'
	},
	history: {
		rangeLabel: 'Rentang Waktu',
		rangeOption: '{n} jam',
		meta: '{name} · {from} – {to} {zone}',
		latest: 'Data terakhir {time}',
		caption: 'Kualitas udara per jam di {name}, terbaru di atas.',
		columns: { hour: 'Jam', aqi: 'AQI', category: 'Kategori', pollutant: 'Polutan' },
		trendLabel: 'Tren AQI {name}, {n} jam terakhir',
		showHour: 'Lihat detail {time}',
		hours: { one: '{n} jam', other: '{n} jam' },
		summary: {
			average: 'Rata-Rata {n} Jam Terakhir',
			verdict: '{band} di {count} dari {total} jam.',
			ceiling: 'Belum sekali pun mencapai {band}.',
			peak: 'Sempat {band} pada {time}.',
			waffle: 'Satu kotak satu jam, diurutkan per kategori'
		},
		chart: {
			title: 'Naik Turun per Jam',
			note: 'Pita latar menandai kategori. Garis terputus berarti jam itu tanpa data.',
			worst: 'Terpekat',
			best: 'Terbersih',
			latest: 'Terakhir'
		},
		pattern: {
			title: 'Pola Harian',
			lead: 'Rata-rata tiap jam selama {n} jam terakhir.',
			tendency: 'Udara cenderung paling bersih {best} dan paling pekat {worst}.',
			cleanest: 'Paling Bersih',
			dirtiest: 'Paling Pekat',
			average: 'rata-rata {avg} · {band}',
			none: 'Belum ada pola jam yang jelas di rentang ini.',
			needDays: 'Pola harian butuh data minimal dua hari. Pilih 72 jam untuk melihatnya.',
			parts: { night: 'dini hari', morning: 'pagi', midday: 'siang', afternoon: 'sore', evening: 'malam' }
		},
		dominant: {
			title: 'Polutan Dominan',
			share: 'Paling menentukan AQI di {count} dari {total} jam.'
		},
		days: { title: 'Per Hari', average: 'rata-rata' },
		hour: {
			latest: 'Jam Terakhir',
			picked: 'Jam Terpilih',
			hint: 'Pilih titik di grafik atau baris di tabel untuk jam lain.',
			back: 'Kembali ke Jam Terakhir'
		},
		table: { summary: 'Semua Jam dalam Tabel ({n})', show: 'Lihat', noData: 'Tidak Ada Data' }
	},
	map: {
		unconfigured: {
			title: 'Peta Belum Dikonfigurasi',
			description: 'Key Google Maps untuk browser belum dipasang di server, jadi peta belum bisa ditampilkan.'
		},
		auth: {
			title: 'Google Maps Menolak Key',
			description: 'Pastikan Maps JavaScript API aktif dan domain ini diizinkan di pembatasan key.'
		},
		network: { title: 'Peta Gagal Dimuat', description: 'Periksa koneksi internet, lalu muat ulang halaman.' },
		regionLabel: 'Peta kualitas udara, hotspot, dan angin',
		firesTitle: 'Hotspot di Indonesia, {n} Jam',
		firesUnconfigured: 'Data hotspot belum dikonfigurasi di server.',
		detections: { one: 'deteksi', other: 'deteksi' },
		confidence: { high: 'Keyakinan Tinggi', nominal: 'Keyakinan Sedang', low: 'Keyakinan Rendah' },
		legend: {
			intensity: 'Intensitas Panas',
			sizes: { small: 'Kecil, < {max} MW', medium: 'Sedang, {min}–{max} MW', large: 'Besar, ≥ {min} MW' },
			age: 'Umur Deteksi',
			ageRange: '{min}–{max} jam',
			showLow: 'Tampilkan Keyakinan Rendah ({n})',
			lowNote: 'Biasanya pantulan sinar matahari atau sinyal panas lemah.'
		},
		lastDetected: 'Terakhir terdeteksi {time}. ',
		updated: 'Diperbarui {time}.',
		missingSources: 'Sebagian satelit belum tersedia, jumlah bisa lebih rendah.',
		firesFailed: 'Data hotspot gagal dimuat.',
		layers: 'Lapisan Peta',
		airQuality: 'Kualitas Udara',
		scaleLow: '0, buruk',
		scaleHigh: '100, sangat baik',
		hotspots: 'Titik Hotspot',
		wind: 'Angin',
		windCentre: 'Tengah peta: {speed} km/j, bertiup ke {toward}',
		windCalm: 'Tengah peta: angin tenang',
		windLegend: 'Garis menunjukkan arah angin 10 m di atas tanah. Semakin pekat, semakin kencang.',
		windValid: 'Prakiraan model untuk pukul {time}.',
		windFailed: 'Data angin gagal dimuat.',
		stations: {
			title: 'ISPU Stasiun KLH/BPLH',
			scaleLow: '0, baik',
			scaleHigh: '≥ 300, berbahaya',
			count: { one: '{n} stasiun melapor dalam 3 jam terakhir.', other: '{n} stasiun melapor dalam 3 jam terakhir.' },
			missing: 'Sebagian provinsi gagal dimuat, jumlah bisa lebih rendah.',
			failed: 'ISPU stasiun gagal dimuat.',
			critical: 'Parameter Kritis',
			marker: 'Stasiun {name}: ISPU {value}, {category}'
		},
		compass: ['utara', 'timur laut', 'timur', 'tenggara', 'selatan', 'barat daya', 'barat', 'barat laut'],
		checkCenter: 'Lihat AQI di Tengah Peta',
		clickHint: 'Atau klik titik mana pun di peta.',
		about: 'Tentang Data Ini',
		aboutText:
			'Hotspot adalah anomali panas dari satelit, belum tentu kebakaran. Awan atau asap tebal bisa menutupi titik api. Warna peta adalah perkiraan model per 500 m, bukan hasil alat ukur. Angin adalah prakiraan model cuaca (ECMWF, ICON, GFS) dengan jarak titik sekitar 165 km, jadi angin lokal seperti angin laut tidak terlihat.',
		hotspotSource: 'Hotspot:',
		windSource: 'Angin:',
		card: {
			title: 'Titik Hotspot',
			satellite: 'Satelit',
			intensity: 'Intensitas Panas',
			check: 'Lihat Kualitas Udara'
		}
	}
};

export type Dictionary = typeof id;
