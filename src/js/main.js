// База упражнений
const exercisesDB = [
    { id: 0, name: "Жим штанги лёжа", muscle: "Грудные", desc: "Развивает грудные мышцы, трицепс и переднюю дельту. Лягте на скамью, опустите штангу к груди, выжмите вверх." },
    { id: 1, name: "Отжимания", muscle: "Грудные", desc: "Базовое упражнение с весом тела. Работает грудь, плечи, трицепс. Держите спину ровно." },
    { id: 2, name: "Приседания со штангой", muscle: "Ноги", desc: "Основное упражнение для квадрицепсов и ягодиц. Следите за коленями и спиной." },
    { id: 3, name: "Выпады с гантелями", muscle: "Ноги", desc: "Прорабатывает ягодицы и бицепс бедра. Отличная нагрузка на баланс." },
    { id: 4, name: "Становая тяга", muscle: "Спина", desc: "Мощное упражнение на спину, бицепс бедра и ягодицы. Соблюдайте технику!" },
    { id: 5, name: "Тяга гантели к поясу", muscle: "Спина", desc: "Изолирует широчайшие мышцы. Опирайтесь на скамью одной рукой." },
    { id: 6, name: "Жим гантелей стоя", muscle: "Плечи", desc: "Развивает дельтовидные мышцы. Не прогибайте поясницу." },
    { id: 7, name: "Подтягивания", muscle: "Спина", desc: "Широчайшие + бицепс. Если тяжело — используйте резинку." },
    { id: 8, name: "Скручивания", muscle: "Пресс", desc: "Классика для пресса. Поднимайте лопатки, поясница прижата." },
    { id: 9, name: "Планка", muscle: "Пресс", desc: "Укрепляет кор. Держите линию: пятки-ягодицы-лопатки." }
];

// Данные приложения
let schedule = JSON.parse(localStorage.getItem("fit_schedule")) || [
    "Грудные", "Ноги", "Спина", "Плечи", "Пресс", "Отдых", "Отдых"
];
let workoutLog = JSON.parse(localStorage.getItem("fit_log")) || [];

// Сохранение всех данных
function saveAll() {
    localStorage.setItem("fit_schedule", JSON.stringify(schedule));
    localStorage.setItem("fit_log", JSON.stringify(workoutLog));
}

// Дни недели
const days = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];

// Рендер графика
function renderSchedule() {
    const grid = document.getElementById("weekGrid");
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 0; i < days.length; i++) {
        const plan = schedule[i] || "Тренировка";
        const isRest = plan.toLowerCase().includes("отдых");
        const div = document.createElement("div");
        div.className = "day-card";
        div.innerHTML = `<div class="day-name">${days[i]}</div>
                         <div class="workout-plan ${isRest ? 'rest' : ''}">${plan}</div>`;
        grid.appendChild(div);
    }
}

// Рендер упражнений
let currentFilter = "Все";

function renderExercises() {
    let filtered = currentFilter === "Все" ? exercisesDB : exercisesDB.filter(ex => ex.muscle === currentFilter);
    const container = document.getElementById("exercisesGrid");
    if (!container) return;
    container.innerHTML = "";
    filtered.forEach(ex => {
        const card = document.createElement("div");
        card.className = "exercise-card";
        card.innerHTML = `<h3><span>${ex.name}</span><span class="muscle-badge">${ex.muscle}</span></h3>
                          <div class="exercise-desc">${ex.desc}</div>`;
        card.addEventListener("click", () => card.classList.toggle("open"));
        container.appendChild(card);
    });
}

function renderFilters() {
    const muscles = ["Все", ...new Set(exercisesDB.map(ex => ex.muscle))];
    const filterDiv = document.getElementById("muscleFilters");
    if (!filterDiv) return;
    filterDiv.innerHTML = "";
    muscles.forEach(m => {
        const btn = document.createElement("button");
        btn.textContent = m;
        btn.className = "filter-btn" + (currentFilter === m ? " active-filter" : "");
        btn.addEventListener("click", () => {
            currentFilter = m;
            renderFilters();
            renderExercises();
        });
        filterDiv.appendChild(btn);
    });
}

// Рендер дневника
function renderDiary() {
    const tbody = document.getElementById("logBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (workoutLog.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6'>Нет записей. Добавьте тренировку.</td></tr>";
        const statsDiv = document.getElementById("statsArea");
        if (statsDiv) statsDiv.innerHTML = "";
        return;
    }
    workoutLog.forEach((log, idx) => {
        const exName = exercisesDB.find(e => e.id == log.exId)?.name || "Упражнение";
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${log.date}</td>
            <td>${exName}</td>
            <td>${log.sets}</td>
            <td>${log.reps}</td>
            <td>${log.weight}</td>
            <td><button class="delete-btn" data-idx="${idx}">✕</button></td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const idx = parseInt(btn.getAttribute("data-idx"));
            workoutLog.splice(idx, 1);
            saveAll();
            renderDiary();
            renderStats();
        });
    });
    renderStats();
}

// Статистика (extend - появляется при >=3 записях)
function renderStats() {
    const statsDiv = document.getElementById("statsArea");
    if (!statsDiv) return;
    const exerciseCounts = {};
    workoutLog.forEach(log => {
        if (!exerciseCounts[log.exId]) exerciseCounts[log.exId] = [];
        exerciseCounts[log.exId].push(log.weight);
    });
    let statsHtml = "";
    for (let exId in exerciseCounts) {
        const weights = exerciseCounts[exId];
        if (weights.length >= 3) {
            const exObj = exercisesDB.find(e => e.id == parseInt(exId));
            const maxWeight = Math.max(...weights);
            const avgWeight = (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);
            statsHtml += `<div class="stats-block">Статистика: <strong>${exObj?.name}</strong> — ${weights.length} записи, максимум ${maxWeight} кг, средний ${avgWeight} кг</div>`;
        }
    }
    if (statsHtml === "") statsHtml = "<div class='stats-block'>Выполните 3 и более подходов по одному упражнению для отображения статистики прогресса (extend).</div>";
    statsDiv.innerHTML = statsHtml;
}

// Заполнить select упражнений
function fillExerciseSelect() {
    const sel = document.getElementById("exerciseSelect");
    if (!sel) return;
    sel.innerHTML = "";
    exercisesDB.forEach(ex => {
        const opt = document.createElement("option");
        opt.value = ex.id;
        opt.textContent = ex.name + " (" + ex.muscle + ")";
        sel.appendChild(opt);
    });
}

// Добавить запись в дневник
function addWorkoutLog() {
    const date = document.getElementById("workoutDate").value;
    const exId = parseInt(document.getElementById("exerciseSelect").value);
    const sets = parseInt(document.getElementById("sets").value);
    const reps = parseInt(document.getElementById("reps").value);
    const weight = parseFloat(document.getElementById("weight").value);
    
    if (!date) { alert("Выберите дату"); return; }
    if (isNaN(sets) || sets < 1 || isNaN(reps) || reps < 1 || isNaN(weight) || weight < 0) {
        alert("Корректно заполните подходы, повторения и вес");
        return;
    }
    
    workoutLog.push({ date, exId, sets, reps, weight });
    saveAll();
    renderDiary();
    alert("Запись добавлена");
    document.getElementById("workoutDate").value = "";
}

// Инициализация вкладок
function initTabs() {
    const btns = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");
    btns.forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.getAttribute("data-tab");
            btns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            contents.forEach(c => c.classList.remove("active"));
            document.getElementById(tabId).classList.add("active");
            if (tabId === "diary") renderDiary();
            if (tabId === "exercises") { renderFilters(); renderExercises(); }
            if (tabId === "schedule") renderSchedule();
            if (tabId === "add") fillExerciseSelect();
        });
    });
}

// Обработчики событий
function initEventListeners() {
    const updateBtn = document.getElementById("updateScheduleBtn");
    if (updateBtn) {
        updateBtn.addEventListener("click", () => {
            const dayIdx = parseInt(document.getElementById("daySelect").value);
            const newWorkout = document.getElementById("workoutInput").value.trim();
            if (newWorkout) {
                schedule[dayIdx] = newWorkout;
                saveAll();
                renderSchedule();
            } else alert("Введите название тренировки");
        });
    }
    
    const addBtn = document.getElementById("addLogBtn");
    if (addBtn) {
        addBtn.addEventListener("click", addWorkoutLog);
    }
}

// Запуск приложения
function init() {
    renderSchedule();
    renderFilters();
    renderExercises();
    renderDiary();
    fillExerciseSelect();
    initTabs();
    initEventListeners();
    if (workoutLog.length) renderStats();
}

// Ждём загрузки DOM
document.addEventListener("DOMContentLoaded", init);
