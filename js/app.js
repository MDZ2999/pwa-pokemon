const API_URL = 'https://pokeapi.co/api/v2/pokemon/';
const pokemonList = document.querySelector('#pokemon-list');
const pokemonStatus = document.querySelector('#pokemon-status');
const loadMoreButton = document.querySelector('#load-more');
let nextPageUrl = API_URL;

if ('serviceWorker' in navigator && window.isSecureContext) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./serviceworker.js').catch((error) => {
			console.error('No se pudo registrar el service worker:', error);
		});
	});
}

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const formatPokemonName = (name) => name.split('-').map(capitalize).join(' ');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;'
}[character]));

const getPokemonId = (url) => {
	const match = url.match(/\/pokemon\/(\d+)\/?$/);
	return match ? match[1] : '';
};

const formatStat = (value) => Number.isFinite(value) ? value.toLocaleString('es') : '—';

async function loadPokemonPage() {
	if (!pokemonList || !nextPageUrl) return;

	loadMoreButton.disabled = true;
	loadMoreButton.textContent = 'Cargando...';
	pokemonStatus.textContent = pokemonList.childElementCount
		? 'Cargando más Pokémon...'
		: 'Cargando Pokémon...';

	try {
		const response = await fetch(nextPageUrl);
		if (!response.ok) throw new Error(`PokéAPI respondió con ${response.status}`);

		const data = await response.json();
		const cards = data.results.map((pokemon) => {
			const id = getPokemonId(pokemon.url);
			const name = formatPokemonName(pokemon.name);
			const image = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

			return `
				<a class="pokemon-card" href="detalle.html?id=${encodeURIComponent(id)}" target="_blank" rel="noopener">
					<span class="pokemon-number">N.º ${escapeHtml(id.padStart(3, '0'))}</span>
					<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}" loading="lazy">
					<h2>${escapeHtml(name)}</h2>
					<span class="card-link">Ver detalles <span aria-hidden="true">→</span></span>
				</a>
			`;
		}).join('');

		pokemonList.insertAdjacentHTML('beforeend', cards);
		nextPageUrl = data.next;
		pokemonStatus.textContent = `${pokemonList.childElementCount} Pokémon cargados.`;
		loadMoreButton.hidden = !nextPageUrl;
	} catch (error) {
		console.error('No se pudieron cargar los Pokémon:', error);
		pokemonStatus.textContent = 'No se pudieron cargar los Pokémon. Comprueba tu conexión e inténtalo de nuevo.';
		loadMoreButton.hidden = false;
	} finally {
		loadMoreButton.disabled = false;
		loadMoreButton.textContent = 'Cargar más Pokémon';
	}
}

if (pokemonList && pokemonStatus && loadMoreButton) {
	loadMoreButton.addEventListener('click', loadPokemonPage);
	loadPokemonPage();
}

async function loadPokemonDetail() {
	const pokemonDetail = document.querySelector('#pokemon-detail');
	if (!pokemonDetail) return;

	const pokemonId = new URLSearchParams(window.location.search).get('id');
	if (!pokemonId || !/^\d+$/.test(pokemonId)) {
		pokemonDetail.innerHTML = '<p class="status-message">No se encontró ese Pokémon. Vuelve a la Pokédex y elige uno.</p>';
		return;
	}

	try {
		const response = await fetch(`${API_URL}${encodeURIComponent(pokemonId)}/`);
		if (!response.ok) throw new Error(`PokéAPI respondió con ${response.status}`);

		const pokemon = await response.json();
		const name = formatPokemonName(pokemon.name);
		const image = pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default;
		const types = pokemon.types.map(({ type }) => capitalize(type.name)).join(', ');
		const abilities = pokemon.abilities.map(({ ability }) => formatPokemonName(ability.name)).join(', ');
		const stats = pokemon.stats.map(({ base_stat, stat }) => `
			<div class="stat-row">
				<span>${escapeHtml(formatPokemonName(stat.name))}</span>
				<strong>${formatStat(base_stat)}</strong>
				<div class="stat-track"><span style="width: ${Math.min(base_stat, 100)}%"></span></div>
			</div>
		`).join('');

		document.title = `${name} | Pokédex`;
		pokemonDetail.innerHTML = `
			<div class="detail-artwork">
				<span class="pokemon-number">N.º ${String(pokemon.id).padStart(3, '0')}</span>
				<img src="${escapeHtml(image)}" alt="${escapeHtml(name)}">
			</div>
			<div class="pokemon-detail-copy">
				<p class="eyebrow">Detalle Pokémon</p>
				<h1>${escapeHtml(name)}</h1>
				<div class="type-list">${types.split(', ').map((type) => `<span class="type-badge">${escapeHtml(type)}</span>`).join('')}</div>
				<div class="physical-data">
					<p><span>Altura</span><strong>${(pokemon.height / 10).toLocaleString('es')} m</strong></p>
					<p><span>Peso</span><strong>${(pokemon.weight / 10).toLocaleString('es')} kg</strong></p>
					<p><span>Habilidades</span><strong>${escapeHtml(abilities)}</strong></p>
				</div>
				<section class="stats-section" aria-label="Estadísticas base">
					<h2>Estadísticas base</h2>
					${stats}
				</section>
			</div>
		`;
	} catch (error) {
		console.error('No se pudieron cargar los detalles del Pokémon:', error);
		pokemonDetail.innerHTML = '<p class="status-message">No se pudieron cargar los detalles. Comprueba tu conexión e inténtalo de nuevo.</p>';
	}
}

loadPokemonDetail();
