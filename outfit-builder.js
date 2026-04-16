const DB_NAME = "OutfitBuilderDB";
const DB_VERSION = 2;

const CANVAS_STORE = "canvasItems";
const CLOTHING_STORE = "clothingData";

let db;

// =========================
// DB INIT
// =========================
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (e) => {
            const database = e.target.result;

            if (!database.objectStoreNames.contains(CANVAS_STORE)) {
                database.createObjectStore(CANVAS_STORE, { keyPath: "uid" });
            }

            if (!database.objectStoreNames.contains(CLOTHING_STORE)) {
                database.createObjectStore(CLOTHING_STORE, { keyPath: "category" });
            }
        };

        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });
}

// =========================
// STATE
// =========================
const clothingData = {
    tops: [],
    bottoms: [],
    shoes: [],
    acc: []
};

let currentCategory = "tops";
let currentFilter = "all";
let canvasItems = [];
let selectedItem = null;

// IMPORTANT FIX: stable drag object
let dragItem = null;

// interaction state
let isDragging = false;
let isResizing = false;
let isRotating = false;

let dragStartX = 0;
let dragStartY = 0;

let itemStartX = 0;
let itemStartY = 0;
let itemStartW = 0;
let itemStartH = 0;
let itemStartRotation = 0;

let resizeHandle = null;

// =========================
// DB HELPERS
// =========================
function saveCanvasItem(item) {
    if (!db) return;
    const tx = db.transaction(CANVAS_STORE, "readwrite");
    tx.objectStore(CANVAS_STORE).put(item);
}

function deleteCanvasItem(uid) {
    if (!db) return;
    const tx = db.transaction(CANVAS_STORE, "readwrite");
    tx.objectStore(CANVAS_STORE).delete(uid);
}

function loadCanvas() {
    if (!db) return;
    const tx = db.transaction(CANVAS_STORE, "readonly");
    const store = tx.objectStore(CANVAS_STORE);

    const req = store.getAll();

    req.onsuccess = () => {
        canvasItems = req.result || [];
        renderCanvas();
    };
}

function saveClothing() {
    if (!db) return;
    const tx = db.transaction(CLOTHING_STORE, "readwrite");
    const store = tx.objectStore(CLOTHING_STORE);

    Object.entries(clothingData).forEach(([category, items]) => {
        store.put({ category, items });
    });
}

function loadClothing() {
    if (!db) return;
    const tx = db.transaction(CLOTHING_STORE, "readonly");
    const store = tx.objectStore(CLOTHING_STORE);

    const req = store.getAll();

    req.onsuccess = () => {
        req.result.forEach(entry => {
            clothingData[entry.category] = entry.items || [];
        });

        renderClothingGrid();
    };
}

// =========================
// INIT
// =========================
document.addEventListener("DOMContentLoaded", async () => {
    // Setup UI first so it's interactive even if DB fails
    setupTabs();
    setupCanvas();
    setupFilters();
    setupKeyboard();
    renderClothingGrid();

    // Then try to load persisted data
    try {
        await initDB();
        loadCanvas();
        loadClothing();
    } catch (err) {
        console.error("IndexedDB init failed:", err);
    }

    // Setup AI prompt Enter key
    const promptInput = document.getElementById("style-prompt");
    if (promptInput) {
        promptInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                generateOutfitSuggestion();
            }
        });
    }
});

// =========================
// TABS
// =========================
function setupTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            currentCategory = btn.dataset.category;
            renderClothingGrid();
        });
    });
}

// =========================
// FILTER FIX (REAL FUNCTIONAL FILTER)
// =========================
function setupFilters() {
    document.querySelectorAll(".color-swatch").forEach(swatch => {
        swatch.addEventListener("click", () => {
            document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
            swatch.classList.add("active");

            currentFilter = swatch.dataset.color;
            renderClothingGrid();
        });
    });
}

// =========================
// CLOTHING GRID (FIXED FILTERING)
// =========================
function renderClothingGrid() {
    const grid = document.getElementById("clothing-grid");
    if (!grid) return;

    let items = clothingData[currentCategory] || [];

    // simple filter (based on name since you don't store color metadata)
    if (currentFilter !== "all") {
        items = items.filter(i =>
            (i.name || "").toLowerCase().includes(currentFilter)
        );
    }

    // Store images in a map to avoid huge data attributes
    const imageMap = new Map();
    items.forEach((item, index) => {
        imageMap.set(index, item.image);
    });

    grid.innerHTML = items.map((item, index) => `
        <div class="clothing-item"
            draggable="true"
            data-index="${index}"
            data-name="${item.name || ''}">
            <img src="${item.image}" draggable="false">
        </div>
    `).join("");

    grid.querySelectorAll(".clothing-item").forEach(el => {
        el.addEventListener("dragstart", (e) => {
            const index = parseInt(el.dataset.index);
            const image = imageMap.get(index);

            dragItem = {
                image: image,
                name: el.dataset.name
            };

            e.dataTransfer.setData("text/plain", image);
        });
    });
}

// =========================
// UPLOAD
// =========================
function handleImageUpload(event) {
    const file = event.target.files[0];
    const input = event.target;
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function() {
        const imageData = reader.result;

        const newItem = {
            id: Date.now(),
            name: file.name,
            image: imageData
        };

        clothingData[currentCategory].push(newItem);
        saveClothing();

        // Reset filter to "all" so uploaded item is visible
        currentFilter = "all";
        document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
        const allSwatch = document.querySelector('.color-swatch[data-color="all"]');
        if (allSwatch) allSwatch.classList.add("active");

        renderClothingGrid();

        // Reset input
        input.value = "";
    };

    reader.readAsDataURL(file);
}

// =========================
// CANVAS SETUP (FIXED DROP RELIABILITY)
// =========================
function setupCanvas() {
    const container = document.querySelector(".mannequin-container");

    container.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    container.addEventListener("drop", (e) => {
        e.preventDefault();

        const rect = container.getBoundingClientRect();

        const image = dragItem?.image || e.dataTransfer.getData("text/plain");

        if (!image) return;

        addToCanvas({
            image
        }, e.clientX - rect.left, e.clientY - rect.top);

        dragItem = null;
    });

    document.addEventListener("mousemove", moveItem);
    document.addEventListener("mouseup", stopAction);

    document.addEventListener("mousedown", (e) => {
        // Don't deselect during active interactions
        if (isDragging || isResizing || isRotating) return;

        // Only deselect if clicking outside canvas items but inside the canvas area
        if (!e.target.closest(".canvas-item") && e.target.closest("#outfit-canvas")) {
            selectedItem = null;
            renderCanvas();
        }
    });
}

// =========================
// ADD TO CANVAS (FIXED)
// =========================
function addToCanvas(itemData, x, y) {
    const item = {
        uid: crypto.randomUUID(),
        image: itemData.image,
        x: x - 60,
        y: y - 60,
        width: 120,
        height: 120,
        rotation: 0
    };

    canvasItems.push(item);
    saveCanvasItem(item);

    renderCanvas();
    selectItem(item.uid);
}

// =========================
// RENDER CANVAS (FIXED STABILITY)
// =========================
function renderCanvas() {
    const canvas = document.getElementById("outfit-canvas");

    canvas.innerHTML = canvasItems.map(item => `
        <div class="canvas-item ${selectedItem === item.uid ? "selected" : ""}"
            data-uid="${item.uid}"
            style="
                left:${item.x}px;
                top:${item.y}px;
                width:${item.width}px;
                height:${item.height}px;
                transform:rotate(${item.rotation}deg);
            ">

            <img src="${item.image}" draggable="false">

            <div class="resize-handle se" data-handle="se"></div>
            <div class="rotate-handle" data-handle="rotate"></div>

            <button class="delete-btn">×</button>
        </div>
    `).join("");

    canvas.querySelectorAll(".canvas-item").forEach(el => {
        el.addEventListener("mousedown", startAction);
    });

    canvas.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();

            const uid = btn.closest(".canvas-item").dataset.uid;

            canvasItems = canvasItems.filter(i => i.uid !== uid);
            deleteCanvasItem(uid);

            renderCanvas();
        });
    });
}

// =========================
// SELECT
// =========================
function selectItem(uid) {
    selectedItem = uid;
    renderCanvas();
}

// =========================
// DRAG / RESIZE / ROTATE (FIXED)
// =========================
function startAction(e) {
    // Don't interfere with delete button clicks
    if (e.target.closest(".delete-btn")) return;

    e.preventDefault();
    e.stopPropagation();

    const el = e.target.closest(".canvas-item");
    if (!el) return;

    const uid = el.dataset.uid;
    const item = canvasItems.find(i => i.uid === uid);
    if (!item) return;

    selectItem(uid);

    dragStartX = e.clientX;
    dragStartY = e.clientY;

    itemStartX = item.x;
    itemStartY = item.y;
    itemStartW = item.width;
    itemStartH = item.height;
    itemStartRotation = item.rotation;

    const handle = e.target.dataset.handle;

    if (handle === "rotate") {
        isRotating = true;
    } else if (handle) {
        isResizing = true;
        resizeHandle = handle;
    } else {
        isDragging = true;
    }
}

function moveItem(e) {
    if (!isDragging && !isResizing && !isRotating) return;

    const item = canvasItems.find(i => i.uid === selectedItem);
    if (!item) return;

    const el = document.querySelector(`.canvas-item[data-uid="${selectedItem}"]`);
    if (!el) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (isDragging) {
        item.x = itemStartX + dx;
        item.y = itemStartY + dy;
        el.style.left = item.x + "px";
        el.style.top = item.y + "px";
    }

    if (isResizing) {
        item.width = Math.max(50, itemStartW + dx);
        item.height = Math.max(50, itemStartH + dy);
        el.style.width = item.width + "px";
        el.style.height = item.height + "px";
    }

    if (isRotating) {
        item.rotation = itemStartRotation + dx * 0.5;
        el.style.transform = `rotate(${item.rotation}deg)`;
    }
}

function stopAction() {
    const item = canvasItems.find(i => i.uid === selectedItem);
    if (item) saveCanvasItem(item);

    isDragging = false;
    isResizing = false;
    isRotating = false;
    resizeHandle = null;
}

// =========================
// KEYBOARD
// =========================
function setupKeyboard() {
    document.addEventListener("keydown", (e) => {
        if (e.key === "Delete" && selectedItem) {
            canvasItems = canvasItems.filter(i => i.uid !== selectedItem);
            deleteCanvasItem(selectedItem);
            selectedItem = null;
            renderCanvas();
        }
    });
}

// =========================
// CLEAR CANVAS
// =========================
function clearCanvas() {
    // Delete all items from IndexedDB
    if (db) {
        const tx = db.transaction(CANVAS_STORE, "readwrite");
        tx.objectStore(CANVAS_STORE).clear();
    }

    // Clear state
    canvasItems = [];
    selectedItem = null;

    renderCanvas();
}

// =========================
// AI STYLE ASSISTANT
// =========================
const AI_CACHE_KEY = "outfitBuilderAICache";

function getAICache() {
    try {
        const cache = localStorage.getItem(AI_CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    } catch {
        return {};
    }
}

function setAICache(prompt, response) {
    try {
        const cache = getAICache();
        cache[prompt.toLowerCase().trim()] = response;
        localStorage.setItem(AI_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
        console.error("Failed to save to cache:", e);
    }
}

function getCachedResponse(prompt) {
    const cache = getAICache();
    return cache[prompt.toLowerCase().trim()] || null;
}

async function generateOutfitSuggestion() {
    const promptInput = document.getElementById("style-prompt");
    const responseDiv = document.getElementById("ai-response");
    const generateBtn = document.getElementById("generate-btn");

    const prompt = promptInput.value.trim();
    if (!prompt) {
        responseDiv.innerHTML = '<p class="ai-placeholder">Please enter a style prompt.</p>';
        return;
    }

    // Check cache first
    const cached = getCachedResponse(prompt);
    if (cached) {
        responseDiv.innerHTML = `
            <span class="cached-badge">Cached</span>
            <div class="ai-content">${escapeHtml(cached)}</div>
        `;
        return;
    }

    // Show loading state
    generateBtn.disabled = true;
    responseDiv.innerHTML = '<p class="ai-loading">Generating outfit suggestions...</p>';

    try {
        const response = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama3",
                prompt: `You are a fashion stylist. Give a brief outfit suggestion for this style: "${prompt}". Include specific clothing items, colors, and accessories. Keep it concise (3-5 sentences).`,
                stream: false
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.response || "No response received.";

        // Save to cache
        setAICache(prompt, aiResponse);

        // Display response
        responseDiv.innerHTML = `<div class="ai-content">${escapeHtml(aiResponse)}</div>`;

    } catch (error) {
        console.error("AI API error:", error);
        responseDiv.innerHTML = `
            <p style="color: #ff2056;">
                Failed to connect to Ollama. Make sure Ollama is running at localhost:11434 with the llama3 model.
            </p>
        `;
    } finally {
        generateBtn.disabled = false;
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function toggleCacheView() {
    const cacheList = document.getElementById("cache-list");
    const viewBtn = document.getElementById("view-cache-btn");

    if (cacheList.style.display === "none") {
        renderCacheList();
        cacheList.style.display = "block";
        viewBtn.textContent = "Hide Cache";
    } else {
        cacheList.style.display = "none";
        viewBtn.textContent = "View Cache";
    }
}

function renderCacheList() {
    const cacheItems = document.getElementById("cache-items");
    const cache = getAICache();
    const prompts = Object.keys(cache);

    if (prompts.length === 0) {
        cacheItems.innerHTML = '<p class="cache-empty">No cached responses yet.</p>';
        return;
    }

    cacheItems.innerHTML = prompts.map(prompt => `
        <div class="cache-item" onclick="loadCachedPrompt('${escapeHtml(prompt)}')" title="${escapeHtml(prompt)}">
            ${escapeHtml(prompt)}
        </div>
    `).join("");
}

function loadCachedPrompt(prompt) {
    const promptInput = document.getElementById("style-prompt");
    const responseDiv = document.getElementById("ai-response");
    const cache = getAICache();

    promptInput.value = prompt;

    if (cache[prompt]) {
        responseDiv.innerHTML = `
            <span class="cached-badge">Cached</span>
            <div class="ai-content">${escapeHtml(cache[prompt])}</div>
        `;
    }
}

function clearAICache() {
    if (confirm("Clear all cached AI responses?")) {
        localStorage.removeItem(AI_CACHE_KEY);
        renderCacheList();

        const responseDiv = document.getElementById("ai-response");
        responseDiv.innerHTML = '<p class="ai-placeholder">Cache cleared. Enter a style prompt to get AI suggestions.</p>';
    }
}
