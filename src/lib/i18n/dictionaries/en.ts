import type { Dictionary } from './id';

// British spelling, matching the en-GB date and number formats.
// Titles and short labels use Title Case; articles, conjunctions and prepositions stay lowercase inside titles.
// Descriptions, advice, placeholders and measurement units keep sentence case.
export const en: Dictionary = {
	meta: {
		title: 'Niskala · Air Quality in Indonesia',
		description: 'Track current air quality, pollutant levels, forecasts, and health advice for cities across Indonesia.'
	},
	skipToContent: 'Skip to Content',
	nav: {
		label: 'Main navigation',
		brandHome: 'Niskala, home',
		home: 'Overview',
		map: 'Map',
		history: 'History'
	},
	search: {
		label: 'Search Cities',
		placeholder: 'Search a city or regency…',
		inputLabel: 'Search monitored cities',
		open: 'Search Cities (Ctrl K)',
		close: 'Close Search',
		empty: 'No city found. Only monitored cities are available.',
		locationGroup: 'Location',
		myLocation: 'Device Location',
		myLocationKeywords: ['device', 'nearby', 'me', 'current']
	},
	languageSwitch: { switchTo: 'Switch to {name}' },
	install: {
		shortcut: 'Install',
		action: 'Install Niskala',
		installing: 'Installing…',
		title: 'Install Niskala',
		description: 'Add Niskala to the home screen to open it in an app window.',
		close: 'Close Installation Guide',
		androidTitle: 'Android · Chrome',
		androidStep1: 'Open the three-dot menu (⋮) in Chrome.',
		androidStep2: 'Select Install and create shortcut, then Install. The menu may also say Install app or Add to Home screen.',
		androidStep3: 'Confirm with Install or Add to save the Niskala icon.',
		iphoneTitle: 'iPhone and iPad · Safari',
		iphoneStep1: 'Open the Safari menu, then tap Share.',
		iphoneStep2: 'Select Add to Home Screen. If available, turn on Open as Web App.',
		iphoneStep3: 'Tap Add. Open Niskala using the icon on the home screen.',
		browserHint: 'If the installation menu is missing, open this site directly in Chrome or Safari. An internet connection is still needed to fetch data.'
	},
	footer: {
		taglineLead: 'Air is',
		taglineAfterName: ', unseen.',
		taglineClosing: 'We make it readable.',
		pages: 'Pages',
		information: 'Information',
		about: 'About',
		privacy: 'Privacy',
		terms: 'Terms of Use',
		dataSources: 'Data Sources',
		airQualitySource: 'Air Quality: Google Air Quality API',
		ispuSource: 'Station ISPU:',
		hotspotSource: 'Fire Hotspots:',
		windSource: 'Wind:'
	},
	pages: {
		map: {
			title: 'Map',
			heading: 'Air Quality and Hotspot Map',
			description: 'Air quality map (Universal AQI), 24-hour fire hotspots, and wind direction across Indonesia.'
		},
		history: {
			title: 'History',
			heading: 'Air Quality History',
			description: 'Hourly air quality history for monitored cities.'
		},
		about: {
			title: 'About',
			description: 'What Niskala is, how to read the Universal AQI, where the data comes from, and its limits.'
		},
		privacy: { title: 'Privacy', heading: 'Privacy Policy' },
		terms: { title: 'Terms of Use', heading: 'Terms of Use' },
		locationMe: { title: 'Device Location' },
		locationPoint: { title: 'Point on the Map' },
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
		retry: 'Try Again',
		notAvailable: 'Not Available Yet',
		dataNotAvailable: 'No Data Yet',
		loadingPlace: 'Loading data for {name}',
		locations: { one: '{n} location', other: '{n} locations' },
		scale: 'Scale 0–100, higher is better.',
		scaleIspu: 'AQI 0–100, higher is better. For ISPU, higher is worse.',
		howToRead: 'How to Read the AQI',
		dominantPollutant: 'Dominant Pollutant',
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
			veryUnhealthy: 'Very Unhealthy',
			hazardous: 'Hazardous'
		},
		sourceStation: 'ISPU from KLH/BPLH station {name}, {time}.',
		sourceModel: 'ISPU computed by Google from model data; no active KLH/BPLH station for this location.',
		direction: 'Higher is worse.'
	},
	health: {
		title: 'Health Advice',
		groupsLabel: 'Advice For',
		groups: {
			generalPopulation: 'Everyone',
			children: 'Children',
			elderly: 'Older Adults',
			pregnantWomen: 'Pregnant Women',
			lungDiseasePopulation: 'Lung Disease',
			heartDiseasePopulation: 'Heart Disease',
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
				name: 'Fine Particles',
				about: 'Very fine dust, smaller than 2.5 micrometres, about 1/30 the width of a hair. It can reach deep into the lungs and into the bloodstream.',
				sources: 'Forest and land fire smoke, vehicles, burning rubbish.'
			},
			pm10: {
				name: 'Coarse Particles',
				about: 'Dust up to 10 micrometres across. It lodges in the nose and upper airways and can trigger coughing and irritation.',
				sources: 'Road dust, construction, smoke from burning.'
			},
			no2: {
				name: 'Nitrogen Dioxide',
				about: 'A gas from burning fuel. It irritates the airways, especially for people with asthma.',
				sources: 'Motor vehicles, power stations, industry.'
			},
			o3: {
				name: 'Ground-Level Ozone',
				about: 'A gas formed when other pollutants react in sunlight, usually rising during the day. It can make the chest feel tight.',
				sources: 'Vehicle and industrial exhaust reacting with sunlight.'
			},
			so2: {
				name: 'Sulphur Dioxide',
				about: 'A sharp-smelling gas from burning fuel that contains sulphur. It irritates the eyes and airways.',
				sources: 'Coal power stations, industry, volcanoes.'
			},
			co: {
				name: 'Carbon Monoxide',
				about: 'A colourless, odourless gas from incomplete burning. It reduces how much oxygen the blood can carry.',
				sources: 'Vehicles, fires, generators and stoves.'
			}
		},
		units: {
			MICROGRAMS_PER_CUBIC_METER: 'micrograms per cubic metre of air',
			PARTS_PER_BILLION: 'parts per billion parts of air'
		},
		commonSources: 'Common sources: ',
		levels: 'Pollutant Levels',
		levelsLatest: 'At the latest data hour, against WHO guidelines',
		levelsThisHour: 'Pollutant Levels This Hour',
		main: 'Main Pollutant',
		timesWho: '{ratio} the WHO guideline',
		belowWho: 'Below the WHO guideline',
		whoSuffix: ' the WHO guideline',
		whoNote: 'Vertical line = WHO 2021 guideline (24-hour mean; O₃ 8-hour). These readings are hourly, so the comparison is indicative.'
	},
	// Full-page states: a URL with no page behind it, and a page that failed to render.
	errorPage: {
		notFound: {
			title: 'Page Not Found',
			description: 'This address is not available. Check the link or open Overview to select a location.'
		},
		failed: {
			title: 'Page Failed to Load',
			description: 'An error occurred while loading this page. Try again or wait a few minutes.'
		}
	},
	errors: {
		not_configured: {
			title: 'Data Source Not Configured',
			description: 'The server has no access key for air quality data yet, so there are no numbers to show.'
		},
		not_authorized: {
			title: 'Access to the Data Source Was Refused',
			description: 'The server is not allowed to fetch air quality data right now.'
		},
		quota_exceeded: {
			title: 'Request Limit Reached',
			description: 'Too many requests in a short time. Try again in a moment.'
		},
		location_unsupported: {
			title: 'Location Not Supported Yet',
			description: 'Air quality data is not available for this location. Try another city.'
		},
		no_data: {
			title: 'No Data Yet',
			description: 'The data source sent no air quality values for this location.'
		},
		timeout: {
			title: 'Request Timed Out',
			description: 'The data source took too long to respond.'
		},
		upstream_error: {
			title: 'Data Failed to Load',
			description: 'Something went wrong while fetching air quality data.'
		},
		invalid_request: {
			title: 'Invalid Request',
			description: 'The location sent could not be processed.'
		},
		network: {
			title: 'Cannot Connect',
			description: 'Check the internet connection, then try again.'
		}
	},
	location: {
		lastData: 'Latest Data',
		next24: 'Next 24 Hours',
		bestPin: 'Best {hour}, AQI {aqi}',
		bestSpoken: 'Best {detail}',
		plannerHint: 'Hover, tap, or drag along the band to see the AQI for each hour.',
		plannerMissing: 'An hourly forecast is not available for this location yet.',
		trendTitle: '48-Hour Trend',
		trendDescription: 'Last 24 hours and the 24-hour forecast, in {zone}',
		recorded: 'Recorded',
		trendLabel: 'AQI trend for {name}, last 24 hours and 24-hour forecast',
		trendMissing: 'A trend is not available for this location yet.',
		low24: '24-Hour Low',
		high24: '24-Hour High',
		average24: '24-Hour Average',
		fromHours: { one: 'from {n} hour of data', other: 'from {n} hours of data' },
		relatedTitle: 'Other Places in {region}',
		thisArea: 'This Area',
		relatedOrder: 'Best air first',
		thisPage: 'this page',
		notLoaded: 'Not Loaded',
		relatedNote: 'Readings show for places already loaded in Overview, without new data requests.'
	},
	device: {
		name: 'Device Location',
		note: 'Based on device location, rounded to about 100 m',
		unsupported: 'This browser does not support device location. Select a city from the list.',
		denied: 'Location access denied. Select a city from the list to continue.',
		notFound: 'The device location could not be found. Try again or select a city from the list.',
		errorTitle: 'Location Not Available',
		pickCity: 'Select a City',
		locating: 'Finding Device Location…',
		locatingHint: 'Allow location access in the browser. Coordinates are rounded to about 100 metres before they are sent.'
	},
	point: {
		name: 'Selected Point',
		invalidTitle: 'Invalid Point',
		invalidDescription: 'Pick a point directly on the map to see its air quality.',
		openMap: 'Open the Map'
	},
	card: {
		forecast24: '24-Hour Forecast',
		forecastLabel: '24-hour AQI forecast for {name}',
		forecastMissing: 'Forecast Not Available Yet',
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
		heading: 'Air Quality Overview',
		lead: 'Select a region or use the device location to view air quality.',
		useMyLocation: 'Use Device Location',
		overviewPrefix: 'Overview, ',
		dataAt: 'Data {time}',
		refreshData: 'Refresh',
		refreshingData: 'Refreshing…',
		listLabel: 'Monitored locations',
		emptyTitle: 'No Locations in This Category',
		emptyDescription: 'Pick another AQI category or reset the filter to see every location.',
		resetFilter: 'Reset Filter',
		hidden: { one: '{n} location hidden by the filter.', other: '{n} locations hidden by the filter.' },
		showAll: 'Show All',
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
		title: 'Filter Air Quality',
		hint: 'Tap one or more categories.',
		bandsLabel: 'AQI Categories',
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
		pickOne: 'Pick at Least One',
		apply: { one: 'Show {n} Location', other: 'Show {n} Locations' }
	},
	cityPicker: {
		trigger: 'City: {name}. Change city',
		placeholder: 'Search a city, regency, or province…',
		empty: 'No city found.',
		nearest: 'Nearest',
		locating: 'Finding Device Location…',
		denied: 'Location permission denied in the browser',
		useMine: 'Use Device Location',
		useMineKeywords: ['location', 'device', 'nearest', 'near', 'me']
	},
	regionPicker: {
		trigger: 'Region: {name}. Change region',
		placeholder: 'Search a province or city…',
		empty: 'No region found.',
		selected: ' (selected)'
	},
	history: {
		rangeLabel: 'Time Range',
		rangeOption: '{n} hours',
		meta: '{name} · {from} – {to} {zone}',
		latest: 'Latest {time}',
		caption: 'Hourly air quality in {name}, newest first.',
		columns: { hour: 'Hour', aqi: 'AQI', category: 'Category', pollutant: 'Pollutant' },
		trendLabel: 'AQI trend for {name}, last {n} hours',
		showHour: 'Show details for {time}',
		hours: { one: '{n} hour', other: '{n} hours' },
		summary: {
			average: 'Average over the Last {n} Hours',
			verdict: '{band} in {count} of {total} hours.',
			ceiling: 'Never reached {band}.',
			peak: 'Reached {band} at {time}.',
			waffle: 'One square per hour, sorted by category'
		},
		chart: {
			title: 'Hour by Hour',
			note: 'Background bands mark the categories. A break in the line means no data for that hour.',
			worst: 'Worst',
			best: 'Best',
			latest: 'Latest'
		},
		pattern: {
			title: 'Daily Pattern',
			lead: 'Average for each hour of the day over the last {n} hours.',
			tendency: 'The air tends to be cleanest {best} and most polluted {worst}.',
			cleanest: 'Cleanest',
			dirtiest: 'Most Polluted',
			average: 'average {avg} · {band}',
			none: 'No clear hourly pattern in this range.',
			needDays: 'A daily pattern needs at least two days of data. Choose 72 hours to see it.',
			parts: { night: 'before dawn', morning: 'in the morning', midday: 'around midday', afternoon: 'in the afternoon', evening: 'in the evening' }
		},
		dominant: {
			title: 'Main Pollutant',
			share: 'Set the AQI in {count} of {total} hours.'
		},
		days: { title: 'By Day', average: 'average' },
		hour: {
			latest: 'Latest Hour',
			picked: 'Selected Hour',
			hint: 'Pick a point on the chart or a row in the table to see another hour.',
			back: 'Back to the Latest Hour'
		},
		table: { summary: 'All Hours as a Table ({n})', show: 'Show', noData: 'No Data' }
	},
	map: {
		unconfigured: {
			title: 'Map Not Configured',
			description: 'The browser key for Google Maps is not set on the server yet, so the map cannot be shown.'
		},
		auth: {
			title: 'Google Maps Rejected the Key',
			description: 'Make sure the Maps JavaScript API is enabled and this domain is allowed in the key restrictions.'
		},
		network: { title: 'Map Failed to Load', description: 'Check the internet connection, then reload the page.' },
		regionLabel: 'Air quality, hotspot and wind map',
		firesTitle: 'Hotspots in Indonesia, {n} Hours',
		firesUnconfigured: 'Hotspot data is not set up on the server.',
		detections: { one: 'detection', other: 'detections' },
		confidence: { high: 'High Confidence', nominal: 'Normal Confidence', low: 'Low Confidence' },
		legend: {
			intensity: 'Heat Intensity',
			sizes: { small: 'Small, < {max} MW', medium: 'Medium, {min}–{max} MW', large: 'Large, ≥ {min} MW' },
			age: 'Detection Age',
			ageRange: '{min}–{max} hours',
			showLow: 'Show Low Confidence ({n})',
			lowNote: 'Usually sun glint or a weak heat signal.'
		},
		lastDetected: 'Last detected {time}. ',
		updated: 'Updated {time}.',
		missingSources: 'Some satellites are not available yet, so the count may be lower.',
		firesFailed: 'Hotspot data failed to load.',
		layers: 'Map Layers',
		airQuality: 'Air Quality',
		scaleLow: '0, poor',
		scaleHigh: '100, excellent',
		hotspots: 'Fire Hotspots',
		wind: 'Wind',
		windCentre: 'Map centre: {speed} km/h, blowing {toward}',
		windCalm: 'Map centre: calm',
		windLegend: 'Lines show wind direction 10 m above ground. Darker lines indicate stronger winds.',
		windValid: 'Model forecast for {time}.',
		windFailed: 'Wind data failed to load.',
		stations: {
			title: 'KLH/BPLH Station ISPU',
			scaleLow: '0, good',
			scaleHigh: '≥ 300, hazardous',
			count: { one: '{n} station reported in the last 3 hours.', other: '{n} stations reported in the last 3 hours.' },
			missing: 'Some provinces failed to load, so the count may be lower.',
			failed: 'Station ISPU failed to load.',
			critical: 'Critical Parameter',
			marker: 'Station {name}: ISPU {value}, {category}'
		},
		compass: ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'],
		checkCenter: 'View AQI at the Map Centre',
		clickHint: 'Or click any point on the map.',
		about: 'About This Data',
		aboutText:
			'Hotspots are heat anomalies seen by satellite and are not always fires. Cloud or thick smoke can hide a fire. Map colours are a model estimate per 500 m, not measurements. Wind is a weather model forecast (ECMWF, ICON, GFS) on points about 165 km apart, so local winds such as sea breezes do not show.',
		hotspotSource: 'Fire Hotspots:',
		windSource: 'Wind:',
		card: {
			title: 'Fire Hotspot',
			satellite: 'Satellite',
			intensity: 'Heat Intensity',
			check: 'View Air Quality'
		}
	},
	smokeTrace: {
		title: 'Where This Air Came From, Last {hours} Hours',
		smokeLikely: {
			one: 'Over the last {hours} hours the wind came from the {direction} and passed over {n} hotspot. The strongest fire group is about {km} km from here. PM2.5 is high, so fire smoke is likely contributing.',
			other: 'Over the last {hours} hours the wind came from the {direction} and passed over {n} hotspots. The strongest fire group is about {km} km from here. PM2.5 is high, so fire smoke is likely contributing.'
		},
		fires: {
			one: 'Over the last {hours} hours the wind came from the {direction} and passed over {n} hotspot. The strongest fire group is about {km} km from here. Air quality here is currently {band}.',
			other: 'Over the last {hours} hours the wind came from the {direction} and passed over {n} hotspots. The strongest fire group is about {km} km from here. Air quality here is currently {band}.'
		},
		none: 'Over the last {hours} hours the wind came from the {direction} without passing any hotspot seen by satellite.',
		calmFires: {
			one: 'The wind has been nearly calm for the last {hours} hours. There is {n} hotspot within {km} km, and its smoke can settle around here.',
			other: 'The wind has been nearly calm for the last {hours} hours. There are {n} hotspots within {km} km, and their smoke can settle around here.'
		},
		calmNone: 'The wind has been nearly calm for the last {hours} hours, and there are no hotspots within {km} km.',
		mapFires: {
			one: 'Map centre: over the last {hours} hours the wind came from the {direction} and passed over {n} hotspot. The strongest fire group is about {km} km from the map centre.',
			other: 'Map centre: over the last {hours} hours the wind came from the {direction} and passed over {n} hotspots. The strongest fire group is about {km} km from the map centre.'
		},
		mapNone: 'Map centre: over the last {hours} hours the wind came from the {direction} without passing any hotspot seen by satellite.',
		mapCalmFires: {
			one: 'Map centre: the wind has been nearly calm for the last {hours} hours. There is {n} hotspot within {km} km.',
			other: 'Map centre: the wind has been nearly calm for the last {hours} hours. There are {n} hotspots within {km} km.'
		},
		mapCalmNone: 'Map centre: the wind has been nearly calm for the last {hours} hours, and there are no hotspots within {km} km.',
		truncated: 'The trace stops at the edge of the wind data, so fires outside Indonesia are not counted.',
		staticExcluded: {
			one: '{n} hotspot from a static heat source (gas flare, smelter, volcano) is not counted.',
			other: '{n} hotspots from static heat sources (gas flares, smelters, volcanoes) are not counted.'
		},
		facts: {
			hotspots: 'Hotspots in the Wind Path',
			hotspotsCalm: 'Hotspots within {km} km',
			power: 'Total Intensity',
			powerValue: '{mw} MW',
			group: 'Strongest Group',
			groupValue: '{km} km {direction}, ~{hours} h',
			groupValueCalm: '{km} km {direction}'
		},
		north: 'N',
		method: 'An estimate from 10 m model wind and satellite detections, not a smoke measurement.',
		dataTimes: 'Wind fetched {wind}. Hotspots updated {fires}.',
		failed: 'The smoke trace failed to load.',
		unconfigured: 'Hotspot data is not set up on the server, so the smoke trace is not available.',
		mapSwitch: 'Smoke Trace (Map Centre)'
	}
};
