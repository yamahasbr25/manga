// --- KONFIGURASI API & PROXY ---
// Menggunakan proxy untuk membypass blokir ISP / Internet Positif
const PROXY_URL = 'https://corsproxy.io/?';
const BASE_API = 'https://api.mangadex.org';
const BASE_UPLOAD = 'https://uploads.mangadex.org';
const appContainer = document.getElementById('app');

// URL Router Helper
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('id');
const chapterId = urlParams.get('chapter');

// Helper Fetch Data dengan Proxy & Encode URI
async function fetchApi(endpoint) {
    const targetUrl = endpoint.startsWith('http') ? endpoint : `${BASE_API}${endpoint}`;
    const proxiedUrl = PROXY_URL + encodeURIComponent(targetUrl);
    
    const response = await fetch(proxiedUrl);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

// Helper Extract Gambar Cover via Proxy
function getCoverUrl(manga) {
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    if (coverArt && coverArt.attributes) {
        const coverUrl = `${BASE_UPLOAD}/covers/${manga.id}/${coverArt.attributes.fileName}`;
        return PROXY_URL + encodeURIComponent(coverUrl);
    }
    return 'https://via.placeholder.com/300x450?text=No+Cover';
}

// --- INIT ROUTING ---
async function init() {
    try {
        if (chapterId) {
            await renderReader(chapterId);
        } else if (mangaId) {
            await renderDetail(mangaId);
        } else {
            await renderHome();
        }
    } catch (error) {
        appContainer.innerHTML = `
            <div class="text-center text-red-500 mt-10">
                <i class="fas fa-exclamation-triangle text-4xl mb-4"></i>
                <h3 class="text-xl font-bold">Koneksi Gagal</h3>
                <p class="mt-2 text-gray-400">Gagal mengambil data dari server. Pastikan koneksi stabil atau coba beberapa saat lagi.</p>
                <p class="text-sm text-gray-500 mt-2">Error: ${error.message}</p>
            </div>
        `;
        console.error(error);
    }
}

// --- 1. HOMEPAGE (MENAMPILKAN MANGA TERBARU) ---
async function renderHome() {
    // Fetch Manga dengan cover_art dan terjemahan Bahasa Indonesia
    const data = await fetchApi('/manga?includes[]=cover_art&availableTranslatedLanguage[]=id&order[createdAt]=desc&limit=16');
    
    let html = `
        <h2 class="text-2xl font-bold mb-6 border-l-4 border-blue-500 pl-3">Update Terbaru (Bahasa Indonesia)</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
    `;

    data.data.forEach(manga => {
        const title = manga.attributes.title.en || manga.attributes.title['ja-ro'] || manga.attributes.title.id || 'No Title';
        const cover = getCoverUrl(manga);
        
        html += `
            <a href="?id=${manga.id}" class="manga-card group relative bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform transform hover:-translate-y-1">
                <img src="${cover}" alt="${title}" loading="lazy" class="w-full h-64 object-cover object-center group-hover:opacity-50 transition-opacity">
                <div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-gray-900 to-transparent p-4">
                    <h3 class="font-semibold text-sm truncate text-white">${title}</h3>
                </div>
            </a>
        `;
    });

    html += `</div>`;
    appContainer.innerHTML = html;
}

// --- 2. PAGE DETAIL & RELATED POSTS ---
async function renderDetail(id) {
    appContainer.innerHTML = `<div class="flex justify-center items-center h-64"><div class="loader ease-linear rounded-full border-4 border-t-4 border-blue-500 h-12 w-12"></div></div>`;

    // Fetch secara paralel agar loading lebih cepat
    const [mangaData, chapterData, relatedData] = await Promise.all([
        fetchApi(`/manga/${id}?includes[]=cover_art,author,artist`),
        fetchApi(`/manga/${id}/feed?translatedLanguage[]=id&order[chapter]=desc&limit=100`),
        fetchApi('/manga?includes[]=cover_art&limit=5') // Simulasi related post
    ]);

    const manga = mangaData.data;
    const title = manga.attributes.title.en || manga.attributes.title['ja-ro'] || 'No Title';
    const desc = manga.attributes.description.id || manga.attributes.description.en || 'Tidak ada sinopsis tersedia.';
    const cover = getCoverUrl(manga);
    
    // Badge Status
    const status = manga.attributes.status || 'Unknown';
    const statusColor = status === 'ongoing' ? 'bg-green-600' : 'bg-blue-600';

    let html = `
        <!-- Detail Info -->
        <div class="flex flex-col md:flex-row gap-8 bg-gray-800 p-6 rounded-xl shadow-lg mb-10">
            <img src="${cover}" alt="${title}" class="w-full md:w-64 rounded-lg shadow-md object-cover h-auto">
            <div class="flex-1">
                <h1 class="text-3xl font-bold mb-3 text-white">${title}</h1>
                <div class="flex gap-2 mb-4">
                    <span class="px-3 py-1 ${statusColor} text-xs rounded-full font-semibold uppercase">${status}</span>
                    <span class="px-3 py-1 bg-gray-700 text-xs rounded-full"><i class="fas fa-eye text-gray-400"></i> MangaDex</span>
                </div>
                <p class="text-gray-400 text-sm leading-relaxed mb-6 whitespace-pre-line">${desc}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Chapter List -->
            <div class="lg:col-span-2">
                <h2 class="text-xl font-bold mb-4 border-l-4 border-blue-500 pl-3">Daftar Chapter (ID)</h2>
                <div class="bg-gray-800 rounded-xl p-4 max-h-96 overflow-y-auto custom-scrollbar">
                    <ul class="space-y-2">
    `;

    if(chapterData.data.length === 0) {
        html += `<li class="text-gray-500 p-4 text-center bg-gray-700 rounded-lg">Belum ada chapter Bahasa Indonesia untuk komik ini.</li>`;
    } else {
        chapterData.data.forEach(chap => {
            const chNum = chap.attributes.chapter || 'Oneshot';
            const chTitle = chap.attributes.title || '';
            html += `
                <li>
                    <a href="?chapter=${chap.id}" class="flex justify-between items-center bg-gray-700 hover:bg-blue-600 p-3 rounded-lg transition group">
                        <span class="font-medium text-sm text-gray-200 group-hover:text-white">Chapter ${chNum} ${chTitle ? `- ${chTitle}` : ''}</span>
                        <i class="fas fa-book-reader text-gray-400 group-hover:text-white"></i>
                    </a>
                </li>
            `;
        });
    }

    html += `
                    </ul>
                </div>
            </div>

            <!-- Related Posts -->
            <div>
                <h2 class="text-xl font-bold mb-4 border-l-4 border-blue-500 pl-3">Rekomendasi Lainnya</h2>
                <div class="space-y-4">
    `;

    relatedData.data.forEach(rel => {
        const relTitle = rel.attributes.title.en || rel.attributes.title['ja-ro'] || 'No Title';
        const relCover = getCoverUrl(rel);
        html += `
            <a href="?id=${rel.id}" class="flex items-center gap-4 bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition">
                <img src="${relCover}" class="w-16 h-20 object-cover rounded shadow">
                <div class="flex-1 overflow-hidden">
                    <h4 class="text-sm font-semibold text-white truncate">${relTitle}</h4>
                    <span class="text-xs text-gray-400 mt-1 block">Manga</span>
                </div>
            </a>
        `;
    });

    html += `</div></div></div>`;
    appContainer.innerHTML = html;
}

// --- 3. PAGE READER (BACA KOMIK) ---
async function renderReader(chapterId) {
    appContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center mt-10">
            <div class="loader ease-linear rounded-full border-4 border-t-4 border-blue-500 h-12 w-12 mb-4"></div>
            <p class="text-blue-500 font-medium">Mempersiapkan gambar dari server...</p>
        </div>
    `;
    
    // Fetch base URL gambar dari node server terdekat
    const serverData = await fetchApi(`/at-home/server/${chapterId}`);
    
    const baseUrl = serverData.baseUrl;
    const chapterHash = serverData.chapter.hash;
    const images = serverData.chapter.data;

    let html = `
        <div class="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-lg sticky top-20 z-40 shadow-lg">
            <a href="javascript:history.back()" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm text-white transition"><i class="fas fa-arrow-left mr-2"></i> Kembali</a>
            <h2 class="text-sm md:text-lg font-bold text-gray-200"><i class="fas fa-glasses mr-2 text-blue-500"></i> Mode Baca</h2>
            <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm text-white transition"><i class="fas fa-arrow-up"></i></button>
        </div>
        
        <div class="max-w-3xl mx-auto flex flex-col items-center bg-[#000] p-1 md:p-2 rounded shadow-2xl">
    `;

    images.forEach(img => {
        // Gabungkan base url dan hash, lalu bungkus dengan proxy agar gambar tidak diblokir
        const rawImgUrl = `${baseUrl}/data/${chapterHash}/${img}`;
        const proxiedImgUrl = PROXY_URL + encodeURIComponent(rawImgUrl);
        
        html += `<img src="${proxiedImgUrl}" class="w-full h-auto object-contain mb-1" loading="lazy" alt="Manga Page">`;
    });

    html += `
        </div>
        <div class="flex justify-center mt-10 mb-6">
            <a href="javascript:history.back()" class="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-full font-bold shadow-lg text-white transition transform hover:-translate-y-1">Selesai Membaca</a>
        </div>
    `;
    
    appContainer.innerHTML = html;
}

// Jalankan aplikasi
init();
