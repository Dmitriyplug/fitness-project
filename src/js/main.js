const API_URL = 'http://localhost:5000/api';
let currentUser = null;
let token = null;
let exercisesDB = [];
let schedule = [];
let workoutLog = [];
const days = ["ПН", "ВТ", "СР", "ЧТ", "ПТ", "СБ", "ВС"];
const dayNames = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

function showMessage(msg, isError = true) {
    const container = document.getElementById('messageContainer');
    if (!container) return;
    container.innerHTML = `<div class="${isError ? 'error-msg' : 'success-msg'}">${msg}</div>`;
    setTimeout(() => container.innerHTML = '', 3000);
}

async function loadUserData() {
    if (!currentUser) return;
    try {
        console.log('Загрузка данных пользователя...');
        
        const exRes = await fetch(`${API_URL}/exercises`);
        exercisesDB = await exRes.json();
        console.log('Упражнения загружены:', exercisesDB.length);
        
        const schRes = await fetch(`${API_URL}/schedule/${currentUser.id}`);
        schedule = await schRes.json();
        console.log('График загружен:', schedule);
        
        const logRes = await fetch(`${API_URL}/logs/${currentUser.id}`);
        workoutLog = await logRes.json();
        console.log('Дневник загружен:', workoutLog.length);
        
        renderAll();
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        showMessage('Ошибка подключения к серверу. Убедитесь, что бэкенд запущен.');
    }
}

async function saveSchedule(dayIdx, workoutName) {
    if (!currentUser) return;
    try {
        console.log('Сохранение графика:', { dayIdx, workoutName });
        
        const response = await fetch(`${API_URL}/schedule`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                user_id: currentUser.id, 
                day_of_week: dayIdx, 
                workout_name: workoutName 
            })
        });
        
        if (!response.ok) throw new Error('Ошибка сохранения');
        
        await loadUserData();
        showMessage(`График обновлён: ${dayNames[dayIdx]} - ${workoutName}`, false);
    } catch (err) {
        console.error(err);
        showMessage('Ошибка сохранения графика');
    }
}

async function addWorkoutLogAPI(logData) {
    if (!currentUser) return false;
    try {
        const response = await fetch(`${API_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...logData, user_id: currentUser.id })
        });
        if (!response.ok) throw new Error('Ошибка добавления');
        await loadUserData();
        showMessage('Запись добавлена!', false);
        return true;
    } catch (err) {
        showMessage('Ошибка добавления записи');
        return false;
    }
}

async function deleteWorkoutLog(logId) {
    if (!currentUser) return;
    try {
        await fetch(`${API_URL}/logs/${logId}`, { method: 'DELETE' });
        await loadUserData();
        showMessage('Запись удалена', false);
    } catch (err) {
        showMessage('Ошибка удаления');
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

function renderSchedule() {
    const grid = document.getElementById("weekGrid");
    if (!grid) return;
    grid.innerHTML = "";
    
    const weekPlan = Array(7).fill('Отдых');
    schedule.forEach(item => { 
        weekPlan[item.day_of_week] = item.workout_name; 
    });
    
    for (let i = 0; i < days.length; i++) {
        const plan = weekPlan[i];
        const isRest = plan.toLowerCase().includes("отдых");
        const div = document.createElement("div");
        div.className = "day-card";
        div.innerHTML = `
            <div class="day-name">${days[i]}</div>
            <div class="workout-plan ${isRest ? 'rest' : ''}">${plan}</div>
        `;
        grid.appendChild(div);
    }
}

let currentFilter = "Все";
function renderExercises() {
    let filtered = currentFilter === "Все" 
        ? exercisesDB 
        : exercisesDB.filter(ex => ex.muscle_group === currentFilter);
    const container = document.getElementById("exercisesGrid");
    if (!container) return;
    container.innerHTML = "";
    filtered.forEach(ex => {
        const card = document.createElement("div");
        card.className = "exercise-card";
        card.innerHTML = `
            <h3>
                <span>${ex.name}</span>
                <span class="muscle-badge">${ex.muscle_group}</span>
            </h3>
            <div class="exercise-desc">${ex.description || 'Описание отсутствует'}</div>
        `;
        card.addEventListener("click", () => card.classList.toggle("open"));
        container.appendChild(card);
    });
}

function renderFilters() {
    if (!exercisesDB.length) return;
    const muscles = ["Все", ...new Set(exercisesDB.map(ex => ex.muscle_group))];
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

function renderDiary() {
    const tbody = document.getElementById("logBody");
    if (!tbody) return;
    tbody.innerHTML = "";
    if (workoutLog.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6'>Нет записей. Добавьте тренировку.</td></tr>";
        return;
    }
    workoutLog.forEach(log => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${log.log_date}</td>
            <td>${log.exercise_name}</td>
            <td>${log.sets}</td>
            <td>${log.reps}</td>
            <td>${log.weight_kg}</td>
            <td><button class="delete-btn" data-id="${log.id}">✕</button></td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", (e) => { 
            deleteWorkoutLog(parseInt(btn.getAttribute("data-id"))); 
        });
    });
    renderStats();
}

function renderStats() {
    const statsDiv = document.getElementById("statsArea");
    if (!statsDiv) return;
    if (!workoutLog.length) { 
        statsDiv.innerHTML = "<div class='stats-card'>Нет данных для статистики</div>"; 
        return; 
    }
    
    const exerciseCounts = {};
    workoutLog.forEach(log => {
        if (!exerciseCounts[log.exercise_name]) {
            exerciseCounts[log.exercise_name] = [];
        }
        exerciseCounts[log.exercise_name].push(log.weight_kg);
    });
    
    let statsHtml = "";
    for (let exName in exerciseCounts) {
        const weights = exerciseCounts[exName];
        if (weights.length >= 3) {
            const maxWeight = Math.max(...weights);
            const avgWeight = (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);
            statsHtml += `<div class="stats-card">📊 <strong>${exName}</strong>: ${weights.length} записи, макс: ${maxWeight} кг, средний: ${avgWeight} кг</div>`;
        }
    }
    if (statsHtml === "") statsHtml = "<div class='stats-card'>Выполните 3+ подходов по одному упражнению для статистики</div>";
    statsDiv.innerHTML = statsHtml;
}

function fillExerciseSelect() {
    const sel = document.getElementById("exerciseSelect");
    if (!sel) return;
    sel.innerHTML = "";
    exercisesDB.forEach(ex => {
        const opt = document.createElement("option");
        opt.value = ex.id;
        opt.textContent = `${ex.name} (${ex.muscle_group})`;
        sel.appendChild(opt);
    });
}

function setupAddLogForm() {
    const addBtn = document.getElementById("addLogBtn");
    if (!addBtn) return;
    addBtn.onclick = async () => {
        if (!currentUser) { showMessage('Сначала войдите в систему'); return; }
        
        const date = document.getElementById("workoutDate").value;
        const exercise_id = parseInt(document.getElementById("exerciseSelect").value);
        const sets = parseInt(document.getElementById("sets").value);
        const reps = parseInt(document.getElementById("reps").value);
        const weight_kg = parseFloat(document.getElementById("weight").value);
        
        if (!date) { showMessage('Выберите дату'); return; }
        if (isNaN(sets) || sets < 1 || isNaN(reps) || reps < 1) { 
            showMessage('Корректно заполните подходы и повторения'); 
            return; 
        }
        
        await addWorkoutLogAPI({ exercise_id, log_date: date, sets, reps, weight_kg: weight_kg || 0 });
        document.getElementById("workoutDate").value = "";
        document.getElementById("sets").value = "3";
        document.getElementById("reps").value = "10";
        document.getElementById("weight").value = "50";
        document.querySelector('[data-tab="diary"]').click();
    };
}

function setupScheduleForm() {
    const updateBtn = document.getElementById("updateScheduleBtn");
    if (!updateBtn) return;
    
    updateBtn.onclick = () => {
        if (!currentUser) { 
            showMessage('Сначала войдите в систему'); 
            return; 
        }
        const dayIdx = parseInt(document.getElementById("daySelect").value);
        const workoutName = document.getElementById("workoutInput").value.trim();
        if (workoutName) { 
            saveSchedule(dayIdx, workoutName); 
        } else { 
            showMessage('Введите название тренировки'); 
        }
    };
}

function renderUserMenu() {
    const userNameSpan = document.getElementById("userName");
    const logoutBtn = document.getElementById("logoutBtn");
    if (userNameSpan && currentUser) {
        userNameSpan.textContent = currentUser.username;
    }
    if (logoutBtn) {
        logoutBtn.onclick = logout;
    }
}

function renderAll() {
    renderSchedule();
    if (exercisesDB.length) { 
        renderFilters(); 
        renderExercises(); 
    }
    renderDiary();
    if (exercisesDB.length) fillExerciseSelect();
    renderUserMenu();
}

async function checkAuth() {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('currentUser');
    if (!savedToken || !savedUser) {
        window.location.href = 'login.html';
        return false;
    }
    token = savedToken;
    currentUser = JSON.parse(savedUser);
    await loadUserData();
    return true;
}

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
            if (tabId === "exercises" && exercisesDB.length) { 
                renderFilters(); 
                renderExercises(); 
            }
            if (tabId === "schedule") renderSchedule();
            if (tabId === "add" && exercisesDB.length) fillExerciseSelect();
        });
    });
}

async function init() {
    initTabs();
    setupScheduleForm();
    setupAddLogForm();
    await checkAuth();
}

document.addEventListener("DOMContentLoaded", init);
