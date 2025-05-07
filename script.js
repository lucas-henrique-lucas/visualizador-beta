document.addEventListener("DOMContentLoaded", () => {
    const cbzFileInput = document.getElementById("cbz-file-input");
    const viewer = document.getElementById("viewer");
    const chapterNavigation = document.getElementById("chapter-navigation");
    const chapterSelect = document.getElementById("chapter-select");
    const prevChapterButton = document.getElementById("prev-chapter");
    const nextChapterButton = document.getElementById("next-chapter");

    let intersectionObserver;
    let loadedCBZFiles = []; // Array para armazenar os arquivos CBZ carregados
    let currentChapterIndex = -1; // Índice do capítulo CBZ atualmente exibido

    function lazyLoadImage(img) {
        const src = img.getAttribute("data-src");
        if (!src) return;
        img.src = src;
        img.removeAttribute("data-src");
    }

    function setupIntersectionObserver() {
        if (intersectionObserver) intersectionObserver.disconnect();
        intersectionObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    lazyLoadImage(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { rootMargin: "0px 0px 300px 0px", threshold: 0.01 });
    }

    function revokePreviousObjectURLs() {
        const existingImages = viewer.querySelectorAll("img[src^='blob:']");
        existingImages.forEach(img => {
            if (img.src) URL.revokeObjectURL(img.src);
        });
        viewer.innerHTML = ""; // Limpa o visualizador
    }

    async function displayChapter(chapterIndex) {
        if (chapterIndex < 0 || chapterIndex >= loadedCBZFiles.length) {
            viewer.innerHTML = "<p>Índice de capítulo inválido.</p>";
            return;
        }
        currentChapterIndex = chapterIndex;
        const file = loadedCBZFiles[currentChapterIndex];

        revokePreviousObjectURLs();
        viewer.innerHTML = `<p>Processando capítulo: ${file.name}...</p>`;
        setupIntersectionObserver();

        try {
            const zip = await JSZip.loadAsync(file);
            const imageFiles = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir && (zipEntry.name.match(/\.(jpg|jpeg|png|gif|webp)$/i))) {
                    imageFiles.push(zipEntry);
                }
            });

            imageFiles.sort((a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                const baseNameA = nameA.substring(nameA.lastIndexOf("/") + 1).split(".")[0];
                const baseNameB = nameB.substring(nameB.lastIndexOf("/") + 1).split(".")[0];
                return baseNameA.localeCompare(baseNameB, undefined, { numeric: true, sensitivity: 'base' });
            });

            if (imageFiles.length === 0) {
                viewer.innerHTML = `<p>Nenhuma imagem encontrada em ${file.name}.</p>`;
                return;
            }

            viewer.innerHTML = ""; // Limpa "Processando..."

            for (const imageFile of imageFiles) {
                const img = document.createElement("img");
                img.alt = `Página de ${imageFile.name}`;
                img.classList.add("manhwa-page");
                const imageData = await imageFile.async("blob");
                const objectURL = URL.createObjectURL(imageData);
                img.setAttribute("data-src", objectURL);
                viewer.appendChild(img);
                intersectionObserver.observe(img);
                img.onerror = () => {
                    console.error(`Erro ao carregar imagem: ${imageFile.name}`);
                    img.classList.add("img-error");
                    img.alt = `Erro ao carregar ${imageFile.name}`;
                };
            }
        } catch (error) {
            console.error(`Erro ao processar ${file.name}:`, error);
            viewer.innerHTML = `<p>Erro ao ler ${file.name}. Detalhes: ${error.message}</p>`;
        }
        updateChapterNavigationUI();
        window.scrollTo(0, 0);
    }

    function populateChapterSelect() {
        chapterSelect.innerHTML = "";
        loadedCBZFiles.forEach((file, index) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = file.name; // Ou um nome mais amigável se pudermos extrair
            chapterSelect.appendChild(option);
        });
        if (loadedCBZFiles.length > 0) {
            chapterNavigation.style.display = "flex";
            displayChapter(0); // Carrega o primeiro capítulo por padrão
        } else {
            chapterNavigation.style.display = "none";
            viewer.innerHTML = "<p>Por favor, selecione um ou mais arquivos CBZ.</p>";
        }
    }

    function updateChapterNavigationUI() {
        if (currentChapterIndex === -1) return;
        chapterSelect.value = currentChapterIndex;
        prevChapterButton.disabled = currentChapterIndex === 0;
        nextChapterButton.disabled = currentChapterIndex === loadedCBZFiles.length - 1;
    }

    cbzFileInput.addEventListener("change", (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            loadedCBZFiles = [];
            currentChapterIndex = -1;
            populateChapterSelect();
            return;
        }

        loadedCBZFiles = Array.from(files);
        // Ordena os arquivos CBZ pelo nome (ex: 001.cbz, 002.cbz, 010.cbz)
        loadedCBZFiles.sort((a, b) => {
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });
        
        currentChapterIndex = -1; // Reseta o índice
        populateChapterSelect();
    });

    chapterSelect.addEventListener("change", () => {
        const selectedIndex = parseInt(chapterSelect.value);
        if (selectedIndex !== currentChapterIndex) {
            displayChapter(selectedIndex);
        }
    });

    prevChapterButton.addEventListener("click", () => {
        if (currentChapterIndex > 0) {
            displayChapter(currentChapterIndex - 1);
        }
    });

    nextChapterButton.addEventListener("click", () => {
        if (currentChapterIndex < loadedCBZFiles.length - 1) {
            displayChapter(currentChapterIndex + 1);
        }
    });

    function init() {
        console.log("Visualizador de Manhwa (Múltiplos CBZs) inicializado.");
        if (!window.JSZip) {
            viewer.innerHTML = "<p>Erro: JSZip não carregado.</p>";
            cbzFileInput.disabled = true;
            chapterNavigation.style.display = "none";
        } else {
            chapterNavigation.style.display = "none"; // Esconde navegação até carregar arquivos
        }
    }

    init();
});

