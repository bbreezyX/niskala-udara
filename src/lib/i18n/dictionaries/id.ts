// Placeholders in {braces} are filled by `fill`/`plural`. Entries with `one`/`other` are counts:
// Indonesian has no plural, so both forms match; English picks one by Intl plural rules.
export const id = {
	meta: {
		title: 'Niskala · Kualitas udara di sekitarmu',
		description:
			'Pantau kualitas udara terkini, kadar polutan, prakiraan, dan rekomendasi kesehatan di kota-kota Indonesia.'
	},
	skipToContent: 'Lewati ke konten',
	nav: {
		label: 'Navigasi utama',
		brandHome: 'Niskala, beranda',
		home: 'Pantauan',
		map: 'Peta',
		history: 'Riwayat'
	},
	search: {
		label: 'Cari kota',
		placeholder: 'Cari kota atau kabupaten…',
		inputLabel: 'Cari kota pantauan',
		open: 'Cari kota (Ctrl K)',
		close: 'Tutup pencarian',
		empty: 'Kota tidak ditemukan. Hanya kota pantauan yang tersedia.',
		locationGroup: 'Lokasi',
		myLocation: 'Lokasi saya',
		// Extra words that find "Lokasi saya" in search, in this language.
		myLocationKeywords: ['perangkat', 'sekitar', 'saya']
	},
	languageSwitch: { switchTo: 'Ganti ke {name}' },
	footer: {
		// The tagline wraps the name in <em>, so it is stored in three parts around it.
		taglineLead: 'Udara itu',
		taglineRest: '. Kami membuatnya terbaca.',
		pages: 'Halaman',
		information: 'Informasi',
		about: 'Tentang',
		privacy: 'Privasi',
		terms: 'Ketentuan Penggunaan',
		dataSources: 'Sumber data',
		airQualitySource: 'Kualitas udara: Google Air Quality API',
		hotspotSource: 'Hotspot:'
	},
	pages: {
		map: {
			title: 'Peta',
			heading: 'Peta udara & hotspot',
			description: 'Peta kualitas udara (Universal AQI) dan hotspot kebakaran 24 jam di sekitar Provinsi Jambi.'
		},
		history: {
			title: 'Riwayat',
			heading: 'Riwayat kualitas udara',
			description: 'Riwayat kualitas udara per jam untuk kota-kota pantauan.'
		},
		about: { title: 'Tentang', description: 'Apa itu Niskala, cara membaca Universal AQI, sumber data, dan batasannya.' },
		privacy: { title: 'Privasi', heading: 'Kebijakan Privasi' },
		terms: { title: 'Ketentuan Penggunaan', heading: 'Ketentuan Penggunaan' },
		locationMe: { title: 'Lokasi saya' },
		locationPoint: { title: 'Titik di peta' },
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
		retry: 'Coba lagi',
		notAvailable: 'Belum tersedia',
		dataNotAvailable: 'Data belum tersedia',
		loadingPlace: 'Memuat data {name}',
		locations: { one: '{n} lokasi', other: '{n} lokasi' },
		scale: 'Skala 0–100, makin tinggi makin baik.',
		howToRead: 'Cara membaca AQI',
		dominantPollutant: 'Polutan dominan',
		backToOverview: 'Kembali ke Pantauan',
		backToMap: 'Kembali ke Peta',
		forecast: 'Prakiraan'
	},
	aqi: {
		bands: { poor: 'Buruk', low: 'Rendah', moderate: 'Sedang', good: 'Baik', excellent: 'Sangat baik' },
		gauge: 'AQI {value} dari 100',
		categories: 'Kategori'
	},
	health: {
		title: 'Rekomendasi kesehatan',
		groupsLabel: 'Saran untuk kelompok',
		groups: {
			generalPopulation: 'Umum',
			children: 'Anak',
			elderly: 'Lansia',
			pregnantWomen: 'Ibu hamil',
			lungDiseasePopulation: 'Penyakit paru',
			heartDiseasePopulation: 'Penyakit jantung',
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
		more: 'Selengkapnya',
		less: 'Ringkas',
		missing: 'Saran lengkap belum tersedia untuk lokasi ini.'
	},
	pollutants: {
		/** Plain-language explanations for readers who do not know the pollutant codes. */
		info: {
			pm25: {
				name: 'Partikel halus',
				about: 'Debu sangat halus, lebih kecil dari 2,5 mikrometer, sekitar 1/30 tebal rambut. Bisa masuk dalam ke paru-paru hingga aliran darah.',
				sources: 'Asap kebakaran hutan dan lahan, kendaraan, pembakaran sampah.'
			},
			pm10: {
				name: 'Partikel kasar',
				about: 'Debu berukuran sampai 10 mikrometer. Tertahan di hidung dan saluran napas atas, bisa memicu batuk dan iritasi.',
				sources: 'Debu jalan, konstruksi, asap pembakaran.'
			},
			no2: {
				name: 'Nitrogen dioksida',
				about: 'Gas dari pembakaran bahan bakar. Mengiritasi saluran napas, terutama bagi penderita asma.',
				sources: 'Kendaraan bermotor, pembangkit listrik, industri.'
			},
			o3: {
				name: 'Ozon permukaan',
				about: 'Gas yang terbentuk saat polutan lain bereaksi di bawah sinar matahari, biasanya naik di siang hari. Bisa membuat dada terasa sesak.',
				sources: 'Asap kendaraan dan industri yang bereaksi dengan sinar matahari.'
			},
			so2: {
				name: 'Sulfur dioksida',
				about: 'Gas berbau tajam dari pembakaran bahan bakar yang mengandung belerang. Mengiritasi mata dan saluran napas.',
				sources: 'Pembangkit listrik batu bara, industri, gunung api.'
			},
			co: {
				name: 'Karbon monoksida',
				about: 'Gas tak berwarna dan tak berbau dari pembakaran yang tidak sempurna. Mengurangi kemampuan darah membawa oksigen.',
				sources: 'Kendaraan, kebakaran, genset dan kompor.'
			}
		},
		units: {
			MICROGRAMS_PER_CUBIC_METER: 'mikrogram per meter kubik udara',
			PARTS_PER_BILLION: 'bagian per miliar bagian udara'
		} as Record<string, string>,
		commonSources: 'Sumber umum: ',
		levels: 'Kadar polutan',
		levelsLatest: 'Pada jam data terakhir, dibanding pedoman WHO',
		levelsThisHour: 'Kadar polutan pada jam ini',
		main: 'Polutan utama',
		timesWho: '{ratio} pedoman WHO',
		belowWho: 'Di bawah pedoman WHO',
		whoSuffix: ' pedoman WHO',
		whoNote: 'Garis tegak = pedoman WHO 2021 (rata-rata 24 jam; O₃ 8 jam). Angka di sini per jam, jadi perbandingannya indikatif.'
	},
	// Full-page states: a URL with no page behind it, and a page that failed to render.
	errorPage: {
		notFound: {
			title: 'Halaman tidak ditemukan',
			description: 'Alamat ini tidak ada di Niskala. Periksa tautannya, atau lanjutkan dari Pantauan untuk melihat kualitas udara di kotamu.'
		},
		failed: {
			title: 'Halaman gagal dimuat',
			description: 'Server Niskala mengalami gangguan saat menyiapkan halaman ini. Coba lagi; kalau masih gagal, tunggu beberapa menit.'
		}
	},
	errors: {
		not_configured: {
			title: 'Sumber data belum dikonfigurasi',
			description: 'Server belum memiliki kunci akses ke data kualitas udara, jadi belum ada angka yang bisa ditampilkan.'
		},
		not_authorized: {
			title: 'Akses ke sumber data ditolak',
			description: 'Server tidak diizinkan mengambil data kualitas udara saat ini.'
		},
		quota_exceeded: {
			title: 'Batas permintaan tercapai',
			description: 'Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa saat lagi.'
		},
		location_unsupported: {
			title: 'Lokasi belum didukung',
			description: 'Data kualitas udara tidak tersedia untuk lokasi ini. Coba pilih kota lain.'
		},
		no_data: {
			title: 'Data belum tersedia',
			description: 'Sumber data tidak mengirim nilai kualitas udara untuk lokasi ini.'
		},
		timeout: {
			title: 'Waktu permintaan habis',
			description: 'Sumber data terlalu lama merespons.'
		},
		upstream_error: {
			title: 'Data gagal dimuat',
			description: 'Terjadi gangguan saat mengambil data kualitas udara.'
		},
		invalid_request: {
			title: 'Permintaan tidak valid',
			description: 'Lokasi yang dikirim tidak dapat diproses.'
		},
		network: {
			title: 'Tidak dapat terhubung',
			description: 'Periksa koneksi internetmu, lalu coba lagi.'
		}
	},
	location: {
		lastData: 'Data terakhir',
		next24: '24 jam ke depan',
		bestPin: 'Terbaik {hour}, AQI {aqi}',
		bestSpoken: 'Terbaik {detail}',
		plannerHint: 'Arahkan, ketuk, atau geser pita untuk melihat AQI tiap jam.',
		plannerMissing: 'Prakiraan per jam belum tersedia untuk lokasi ini.',
		trendTitle: 'Tren 48 jam',
		trendDescription: '24 jam terakhir dan prakiraan 24 jam ke depan, waktu {zone}',
		recorded: 'Tercatat',
		trendLabel: 'Tren AQI {name}, 24 jam terakhir dan prakiraan 24 jam',
		trendMissing: 'Tren belum tersedia untuk lokasi ini.',
		low24: 'Terendah 24 jam',
		high24: 'Tertinggi 24 jam',
		average24: 'Rata-rata 24 jam',
		fromHours: { one: 'dari {n} jam data', other: 'dari {n} jam data' },
		relatedTitle: 'Lokasi lain di {region}',
		thisArea: 'wilayah ini',
		relatedOrder: 'Urut dari udara terbaik',
		thisPage: 'halaman ini',
		notLoaded: 'Belum dimuat',
		relatedNote: 'Angka tampil untuk lokasi yang sudah dimuat di Pantauan, tanpa permintaan data baru.'
	},
	device: {
		name: 'Lokasi saya',
		note: 'Berdasarkan lokasi perangkat, dibulatkan sekitar 100 m',
		unsupported: 'Browser ini tidak mendukung lokasi perangkat. Silakan pilih kota.',
		denied: 'Izin lokasi ditolak. Kamu tetap bisa memilih kota dari daftar.',
		notFound: 'Lokasi tidak dapat ditemukan. Coba lagi atau pilih kota dari daftar.',
		errorTitle: 'Lokasi belum didapat',
		pickCity: 'Pilih kota',
		locating: 'Mencari lokasimu…',
		locatingHint: 'Izinkan akses lokasi di browser. Koordinat dibulatkan sekitar 100 meter sebelum dikirim.'
	},
	point: {
		name: 'Titik dipilih',
		invalidTitle: 'Titik tidak valid',
		invalidDescription: 'Pilih titik langsung di peta untuk melihat kualitas udaranya.',
		openMap: 'Buka peta'
	},
	card: {
		forecast24: 'Prakiraan 24 jam',
		forecastLabel: 'Prakiraan AQI 24 jam untuk {name}',
		forecastMissing: 'Prakiraan belum tersedia',
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
		lead: 'Begini kualitas udara di kota pantauanmu sekarang.',
		useMyLocation: 'Gunakan lokasi saya',
		overviewPrefix: 'Pantauan, ',
		dataAt: 'Data {time}',
		refreshData: 'Perbarui data',
		refreshingData: 'Memperbarui data',
		listLabel: 'Daftar lokasi pantauan',
		emptyTitle: 'Tidak ada lokasi di kategori ini',
		emptyDescription: 'Pilih kategori AQI lain atau atur ulang filter untuk melihat semua lokasi.',
		resetFilter: 'Atur ulang filter',
		hidden: { one: '{n} lokasi disembunyikan oleh filter.', other: '{n} lokasi disembunyikan oleh filter.' },
		showAll: 'Tampilkan semua',
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
		trigger: 'Urutkan & filter',
		active: '(aktif)',
		title: 'Tampilkan lokasi dengan udara…',
		hint: 'Ketuk satu atau beberapa kategori.',
		bandsLabel: 'Kategori AQI',
		bandOption: '{band}, AQI {min} sampai {max}, {count}',
		sort: 'Urutkan',
		sorts: {
			default: { label: 'Bawaan', description: 'Urutan bawaan, seperti daftar wilayah.' },
			best: { label: 'Terbaik', description: 'AQI tertinggi dulu: udara terbaik di atas.' },
			worst: { label: 'Terburuk', description: 'AQI terendah dulu: udara terburuk di atas.' },
			name: { label: 'A–Z', description: 'Nama kota dari A sampai Z.' }
		},
		pending: {
			one: '{n} lokasi yang datanya belum termuat tetap ditampilkan.',
			other: '{n} lokasi yang datanya belum termuat tetap ditampilkan.'
		},
		reset: 'Atur ulang',
		pickOne: 'Pilih minimal satu',
		apply: { one: 'Tampilkan {n} lokasi', other: 'Tampilkan {n} lokasi' }
	},
	cityPicker: {
		trigger: 'Kota: {name}. Ganti kota',
		placeholder: 'Cari kota, kabupaten, atau provinsi…',
		empty: 'Kota tidak ditemukan.',
		nearest: 'Terdekat',
		locating: 'Mencari lokasimu…',
		denied: 'Izin lokasi ditolak di browser',
		useMine: 'Gunakan lokasiku',
		useMineKeywords: ['lokasi', 'terdekat', 'dekat', 'saya']
	},
	regionPicker: {
		trigger: 'Wilayah: {name}. Ganti wilayah',
		placeholder: 'Cari provinsi atau kota…',
		empty: 'Wilayah tidak ditemukan.',
		selected: ' (dipilih)'
	},
	history: {
		title: 'Catatan per jam',
		description: 'Waktu dalam {zone}. Pilih baris untuk melihat detailnya.',
		rangeLabel: 'Rentang waktu',
		rangeOption: '{n} jam',
		caption: 'Kualitas udara per jam di {name}. Pilih baris untuk melihat detail.',
		columns: { hour: 'Jam', aqi: 'AQI', pollutant: 'Polutan', change: 'Perubahan' },
		delta: {
			start: 'Awal data',
			better: 'Membaik {n} dari jam sebelumnya',
			worse: 'Memburuk {n} dari jam sebelumnya',
			same: 'Tetap dari jam sebelumnya',
			sameShort: 'tetap'
		},
		pagesLabel: 'Halaman catatan',
		previous: 'Sebelumnya',
		next: 'Berikutnya',
		page: 'Halaman {page} dari {count}',
		trendTitle: 'Tren AQI {n} jam',
		trendLabel: 'Tren AQI {name}, {n} jam terakhir',
		detail: 'Detail',
		showHour: 'Lihat detail {time}'
	},
	map: {
		unconfigured: {
			title: 'Peta belum dikonfigurasi',
			description: 'Key Google Maps untuk browser belum dipasang di server, jadi peta belum bisa ditampilkan.'
		},
		auth: {
			title: 'Google Maps menolak key',
			description: 'Pastikan Maps JavaScript API aktif dan domain ini diizinkan di pembatasan key.'
		},
		network: { title: 'Peta gagal dimuat', description: 'Periksa koneksi internetmu, lalu muat ulang halaman.' },
		regionLabel: 'Peta kualitas udara dan hotspot',
		firesTitle: 'Hotspot sekitar Jambi, {n} jam',
		firesUnconfigured: 'Data hotspot belum dikonfigurasi di server.',
		detections: { one: 'deteksi', other: 'deteksi' },
		confidence: { high: 'Keyakinan tinggi', nominal: 'Keyakinan sedang', low: 'Keyakinan rendah' },
		lastDetected: 'Terakhir terdeteksi {time}. ',
		updated: 'Diperbarui {time}.',
		missingSources: 'Sebagian satelit belum tersedia, jumlah bisa lebih rendah.',
		firesFailed: 'Data hotspot gagal dimuat.',
		layers: 'Lapisan peta',
		airQuality: 'Kualitas udara',
		scaleLow: '0, buruk',
		scaleHigh: '100, sangat baik',
		hotspots: 'Titik hotspot',
		checkCenter: 'Cek AQI di tengah peta',
		clickHint: 'Atau klik titik mana pun di peta.',
		about: 'Tentang data ini',
		aboutText:
			'Hotspot adalah anomali panas dari satelit, belum tentu kebakaran. Awan atau asap tebal bisa menutupi titik api. Warna peta adalah perkiraan model per 500 m, bukan hasil alat ukur.',
		hotspotSource: 'Hotspot:',
		card: {
			title: 'Titik hotspot',
			satellite: 'Satelit',
			intensity: 'Intensitas panas',
			check: 'Cek kualitas udara di sini'
		}
	}
};

export type Dictionary = typeof id;
