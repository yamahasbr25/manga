// --- KONFIGURASI API MANGADEX ---
const API_URL = 'https://api.mangadex.org';
const UPLOAD_URL = 'https://uploads.mangadex.org';
const appContainer = document.getElementById('app');

// URL Router Helper
const urlParams = new URLSearchParams(window.location.search);
const mangaId = urlParams.get('id');
const chapterId = urlParams.get('chapter');

// Helper Extract Gambar Cover MangaDex
function getCoverUrl(manga) {
    const coverArt = manga.relationships.find(rel => rel.type === 'cover_art');
    if (coverArt && coverArt.attributes) {
        return `${UPLOAD_URL}/covers/${manga.id}/${coverArt.attributes.fileName}`;
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
        appContainer.innerHTML = `<div class="text-center text-red-500 mt-10"><i class="fas fa-exclamation-triangle text-4xl mb-4"></i><p>Gagal memuat data. Silakan coba lagi nanti.</p></div>`;
        console.error(error);
    }
}

// --- 1. HOMEPAGE (MENAMPILKAN MANGA TERBARU) ---
async function renderHome() {
    // Fetch Manga dengan cover_art (Bahasa Inggris/Indonesia)
    const res = await fetch(`${API_URL}/manga?includes[]=cover_art&availableTranslatedLanguage[]=id&order[createdAt]=desc&limit=16`);
    const data = await res.json();
    
    let html = `
        <h2 class="text-2xl font-bold mb-6 border-l-4 border-blue-500 pl-3">Update Terbaru</h2>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
    `;

    data.data.forEach(manga => {
        const title = manga.attributes.title.en || manga.attributes.title['ja-ro'] || 'No Title';
        const cover = getCoverUrl(manga);
        
        html += `
            <a href="?id=${manga.id}" class="manga-card group relative bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform transform hover:-translate-y-1">
                <img src="${cover}" alt="${title}" class="w-full h-64 object-cover object-center group-hover:opacity-50 transition-opacity">
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
    // Fetch Detail Manga
    const resManga = await fetch(`${API_URL}/manga/${id}?includes[]=cover_art,author,artist`);
    const mangaData = await resManga.json();
    const manga = mangaData.data;
    
    const title = manga.attributes.title.en || manga.attributes.title['ja-ro'] || 'No Title';
    const desc = manga.attributes.description.en || manga.attributes.description.id || 'Tidak ada sinopsis.';
    const cover = getCoverUrl(manga);
    
    // Fetch Chapter List (Fokus ke ID & EN untuk fallback)
    const resChapters = await fetch(`${API_URL}/manga/${id}/feed?translatedLanguage[]=id&translatedLanguage[]=en&order[chapter]=desc&limit=20`);
    const chapterData = await resChapters.json();

    // Fetch Related Posts (Simulasi dengan mengambil manga random/populer)
    const resRelated = await fetch(`${API_URL}/manga?includes[]=cover_art&limit=4`);
    const relatedData = await resRelated.json();

    let html = `
        <!-- Detail Info -->
        <div class="flex flex-col md:flex-row gap-8 bg-gray-800 p-6 rounded-xl shadow-lg mb-10">
            <img src="${cover}" alt="${title}" class="w-full md:w-64 rounded-lg shadow-md object-cover h-auto">
            <div class="flex-1">
                <h1 class="text-3xl font-bold mb-3 text-white">${title}</h1>
                <div class="flex gap-2 mb-4">
                    <span class="px-3 py-1 bg-blue-600 text-xs rounded-full font-semibold">Ongoing</span>
                    <span class="px-3 py-1 bg-gray-700 text-xs rounded-full"><i class="fas fa-star text-yellow-400"></i> 8.5</span>
                </div>
                <p class="text-gray-400 text-sm leading-relaxed mb-6">${desc}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <!-- Chapter List -->
            <div class="lg:col-span-2">
                <h2 class="text-xl font-bold mb-4 border-l-4 border-blue-500 pl-3">Daftar Chapter</h2>
                <div class="bg-gray-800 rounded-xl p-4 max-h-96 overflow-y-auto">
                    <ul class="space-y-2">
    `;

    if(chapterData.data.length === 0) {
        html += `<li class="text-gray-500">Belum ada chapter tersedia.</li>`;
    } else {
        chapterData.data.forEach(chap => {
            const chNum = chap.attributes.chapter || 'Oneshot';
            const chTitle = chap.attributes.title || '';
            const lang = chap.attributes.translatedLanguage.toUpperCase();
            html += `
                <li>
                    <a href="?chapter=${chap.id}" class="flex justify-between items-center bg-gray-700 hover:bg-blue-600 p-3 rounded-lg transition">
                        <span class="font-medium text-sm">Chapter ${chNum} ${chTitle ? `- ${chTitle}` : ''}</span>
                        <span class="text-xs font-bold text-gray-300">${lang}</span>
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
                <h2 class="text-xl font-bold mb-4 border-l-4 border-blue-500 pl-3">Rekomendasi</h2>
                <div class="space-y-4">
    `;

    relatedData.data.forEach(rel => {
        const relTitle = rel.attributes.title.en || rel.attributes.title['ja-ro'] || 'No Title';
        const relCover = getCoverUrl(rel);
        html += `
            <a href="?id=${rel.id}" class="flex items-center gap-4 bg-gray-800 p-2 rounded-lg hover:bg-gray-700 transition">
                <img src="${relCover}" class="w-16 h-20 object-cover rounded">
                <div class="flex-1 overflow-hidden">
                    <h4 class="text-sm font-semibold text-white truncate">${relTitle}</h4>
                    <span class="text-xs text-gray-400">Manga</span>
                </div>
            </a>
        `;
    });

    html += `</div></div></div>`;
    appContainer.innerHTML = html;
}

// --- 3. PAGE READER (BACA KOMIK) ---
async function renderReader(chapterId) {
    appContainer.innerHTML = `<div class="text-center text-blue-500 mt-10">Mempersiapkan server gambar...</div>`;
    
    // MangaDex menggunakan sistem "At-Home" server untuk load gambar
    const res = await fetch(`${API_URL}/at-home/server/${chapterId}`);
    const serverData = await res.json();
    
    const baseUrl = serverData.baseUrl;
    const chapterHash = serverData.chapter.hash;
    const images = serverData.chapter.data; // Array of filenames

    let html = `
        <div class="flex justify-between items-center mb-6">
            <a href="javascript:history.back()" class="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"><i class="fas fa-arrow-left mr-2"></i> Kembali</a>
            <h2 class="text-lg font-bold">Mode Baca</h2>
        </div>
        <div class="max-w-3xl mx-auto flex flex-col gap-1 items-center bg-black p-2 rounded">
    `;

    images.forEach(img => {
        const imgSrc = `${baseUrl}/data/${chapterHash}/${img}`;
        html += `<img src="${imgSrc}" class="w-full h-auto object-contain loading="lazy" alt="Manga Page">`;
    });

    html += `</div>
        <div class="flex justify-center mt-8">
            <a href="javascript:history.back()" class="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-full font-bold shadow-lg">Selesai Membaca</a>
        </div>
    `;
    
    appContainer.innerHTML = html;
}

// Jalankan aplikasi
init();
