import type { Dictionary } from './id';

// British spelling, matching the en-GB date and number formats.
export const en: Dictionary = {
	meta: {
		title: 'Niskala · Air quality in Indonesia',
		description: 'Track current air quality, pollutant levels, forecasts, and health advice for cities across Indonesia.'
	},
	skipToContent: 'Skip to content',
	nav: {
		label: 'Main navigation',
		brandHome: 'Niskala, home',
		home: 'Overview',
		map: 'Map',
		history: 'History'
	},
	search: {
		label: 'Search cities',
		placeholder: 'Search a city or regency…',
		inputLabel: 'Search monitored cities',
		open: 'Search cities (Ctrl K)',
		close: 'Close search',
		empty: 'No city found. Only monitored cities are available.',
		locationGroup: 'Location',
		myLocation: 'Device location',
		myLocationKeywords: ['device', 'nearby', 'me', 'current']
	},
	languageSwitch: { switchTo: 'Switch to {name}' },
	footer: {
		taglineLead: 'Air is',
		taglineAfterName: ', unseen.',
		taglineClosing: 'We make it readable.',
		pages: 'Pages',
		information: 'Information',
		about: 'About',
		privacy: 'Privacy',
		terms: 'Terms of Use',
		dataSources: 'Data sources',
		airQualitySource: 'Air quality: Google Air Quality API',
		ispuSource: 'Station ISPU:',
		hotspotSource: 'Fire hotspots:',
		windSource: 'Wind:'
	},
	pages: {
		map: {
			title: 'Map',
			heading: 'Air quality and hotspot map',
			description: 'Air quality map (Universal AQI), 24-hour fire hotspots, and wind direction across Indonesia.'
		},
		history: {
			title: 'History',
			heading: 'Air quality history',
			description: 'Hourly air quality history for monitored cities.'
		},
		about: {
			title: 'About',
			description: 'What Niskala is, how to read the Universal AQI, where the data comes from, and its limits.'
		},
		privacy: { title: 'Privacy', heading: 'Privacy Policy' },
		terms: { title: 'Terms of Use', heading: 'Terms of Use' },
		locationMe: { title: 'Device location' },
		locationPoint: { title: 'Point on the map' },
		city: { description: 'Current air quality, 24-hour trend, forecast, and pollutant levels in {name}.' }
	},
	legal: {
		updated: 'Last updated: {date}',
		translationNote:
			'This English version is a translation provided for convenience. If it differs from the Indonesian version, the Indonesian version prevails.'
	},
	common: {
		refresh: 'Refresh',
		refreshing: 'Refreshing…',
		retry: 'Try again',
		notAvailable: 'Not available yet',
		dataNotAvailable: 'No data yet',
		loadingPlace: 'Loading data for {name}',
		locations: { one: '{n} location', other: '{n} locations' },
		scale: 'Scale 0–100, higher is better.',
		scaleIspu: 'AQI 0–100, higher is better. For ISPU, higher is worse.',
		howToRead: 'How to read the AQI',
		dominantPollutant: 'Dominant pollutant',
		backToOverview: 'Back to Overview',
		backToMap: 'Back to Map',
		forecast: 'Forecast'
	},
	aqi: {
		bands: { poor: 'Poor', low: 'Low', moderate: 'Moderate', good: 'Good', excellent: 'Excellent' },
		gauge: 'AQI {value} out of 100',
		categories: 'Categories'
	},
	ispu: {
		label: 'ISPU',
		spoken: 'ISPU {value}, {category}',
		atLeast: '≥ {value}',
		bands: {
			good: 'Good',
			moderate: 'Moderate',
			unhealthy: 'Unhealthy',
			veryUnhealthy: 'Very unhealthy',
			hazardous: 'Hazardous'
		},
		sourceStation: 'ISPU from KLH/BPLH station {name}, {time}.',
		sourceModel: 'ISPU computed by Google from model data; no active KLH/BPLH station for this location.',
		direction: 'Higher is worse.'
	},
	health: {
		title: 'Health advice',
		groupsLabel: 'Advice for',
		groups: {
			generalPopulation: 'Everyone',
			children: 'Children',
			elderly: 'Older adults',
			pregnantWomen: 'Pregnant women',
			lungDiseasePopulation: 'Lung disease',
			heartDiseasePopulation: 'Heart disease',
			athletes: 'Athletes'
		},
		headlines: [
			'Best to stay indoors',
			'Cut back on strenuous outdoor activity',
			'Sensitive groups should take care',
			'Safe for outdoor activities',
			'Clean air, enjoy being outside'
		],
		missing: 'Full advice is not available for this location yet.'
	},
	pollutants: {
		info: {
			pm25: {
				name: 'Fine particles',
				about: 'Very fine dust, smaller than 2.5 micrometres, about 1/30 the width of a hair. It can reach deep into the lungs and into the bloodstream.',
				sources: 'Forest and land fire smoke, vehicles, burning rubbish.'
			},
			pm10: {
				name: 'Coarse particles',
				about: 'Dust up to 10 micrometres across. It lodges in the nose and upper airways and can trigger coughing and irritation.',
				sources: 'Road dust, construction, smoke from burning.'
			},
			no2: {
				name: 'Nitrogen dioxide',
				about: 'A gas from burning fuel. It irritates the airways, especially for people with asthma.',
				sources: 'Motor vehicles, power stations, industry.'
			},
			o3: {
				name: 'Ground-level ozone',
				about: 'A gas formed when other pollutants react in sunlight, usually rising during the day. It can make the chest feel tight.',
				sources: 'Vehicle and industrial exhaust reacting with sunlight.'
			},
			so2: {
				name: 'Sulphur dioxide',
				about: 'A sharp-smelling gas from burning fuel that contains sulphur. It irritates the eyes and airways.',
				sources: 'Coal power stations, industry, volcanoes.'
			},
			co: {
				name: 'Carbon monoxide',
				about: 'A colourless, odourless gas from incomplete burning. It reduces how much oxygen the blood can carry.',
				sources: 'Vehicles, fires, generators and stoves.'
			}
		},
		units: {
			MICROGRAMS_PER_CUBIC_METER: 'micrograms per cubic metre of air',
			PARTS_PER_BILLION: 'parts per billion parts of air'
		},
		commonSources: 'Common sources: ',
		levels: 'Pollutant levels',
		levelsLatest: 'At the latest data hour, against WHO guidelines',
		levelsThisHour: 'Pollutant levels this hour',
		main: 'Main pollutant',
		timesWho: '{ratio} the WHO guideline',
		belowWho: 'Below the WHO guideline',
		whoSuffix: ' the WHO guideline',
		whoNote: 'Vertical line = WHO 2021 guideline (24-hour mean; O₃ 8-hour). These readings are hourly, so the comparison is indicative.'
	},
	// Full-page states: a URL with no page behind it, and a page that failed to render.
	errorPage: {
		notFound: {
			title: 'Page not found',
			description: 'This address is not available. Check the link or open Overview to select a location.'
		},
		failed: {
			title: 'Page failed to load',
			description: 'An error occurred while loading this page. Try again or wait a few minutes.'
		}
	},
	errors: {
		not_configured: {
			title: 'Data source not configured',
			description: 'The server has no access key for air quality data yet, so there are no numbers to show.'
		},
		not_authorized: {
			title: 'Access to the data source was refused',
			description: 'The server is not allowed to fetch air quality data right now.'
		},
		quota_exceeded: {
			title: 'Request limit reached',
			description: 'Too many requests in a short time. Try again in a moment.'
		},
		location_unsupported: {
			title: 'Location not supported yet',
			description: 'Air quality data is not available for this location. Try another city.'
		},
		no_data: {
			title: 'No data yet',
			description: 'The data source sent no air quality values for this location.'
		},
		timeout: {
			title: 'Request timed out',
			description: 'The data source took too long to respond.'
		},
		upstream_error: {
			title: 'Data failed to load',
			description: 'Something went wrong while fetching air quality data.'
		},
		invalid_request: {
			title: 'Invalid request',
			description: 'The location sent could not be processed.'
		},
		network: {
			title: 'Cannot connect',
			description: 'Check the internet connection, then try again.'
		}
	},
	location: {
		lastData: 'Latest data',
		next24: 'Next 24 hours',
		bestPin: 'Best {hour}, AQI {aqi}',
		bestSpoken: 'Best {detail}',
		plannerHint: 'Hover, tap, or drag along the band to see the AQI for each hour.',
		plannerMissing: 'An hourly forecast is not available for this location yet.',
		trendTitle: '48-hour trend',
		trendDescription: 'Last 24 hours and the 24-hour forecast, in {zone}',
		recorded: 'Recorded',
		trendLabel: 'AQI trend for {name}, last 24 hours and 24-hour forecast',
		trendMissing: 'A trend is not available for this location yet.',
		low24: '24-hour low',
		high24: '24-hour high',
		average24: '24-hour average',
		fromHours: { one: 'from {n} hour of data', other: 'from {n} hours of data' },
		relatedTitle: 'Other places in {region}',
		thisArea: 'this area',
		relatedOrder: 'Best air first',
		thisPage: 'this page',
		notLoaded: 'Not loaded',
		relatedNote: 'Readings show for places already loaded in Overview, without new data requests.'
	},
	device: {
		name: 'Device location',
		note: 'Based on device location, rounded to about 100 m',
		unsupported: 'This browser does not support device location. Select a city from the list.',
		denied: 'Location access denied. Select a city from the list to continue.',
		notFound: 'The device location could not be found. Try again or select a city from the list.',
		errorTitle: 'Location not available',
		pickCity: 'Select a city',
		locating: 'Finding device location…',
		locatingHint: 'Allow location access in the browser. Coordinates are rounded to about 100 metres before they are sent.'
	},
	point: {
		name: 'Selected point',
		invalidTitle: 'Invalid point',
		invalidDescription: 'Pick a point directly on the map to see its air quality.',
		openMap: 'Open the map'
	},
	card: {
		forecast24: '24-hour forecast',
		forecastLabel: '24-hour AQI forecast for {name}',
		forecastMissing: 'Forecast not available yet',
		dataAt: 'Data {time}'
	},
	chart: {
		summary: '{label}. Low {min}, high {max}.',
		now: 'Now',
		forecastSuffix: ' · forecast'
	},
	dashboard: {
		greetings: {
			morning: 'Good morning',
			midday: 'Good afternoon',
			afternoon: 'Good afternoon',
			evening: 'Good evening',
			neutral: 'Hello'
		},
		heading: 'Air quality overview',
		lead: 'Select a region or use the device location to view air quality.',
		useMyLocation: 'Use device location',
		overviewPrefix: 'Overview, ',
		dataAt: 'Data {time}',
		refreshData: 'Refresh',
		refreshingData: 'Refreshing…',
		listLabel: 'Monitored locations',
		emptyTitle: 'No locations in this category',
		emptyDescription: 'Pick another AQI category or reset the filter to see every location.',
		resetFilter: 'Reset filter',
		hidden: { one: '{n} location hidden by the filter.', other: '{n} locations hidden by the filter.' },
		showAll: 'Show all',
		loading: { one: 'Loading data for {n} location.', other: 'Loading data for {n} locations.' },
		loaded: { one: 'Data for {n} location loaded.', other: 'Data for {n} locations loaded.' }
	},
	spread: {
		label: 'AQI categories across the region',
		segment: '{band}: {count}',
		showAll: 'Show every category',
		showOnly: 'Show only this category',
		worst: ' · {n} {band}'
	},
	filter: {
		trigger: 'Filter',
		active: '(active)',
		title: 'Filter air quality',
		hint: 'Tap one or more categories.',
		bandsLabel: 'AQI categories',
		bandOption: '{band}, AQI {min} to {max}, {count}',
		sort: 'Sort',
		sorts: {
			default: { label: 'Default', description: 'The default order, as in the region list.' },
			best: { label: 'Best', description: 'Sort by highest AQI: the best air quality first.' },
			worst: { label: 'Worst', description: 'Sort by lowest AQI: the worst air quality first.' },
			name: { label: 'A–Z', description: 'City names from A to Z.' }
		},
		pending: {
			one: '{n} location still loading stays in the list.',
			other: '{n} locations still loading stay in the list.'
		},
		reset: 'Reset',
		pickOne: 'Pick at least one',
		apply: { one: 'Show {n} location', other: 'Show {n} locations' }
	},
	cityPicker: {
		trigger: 'City: {name}. Change city',
		placeholder: 'Search a city, regency, or province…',
		empty: 'No city found.',
		nearest: 'Nearest',
		locating: 'Finding device location…',
		denied: 'Location permission denied in the browser',
		useMine: 'Use device location',
		useMineKeywords: ['location', 'device', 'nearest', 'near', 'me']
	},
	regionPicker: {
		trigger: 'Region: {name}. Change region',
		placeholder: 'Search a province or city…',
		empty: 'No region found.',
		selected: ' (selected)'
	},
	history: {
		rangeLabel: 'Time range',
		rangeOption: '{n} hours',
		meta: '{name} · {from} – {to} {zone}',
		latest: 'Latest {time}',
		caption: 'Hourly air quality in {name}, newest first.',
		columns: { hour: 'Hour', aqi: 'AQI', category: 'Category', pollutant: 'Pollutant' },
		trendLabel: 'AQI trend for {name}, last {n} hours',
		showHour: 'Show details for {time}',
		hours: { one: '{n} hour', other: '{n} hours' },
		summary: {
			average: 'Average over the last {n} hours',
			verdict: '{band} in {count} of {total} hours.',
			ceiling: 'Never reached {band}.',
			peak: 'Reached {band} at {time}.',
			waffle: 'One square per hour, sorted by category'
		},
		chart: {
			title: 'Hour by hour',
			note: 'Background bands mark the categories. A break in the line means no data for that hour.',
			worst: 'Worst',
			best: 'Best',
			latest: 'Latest'
		},
		pattern: {
			title: 'Daily pattern',
			lead: 'Average for each hour of the day over the last {n} hours.',
			tendency: 'The air tends to be cleanest {best} and most polluted {worst}.',
			cleanest: 'Cleanest',
			dirtiest: 'Most polluted',
			average: 'average {avg} · {band}',
			none: 'No clear hourly pattern in this range.',
			needDays: 'A daily pattern needs at least two days of data. Choose 72 hours to see it.',
			parts: { night: 'before dawn', morning: 'in the morning', midday: 'around midday', afternoon: 'in the afternoon', evening: 'in the evening' }
		},
		dominant: {
			title: 'Main pollutant',
			share: 'Set the AQI in {count} of {total} hours.'
		},
		days: { title: 'By day', average: 'average' },
		hour: {
			latest: 'Latest hour',
			picked: 'Selected hour',
			hint: 'Pick a point on the chart or a row in the table to see another hour.',
			back: 'Back to the latest hour'
		},
		table: { summary: 'All hours as a table ({n})', show: 'Show', noData: 'No data' }
	},
	map: {
		unconfigured: {
			title: 'Map not configured',
			description: 'The browser key for Google Maps is not set on the server yet, so the map cannot be shown.'
		},
		auth: {
			title: 'Google Maps rejected the key',
			description: 'Make sure the Maps JavaScript API is enabled and this domain is allowed in the key restrictions.'
		},
		network: { title: 'Map failed to load', description: 'Check the internet connection, then reload the page.' },
		regionLabel: 'Air quality, hotspot and wind map',
		firesTitle: 'Hotspots in Indonesia, {n} hours',
		firesUnconfigured: 'Hotspot data is not set up on the server.',
		detections: { one: 'detection', other: 'detections' },
		confidence: { high: 'High confidence', nominal: 'Medium confidence', low: 'Low confidence' },
		lastDetected: 'Last detected {time}. ',
		updated: 'Updated {time}.',
		missingSources: 'Some satellites are not available yet, so the count may be lower.',
		firesFailed: 'Hotspot data failed to load.',
		layers: 'Map layers',
		airQuality: 'Air quality',
		scaleLow: '0, poor',
		scaleHigh: '100, excellent',
		hotspots: 'Fire hotspots',
		wind: 'Wind',
		windCentre: 'Map centre: {speed} km/h, blowing {toward}',
		windCalm: 'Map centre: calm',
		windLegend: 'Lines show wind direction 10 m above ground. Darker lines indicate stronger winds.',
		windValid: 'Model forecast for {time}.',
		windFailed: 'Wind data failed to load.',
		stations: {
			title: 'KLH/BPLH station ISPU',
			scaleLow: '0, good',
			scaleHigh: '≥ 300, hazardous',
			count: { one: '{n} station reported in the last 3 hours.', other: '{n} stations reported in the last 3 hours.' },
			missing: 'Some provinces failed to load, so the count may be lower.',
			failed: 'Station ISPU failed to load.',
			critical: 'Critical parameter',
			marker: 'Station {name}: ISPU {value}, {category}'
		},
		compass: ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'],
		checkCenter: 'View AQI at the map centre',
		clickHint: 'Or click any point on the map.',
		about: 'About this data',
		aboutText:
			'Hotspots are heat anomalies seen by satellite and are not always fires. Cloud or thick smoke can hide a fire. Map colours are a model estimate per 500 m, not measurements. Wind is a weather model forecast (ECMWF, ICON, GFS) on points about 165 km apart, so local winds such as sea breezes do not show.',
		hotspotSource: 'Fire hotspots:',
		windSource: 'Wind:',
		card: {
			title: 'Fire hotspot',
			satellite: 'Satellite',
			intensity: 'Heat intensity',
			check: 'View air quality'
		}
	}
};
