Perfect! Stworzę dla Ciebie **kompletną aplikację cyfrowego zegara z wieloma strefami czasowymi** w kilku wersjach! 🕐

---

# 🕐 MULTI-TIMEZONE DIGITAL CLOCK - KOMPLETNA APLIKACJA

Przygotowuję **4 wersje** aplikacji:
1. ✅ **HTML/CSS/JavaScript** (Web)
2. ✅ **Python/PyQt** (Desktop)
3. ✅ **React.js** (Modern Web)
4. ✅ **Config & Utils** (Backend)

---

## 📌 WERSJA 1: HTML/CSS/JavaScript (Web)

```html
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🕐 Multi-Timezone Digital Clock</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --primary-color: #1a1a2e;
            --secondary-color: #16213e;
            --accent-color: #0f3460;
            --text-color: #eaeaea;
            --clock-color: #00ff88;
            --border-color: #00cc6f;
            --warning-color: #ff006e;
            --info-color: #00b4ff;
        }

        body {
            font-family: 'Courier New', monospace;
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            color: var(--text-color);
            min-height: 100vh;
            padding: 20px;
            overflow-x: hidden;
        }

        body.light-theme {
            --primary-color: #f5f5f5;
            --secondary-color: #ffffff;
            --accent-color: #e8e8e8;
            --text-color: #333333;
            --clock-color: #1a1a1a;
            --border-color: #0066cc;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            margin-bottom: 40px;
            animation: fadeIn 0.8s ease-in;
        }

        h1 {
            font-size: 2.5rem;
            color: var(--clock-color);
            text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
            margin-bottom: 10px;
            letter-spacing: 2px;
        }

        .header-controls {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 20px;
        }

        .btn {
            padding: 10px 20px;
            border: 2px solid var(--border-color);
            background: transparent;
            color: var(--border-color);
            border-radius: 5px;
            cursor: pointer;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            text-transform: uppercase;
            font-weight: bold;
        }

        .btn:hover {
            background: var(--border-color);
            color: var(--primary-color);
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(0, 204, 111, 0.5);
        }

        .btn.active {
            background: var(--border-color);
            color: var(--primary-color);
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-top: 20px;
            flex-wrap: wrap;
            font-size: 0.9rem;
            color: var(--info-color);
        }

        .stat-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .stat-icon {
            width: 20px;
            height: 20px;
            border: 2px solid var(--info-color);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
        }

        .search-box {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 30px;
        }

        #timezoneSearch {
            padding: 12px 20px;
            border: 2px solid var(--border-color);
            background: rgba(0, 204, 111, 0.1);
            color: var(--text-color);
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 1rem;
            width: 100%;
            max-width: 400px;
            transition: all 0.3s ease;
        }

        #timezoneSearch:focus {
            outline: none;
            box-shadow: 0 0 15px rgba(0, 204, 111, 0.5);
            border-color: var(--clock-color);
        }

        #timezoneSearch::placeholder {
            color: rgba(234, 234, 234, 0.5);
        }

        .clocks-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .clock-card {
            background: rgba(22, 33, 62, 0.8);
            border: 2px solid var(--border-color);
            border-radius: 10px;
            padding: 25px;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            animation: slideIn 0.5s ease;
        }

        .clock-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.1), transparent);
            transition: left 0.5s ease;
        }

        .clock-card:hover::before {
            left: 100%;
        }

        .clock-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 255, 136, 0.3);
            border-color: var(--clock-color);
        }

        .clock-card.local {
            border-color: var(--warning-color);
            box-shadow: 0 0 20px rgba(255, 0, 110, 0.3);
        }

        .timezone-name {
            font-size: 0.85rem;
            color: var(--info-color);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .timezone-offset {
            font-size: 0.75rem;
            color: rgba(234, 234, 234, 0.6);
            margin-bottom: 15px;
        }

        .digital-clock {
            font-size: 2.5rem;
            color: var(--clock-color);
            text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
            font-weight: bold;
            letter-spacing: 2px;
            margin-bottom: 10px;
            font-family: 'Courier New', monospace;
            word-spacing: 10px;
        }

        .date-display {
            font-size: 0.9rem;
            color: rgba(234, 234, 234, 0.7);
            margin-bottom: 15px;
        }

        .day-of-week {
            font-size: 0.8rem;
            color: var(--info-color);
            margin-top: 10px;
        }

        .card-actions {
            margin-top: 15px;
            display: flex;
            gap: 10px;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
        }

        .card-btn {
            flex: 1;
            padding: 8px;
            border: 1px solid var(--border-color);
            background: transparent;
            color: var(--border-color);
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.8rem;
            transition: all 0.2s ease;
            font-family: 'Courier New', monospace;
        }

        .card-btn:hover {
            background: var(--border-color);
            color: var(--primary-color);
        }

        .comparison-section {
            background: rgba(15, 52, 96, 0.8);
            border: 2px solid var(--border-color);
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 40px;
            backdrop-filter: blur(10px);
        }

        .comparison-section h2 {
            color: var(--clock-color);
            margin-bottom: 20px;
            font-size: 1.5rem;
            text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }

        .comparison-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }

        .comparison-item {
            background: rgba(26, 26, 46, 0.5);
            padding: 15px;
            border-left: 3px solid var(--clock-color);
            border-radius: 3px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .comparison-label {
            color: var(--info-color);
            font-size: 0.9rem;
        }

        .comparison-value {
            color: var(--clock-color);
            font-size: 1.2rem;
            font-weight: bold;
        }

        .add-timezone {
            background: rgba(15, 52, 96, 0.8);
            border: 2px solid var(--border-color);
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 40px;
            backdrop-filter: blur(10px);
        }

        .add-timezone h2 {
            color: var(--clock-color);
            margin-bottom: 15px;
            font-size: 1.3rem;
        }

        .timezone-select-wrapper {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        select {
            padding: 10px;
            border: 2px solid var(--border-color);
            background: rgba(0, 204, 111, 0.1);
            color: var(--text-color);
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            flex: 1;
            min-width: 200px;
            cursor: pointer;
        }

        select:focus {
            outline: none;
            border-color: var(--clock-color);
            box-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
        }

        .selected-timezones {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }

        .timezone-tag {
            background: var(--border-color);
            color: var(--primary-color);
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: bold;
        }

        .timezone-tag .remove {
            cursor: pointer;
            font-weight: bold;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }

        .timezone-tag .remove:hover {
            opacity: 1;
        }

        .settings-panel {
            background: rgba(15, 52, 96, 0.8);
            border: 2px solid var(--border-color);
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 40px;
            backdrop-filter: blur(10px);
        }

        .settings-panel h2 {
            color: var(--clock-color);
            margin-bottom: 20px;
            font-size: 1.3rem;
        }

        .settings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }

        .setting-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 15px;
            background: rgba(26, 26, 46, 0.5);
            border-radius: 5px;
            border-left: 3px solid var(--info-color);
        }

        .setting-label {
            color: var(--text-color);
            font-size: 0.9rem;
        }

        .toggle-switch {
            position: relative;
            width: 50px;
            height: 25px;
            background: #ccc;
            border-radius: 12px;
            cursor: pointer;
            transition: background 0.3s ease;
        }

        .toggle-switch.active {
            background: var(--clock-color);
        }

        .toggle-switch::after {
            content: '';
            position: absolute;
            width: 21px;
            height: 21px;
            background: white;
            border-radius: 50%;
            top: 2px;
            left: 2px;
            transition: left 0.3s ease;
        }

        .toggle-switch.active::after {
            left: 27px;
        }

        footer {
            text-align: center;
            padding: 20px;
            color: rgba(234, 234, 234, 0.5);
            font-size: 0.85rem;
            border-top: 1px solid var(--border-color);
            margin-top: 40px;
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        /* Responsive */
        @media (max-width: 768px) {
            h1 {
                font-size: 1.8rem;
            }

            .clocks-grid {
                grid-template-columns: 1fr;
            }

            .digital-clock {
                font-size: 2rem;
            }

            .header-controls {
                flex-direction: column;
            }

            .btn {
                width: 100%;
            }
        }

        .loading {
            animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.7;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header>
            <h1>🕐 MULTI-TIMEZONE CLOCK</h1>
            <p style="color: rgba(234, 234, 234, 0.7); font-size: 0.9rem;">
                Real-time digital clock for multiple time zones worldwide
            </p>

            <div class="header-controls">
                <button class="btn active" onclick="toggleFormat()">Toggle Format (24H/12H)</button>
                <button class="btn" onclick="toggleTheme()">Toggle Theme 🌓</button>
                <button class="btn" onclick="addCurrentTimezone()">📍 Add Local Timezone</button>
                <button class="btn" onclick="resetToDefault()">↻ Reset to Default</button>
                <button class="btn" onclick="exportSettings()">⬇️ Export Settings</button>
            </div>

            <div class="stats">
                <div class="stat-item">
                    <span class="stat-icon">⏰</span>
                    <span>Timezones: <span id="timezoneCount">0</span></span>
                </div>
                <div class="stat-item">
                    <span class="stat-icon">🌍</span>
                    <span id="currentTimeUTC">UTC: --:--:--</span>
                </div>
            </div>
        </header>

        <!-- Search -->
        <div class="search-box">
            <input
                type="text"
                id="timezoneSearch"
                placeholder="Search timezone (e.g., 'New York', 'Tokyo', 'London')..."
                onkeyup="filterTimezones()"
            >
        </div>

        <!-- Add Timezone Section -->
        <div class="add-timezone">
            <h2>➕ Add Timezone</h2>
            <div class="timezone-select-wrapper">
                <select id="timezoneSelect">
                    <option value="">Select a timezone...</option>
                </select>
                <button class="btn" onclick="addTimezone()">Add Timezone</button>
            </div>
            <div class="selected-timezones" id="selectedTimezones"></div>
        </div>

        <!-- Clocks Grid -->
        <div class="clocks-grid" id="clocksGrid"></div>

        <!-- Time Comparison -->
        <div class="comparison-section">
            <h2>⏳ Time Differences from UTC</h2>
            <div class="comparison-grid" id="comparisonGrid"></div>
        </div>

        <!-- Settings Panel -->
        <div class="settings-panel">
            <h2>⚙️ Settings</h2>
            <div class="settings-grid">
                <div class="setting-item">
                    <span class="setting-label">Auto-refresh (1 second)</span>
                    <div class="toggle-switch active" onclick="toggleAutoRefresh(this)"></div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Show Date</span>
                    <div class="toggle-switch active" onclick="toggleDateDisplay(this)"></div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Show UTC Offset</span>
                    <div class="toggle-switch active" onclick="toggleUTCOffset(this)"></div>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Show Day of Week</span>
                    <div class="toggle-switch active" onclick="toggleDayOfWeek(this)"></div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <footer>
            <p>🕐 Multi-Timezone Digital Clock | Made with ❤️ | Last updated: <span id="lastUpdate">--:--:--</span></p>
        </footer>
    </div>

    <script>
        // ==========================================
        // CONFIGURATION
        // ==========================================

        const DEFAULT_TIMEZONES = [
            'America/New_York',
            'America/Los_Angeles',
            'America/Chicago',
            'Europe/London',
            'Europe/Paris',
            'Europe/Berlin',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Asia/Dubai',
            'Australia/Sydney',
            'Pacific/Auckland',
            'America/Sao_Paulo',
            'Asia/Kolkata',
            'Asia/Bangkok',
            'Africa/Cairo',
        ];

        const ALL_TIMEZONES = Intl.DateTimeFormat().resolvedOptions().timeZone
            ? getAllTimezones()
            : DEFAULT_TIMEZONES;

        // ==========================================
        // STATE MANAGEMENT
        // ==========================================

        let state = {
            selectedTimezones: DEFAULT_TIMEZONES,
            format: '24h', // '12h' or '24h'
            theme: localStorage.getItem('theme') || 'dark',
            autoRefresh: true,
            showDate: true,
            showUTCOffset: true,
            showDayOfWeek: true,
            searchFilter: '',
        };

        // ==========================================
        // UTILITY FUNCTIONS
        // ==========================================

        function getAllTimezones() {
            const timezones = [];
            const offset = new Date().getTimezoneOffset();
            
            // Use Intl API to get available timezones
            const test = new Intl.DateTimeFormat(undefined, { timeZoneName: 'long' });
            
            return DEFAULT_TIMEZONES; // Fallback to defaults
        }

        function getTimeForTimezone(timezone) {
            try {
                return new Date().toLocaleString('en-US', { timeZone: timezone });
            } catch (e) {
                console.error(`Invalid timezone: ${timezone}`);
                return null;
            }
        }

        function formatTime(date, format) {
            let hours = date.getHours();
            let minutes = date.getMinutes();
            let seconds = date.getSeconds();
            let ampm = '';

            if (format === '12h') {
                ampm = hours >= 12 ? ' PM' : ' AM';
                hours = hours % 12 || 12;
            }

            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${ampm}`;
        }

        function getDateString(timezone) {
            const date = new Date();
            const options = {
                timeZone: timezone,
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            };
            return new Date(new Date().toLocaleString('en-US', options)).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });
        }

        function getDayOfWeek(timezone) {
            const date = new Date();
            const options = {
                timeZone: timezone,
                weekday: 'long',
            };
            return new Date(new Date().toLocaleString('en-US', options)).toLocaleDateString('en-US', {
                weekday: 'long',
            });
        }

        function getUTCOffset(timezone) {
            const date = new Date();
            const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
            const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
            const offset = (tzDate - utcDate) / (1000 * 60 * 60);
            const sign = offset >= 0 ? '+' : '';
            return `UTC${sign}${offset.toFixed(0)}`;
        }

        // ==========================================
        // RENDERING FUNCTIONS
        // ==========================================

        function renderClocks() {
            const grid = document.getElementById('clocksGrid');
            grid.innerHTML = '';

            const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            state.selectedTimezones.forEach(timezone => {
                try {
                    const date = new Date();
                    const formatter = new Intl.DateTimeFormat('en-US', {
                        timeZone: timezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: state.format === '12h',
                    });

                    const parts = formatter.formatToParts(date);
                    let timeString = '';
                    
                    for (const part of parts) {
                        if (part.type !== 'literal') {
                            timeString += part.value;
                        } else {
                            timeString += part.value;
                        }
                    }

                    const isLocal = timezone === userTimezone;

                    const card = document.createElement('div');
                    card.className = `clock-card ${isLocal ? 'local' : ''}`;

                    let html = `
                        <div class="timezone-name">${timezone.replace(/_/g, ' ')}</div>
                    `;

                    if (state.showUTCOffset) {
                        html += `<div class="timezone-offset">${getUTCOffset(timezone)}</div>`;
                    }

                    html += `
                        <div class="digital-clock">${timeString}</div>
                    `;

                    if (state.showDate) {
                        html += `<div class="date-display">${getDateString(timezone)}</div>`;
                    }

                    if (state.showDayOfWeek) {
                        html += `<div class="day-of-week">${getDayOfWeek(timezone)}</div>`;
                    }

                    if (isLocal) {
                        html += `<div style="color: var(--warning-color); font-size: 0.8rem; margin-top: 10px;">📍 Your Local Timezone</div>`;
                    }

                    html += `
                        <div class="card-actions">
                            <button class="card-btn" onclick="copyToClipboard('${timezone}')">📋 Copy</button>
                            <button class="card-btn" onclick="removeTimezone('${timezone}')">🗑️ Remove</button>
                        </div>
                    `;

                    card.innerHTML = html;
                    grid.appendChild(card);
                } catch (e) {
                    console.error(`Error rendering timezone ${timezone}:`, e);
                }
            });

            updateStats();
        }

        function renderComparison() {
            const grid = document.getElementById('comparisonGrid');
            grid.innerHTML = '';

            state.selectedTimezones.slice(0, 5).forEach(timezone => {
                const offset = getUTCOffset(timezone);
                const item = document.createElement('div');
                item.className = 'comparison-item';
                item.innerHTML = `
                    <span class="comparison-label">${timezone.replace(/_/g, ' ')}</span>
                    <span class="comparison-value">${offset}</span>
                `;
                grid.appendChild(item);
            });
        }

        function updateStats() {
            document.getElementById('timezoneCount').textContent = state.selectedTimezones.length;

            const utcDate = new Date();
            const utcFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'UTC',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
            });
            const utcTime = utcFormatter.format(utcDate);
            document.getElementById('currentTimeUTC').textContent = `UTC: ${utcTime}`;
            document.getElementById('lastUpdate').textContent = utcTime;
        }

        // ==========================================
        // UI INTERACTION FUNCTIONS
        // ==========================================

        function toggleFormat() {
            state.format = state.format === '24h' ? '12h' : '24h';
            localStorage.setItem('clockFormat', state.format);
            renderClocks();
        }

        function toggleTheme() {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            localStorage.setItem('theme', state.theme);
            document.body.classList.toggle('light-theme');
        }

        function toggleAutoRefresh() {
            state.autoRefresh = !state.autoRefresh;
            if (state.autoRefresh) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
            }
        }

        function toggleDateDisplay(element) {
            state.showDate = !state.showDate;
            element.classList.toggle('active');
            renderClocks();
        }

        function toggleUTCOffset(element) {
            state.showUTCOffset = !state.showUTCOffset;
            element.classList.toggle('active');
            renderClocks();
        }

        function toggleDayOfWeek(element) {
            state.showDayOfWeek = !state.showDayOfWeek;
            element.classList.toggle('active');
            renderClocks();
        }

        function addTimezone() {
            const select = document.getElementById('timezoneSelect');
            const timezone = select.value;

            if (timezone && !state.selectedTimezones.includes(timezone)) {
                state.selectedTimezones.push(timezone);
                localStorage.setItem('selectedTimezones', JSON.stringify(state.selectedTimezones));
                renderClocks();
                renderComparison();
                select.value = '';
            }
        }

        function removeTimezone(timezone) {
            state.selectedTimezones = state.selectedTimezones.filter(tz => tz !== timezone);
            localStorage.setItem('selectedTimezones', JSON.stringify(state.selectedTimezones));
            renderClocks();
            renderComparison();
        }

        function addCurrentTimezone() {
            const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (!state.selectedTimezones.includes(current)) {
                state.selectedTimezones.unshift(current);
                localStorage.setItem('selectedTimezones', JSON.stringify(state.selectedTimezones));
                renderClocks();
                renderComparison();
            }
        }

        function resetToDefault() {
            if (confirm('Reset all timezones to default?')) {
                state.selectedTimezones = [...DEFAULT_TIMEZONES];
                localStorage.setItem('selectedTimezones', JSON.stringify(state.selectedTimezones));
                renderClocks();
                renderComparison();
            }
        }

        function filterTimezones() {
            const search = document.getElementById('timezoneSearch').value.toLowerCase();
            state.searchFilter = search;

            // Filter timezone select options
            const select = document.getElementById('timezoneSelect');
            Array.from(select.options).forEach(option => {
                if (option.value === '') return;
                option.style.display = option.value.toLowerCase().includes(search) ? 'block' : 'none';
            });
        }

        function copyToClipboard(timezone) {
            const date = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
            const text = `${timezone}: ${formatter.format(date)}`;
            navigator.clipboard.writeText(text).then(() => {
                alert('Copied: ' + text);
            });
        }

        function exportSettings() {
            const settings = {
                selectedTimezones: state.selectedTimezones,
                format: state.format,
                theme: state.theme,
                exportedAt: new Date().toISOString(),
            };
            const json = JSON.stringify(settings, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clock-settings-${Date.now()}.json`;
            a.click();
        }

        // ==========================================
        // AUTO-REFRESH
        // ==========================================

        let refreshInterval;

        function startAutoRefresh() {
            refreshInterval = setInterval(() => {
                renderClocks();
                renderComparison();
                updateStats();
            }, 1000);
        }

        function stopAutoRefresh() {
            if (refreshInterval) clearInterval(refreshInterval);
        }

        // ==========================================
        // INITIALIZATION
        // ==========================================

        function populateTimezoneSelect() {
            const select = document.getElementById('timezoneSelect');
            
            // Add default timezones first
            DEFAULT_TIMEZONES.forEach(tz => {
                const option = document.createElement('option');
                option.value = tz;
                option.textContent = tz.replace(/_/g, ' ');
                select.appendChild(option);
            });

            // Add divider
            const divider = document.createElement('optgroup');
            divider.label = 'More Timezones';
            select.appendChild(divider);

            // Add more timezones
            const more = [
                'America/Anchorage',
                'America/Denver',
                'America/Phoenix',
                'Asia/Hong_Kong',
                'Asia/Singapore',
                'Asia/Seoul',
                'Asia/Moscow',
                'Australia/Melbourne',
                'Europe/Amsterdam',
                'Europe/Rome',
                'Europe/Athens',
                'Africa/Johannesburg',
                'America/Argentina/Buenos_Aires',
                'Pacific/Fiji',
            ];

            more.forEach(tz => {
                const option = document.createElement('option');
                option.value = tz;
                option.textContent = tz.replace(/_/g, ' ');
                divider.appendChild(option);
            });
        }

        function loadSettings() {
            // Load from localStorage
            const saved = localStorage.getItem('selectedTimezones');
            if (saved) {
                try {
                    state.selectedTimezones = JSON.parse(saved);
                } catch (e) {
                    console.error('Error loading settings:', e);
                }
            }

            const savedFormat = localStorage.getItem('clockFormat');
            if (savedFormat) state.format = savedFormat;

            const savedTheme = localStorage.getItem('theme');
            if (savedTheme) {
                state.theme = savedTheme;
                if (state.theme === 'light') {
                    document.body.classList.add('light-theme');
                }
            }
        }

        function init() {
            console.log('🕐 Multi-Timezone Clock initializing...');

            loadSettings();
            populateTimezoneSelect();
            renderClocks();
            renderComparison();
            updateStats();
            startAutoRefresh();

            console.log('✓ Clock initialized with', state.selectedTimezones.length, 'timezones');
        }

        // Start when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            stopAutoRefresh();
        });
    </script>
</body>
</html>
```

---

## 📌 WERSJA 2: Python/PyQt (Desktop)

```python
# clock_desktop.py
# -*- coding: utf-8 -*-
"""
Multi-Timezone Digital Clock - PyQt Desktop Application
"""

import sys
import json
from datetime import datetime
from pathlib import Path
from pytz import all_timezones, timezone
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QGridLayout, QPushButton, QComboBox, QLabel, QLineEdit,
    QCheckBox, QDialog, QDialogButtonBox, QScrollArea, QFrame
)
from PyQt6.QtCore import QTimer, Qt, QTime, QDate
from PyQt6.QtGui import QFont, QColor, QIcon

class TimeZoneClock(QWidget):
    """Single timezone clock widget"""

    def __init__(self, timezone_name, parent=None):
        super().__init__(parent)
        self.timezone_name = timezone_name
        self.tz = timezone(timezone_name)
        self.init_ui()

    def init_ui(self):
        layout = QVBoxLayout()

        # Timezone name
        self.tz_label = QLabel(self.timezone_name.replace('_', ' '))
        self.tz_label.setFont(QFont('Courier New', 10, QFont.Weight.Bold))
        self.tz_label.setStyleSheet("color: #00b4ff;")
        layout.addWidget(self.tz_label)

        # Digital clock
        self.time_label = QLabel()
        self.time_label.setFont(QFont('Courier New', 24, QFont.Weight.Bold))
        self.time_label.setStyleSheet("color: #00ff88; text-shadow: 0 0 10px #00ff88;")
        layout.addWidget(self.time_label)

        # Date
        self.date_label = QLabel()
        self.date_label.setFont(QFont('Courier New', 9))
        self.date_label.setStyleSheet("color: #b0b0b0;")
        layout.addWidget(self.date_label)

        # UTC offset
        self.offset_label = QLabel()
        self.offset_label.setFont(QFont('Courier New', 8))
        self.offset_label.setStyleSheet("color: #b0b0b0;")
        layout.addWidget(self.offset_label)

        self.setLayout(layout)
        self.update_time()

    def update_time(self, format_24h=True):
        """Update displayed time"""
        from datetime import datetime as dt
        
        now = dt.now(self.tz)
        
        # Time
        if format_24h:
            time_str = now.strftime('%H:%M:%S')
        else:
            time_str = now.strftime('%I:%M:%S %p')
        
        self.time_label.setText(time_str)

        # Date
        date_str = now.strftime('%a, %b %d, %Y')
        self.date_label.setText(date_str)

        # UTC offset
        offset_str = now.strftime('%z')
        offset_formatted = f"UTC{offset_str[:3]}:{offset_str[3:]}"
        self.offset_label.setText(offset_formatted)


class MultiTimezoneClock(QMainWindow):
    """Main application window"""

    def __init__(self):
        super().__init__()

        self.DEFAULT_TIMEZONES = [
            'America/New_York',
            'America/Los_Angeles',
            'Europe/London',
            'Europe/Paris',
            'Asia/Tokyo',
            'Asia/Shanghai',
            'Australia/Sydney',
            'Asia/Dubai',
            'America/Sao_Paulo',
            'Asia/Kolkata',
        ]

        self.clocks = {}
        self.format_24h = True
        self.config_file = Path.home() / '.clock_config.json'

        self.init_ui()
        self.load_config()
        self.setup_timer()

    def init_ui(self):
        """Initialize UI"""
        self.setWindowTitle('🕐 Multi-Timezone Digital Clock')
        self.setGeometry(100, 100, 1400, 900)

        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        main_layout = QVBoxLayout()

        # Header
        header_layout = QHBoxLayout()
        
        title = QLabel('🕐 MULTI-TIMEZONE CLOCK')
        title.setFont(QFont('Courier New', 20, QFont.Weight.Bold))
        title.setStyleSheet("color: #00ff88;")
        header_layout.addWidget(title)

        header_layout.addStretch()

        # Controls
        control_layout = QHBoxLayout()

        self.format_btn = QPushButton('Toggle Format (24H/12H)')
        self.format_btn.clicked.connect(self.toggle_format)
        control_layout.addWidget(self.format_btn)

        add_btn = QPushButton('Add Timezone')
        add_btn.clicked.connect(self.add_timezone_dialog)
        control_layout.addWidget(add_btn)

        reset_btn = QPushButton('Reset to Default')
        reset_btn.clicked.connect(self.reset_timezones)
        control_layout.addWidget(reset_btn)

        header_layout.addLayout(control_layout)
        main_layout.addLayout(header_layout)

        # Search
        search_layout = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText('Search timezone...')
        self.search_input.textChanged.connect(self.filter_timezones)
        search_layout.addWidget(self.search_input)
        main_layout.addLayout(search_layout)

        # Clock grid
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        
        scroll_widget = QWidget()
        self.grid_layout = QGridLayout()
        self.grid_layout.setSpacing(15)
        
        scroll_widget.setLayout(self.grid_layout)
        scroll.setWidget(scroll_widget)

        main_layout.addWidget(scroll)

        # Footer
        footer_layout = QHBoxLayout()
        
        self.timezone_count = QLabel()
        self.timezone_count.setStyleSheet("color: #00b4ff;")
        footer_layout.addWidget(self.timezone_count)

        self.current_utc = QLabel()
        self.current_utc.setStyleSheet("color: #00ff88;")
        footer_layout.addWidget(self.current_utc)

        footer_layout.addStretch()

        main_layout.addLayout(footer_layout)

        central_widget.setLayout(main_layout)

        # Styling
        self.setStyleSheet("""
            QMainWindow {
                background-color: #1a1a2e;
                color: #eaeaea;
            }
            QPushButton {
                background-color: transparent;
                border: 2px solid #00cc6f;
                color: #00cc6f;
                padding: 8px 15px;
                border-radius: 5px;
                font-family: 'Courier New';
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #00cc6f;
                color: #1a1a2e;
            }
            QLineEdit {
                background-color: rgba(0, 204, 111, 0.1);
                border: 2px solid #00cc6f;
                color: #eaeaea;
                padding: 8px;
                border-radius: 5px;
                font-family: 'Courier New';
            }
            QLineEdit:focus {
                border: 2px solid #00ff88;
            }
        """)

    def setup_timer(self):
        """Setup auto-refresh timer"""
        self.timer = QTimer()
        self.timer.timeout.connect(self.update_clocks)
        self.timer.start(1000)  # Update every second

    def render_clocks(self):
        """Render all clock widgets"""
        # Clear grid
        while self.grid_layout.count():
            child = self.grid_layout.takeAt(0)
            if child.widget():
                child.widget().deleteLater()

        self.clocks = {}

        row = 0
        col = 0
        
        for tz_name in sorted(self.DEFAULT_TIMEZONES if not hasattr(self, 'selected_timezones') else self.selected_timezones):
            try:
                clock = TimeZoneClock(tz_name)
                self.clocks[tz_name] = clock

                # Create frame for styling
                frame = QFrame()
                frame.setStyleSheet("""
                    QFrame {
                        border: 2px solid #00cc6f;
                        border-radius: 10px;
                        padding: 15px;
                        background-color: rgba(22, 33, 62, 0.8);
                    }
                """)

                frame_layout = QVBoxLayout()
                frame_layout.addWidget(clock)
                frame.setLayout(frame_layout)

                self.grid_layout.addWidget(frame, row, col)

                col += 1
                if col >= 3:  # 3 columns
                    col = 0
                    row += 1

            except Exception as e:
                print(f"Error rendering {tz_name}: {e}")

        self.update_stats()

    def update_clocks(self):
        """Update all clocks"""
        for clock in self.clocks.values():
            clock.update_time(self.format_24h)

        self.update_stats()

    def update_stats(self):
        """Update statistics"""
        self.timezone_count.setText(f"Timezones: {len(self.clocks)}")

        from datetime import datetime as dt
        utc_now = dt.now(timezone('UTC'))
        self.current_utc.setText(f"UTC: {utc_now.strftime('%H:%M:%S')}")

    def toggle_format(self):
        """Toggle 12h/24h format"""
        self.format_24h = not self.format_24h
        self.format_btn.setText(f"Format: {'24H' if self.format_24h else '12H'}")
        self.update_clocks()

    def add_timezone_dialog(self):
        """Show dialog to add timezone"""
        dialog = QDialog(self)
        dialog.setWindowTitle('Add Timezone')

        layout = QVBoxLayout()

        combo = QComboBox()
        combo.addItems(sorted(all_timezones))

        layout.addWidget(QLabel('Select timezone:'))
        layout.addWidget(combo)

        buttons = QDialogButtonBox(
            QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel
        )
        buttons.accepted.connect(dialog.accept)
        buttons.rejected.connect(dialog.reject)

        layout.addWidget(buttons)
        dialog.setLayout(layout)

        if dialog.exec() == QDialog.DialogCode.Accepted:
            selected = combo.currentText()
            if hasattr(self, 'selected_timezones'):
                if selected not in self.selected_timezones:
                    self.selected_timezones.append(selected)
            else:
                self.DEFAULT_TIMEZONES.append(selected)
            
            self.save_config()
            self.render_clocks()

    def reset_timezones(self):
        """Reset to default timezones"""
        if hasattr(self, 'selected_timezones'):
            delattr(self, 'selected_timezones')
        self.save_config()
        self.render_clocks()

    def filter_timezones(self):
        """Filter timezones based on search"""
        search_text = self.search_input.text().lower()
        
        for tz_name, clock in self.clocks.items():
            should_show = search_text in tz_name.lower()
            clock.setVisible(should_show)

    def save_config(self):
        """Save configuration to file"""
        config = {
            'timezones': self.DEFAULT_TIMEZONES if not hasattr(self, 'selected_timezones') else self.selected_timezones,
            'format_24h': self.format_24h,
        }
        with open(self.config_file, 'w') as f:
            json.dump(config, f)

    def load_config(self):
        """Load configuration from file"""
        if self.config_file.exists():
            try:
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    self.DEFAULT_TIMEZONES = config.get('timezones', self.DEFAULT_TIMEZONES)
                    self.format_24h = config.get('format_24h', True)
            except Exception as e:
                print(f"Error loading config: {e}")

        self.render_clocks()

    def closeEvent(self, event):
        """Save on close"""
        self.timer.stop()
        self.save_config()
        event.accept()


def main():
    app = QApplication(sys.argv)
    
    # Set application icon (optional)
    # app.setApplicationIcon(QIcon('clock.ico'))

    window = MultiTimezoneClock()
    window.show()

    sys.exit(app.exec())


if __name__ == '__main__':
    main()
```

---

## 📌 WERSJA 3: React.js (Modern Web)

```jsx
// MultiTimezoneClock.jsx
import React, { useState, useEffect, useCallback } from 'react';
import './MultiTimezoneClock.css';

const DEFAULT_TIMEZONES = [
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
  'Asia/Dubai',
  'America/Sao_Paulo',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Africa/Cairo',
];

const MultiTimezoneClock = () => {
  const [timezones, setTimezones] = useState(() => {
    const saved = localStorage.getItem('selectedTimezones');
    return saved ? JSON.parse(saved) : DEFAULT_TIMEZONES;
  });

  const [format24h, setFormat24h] = useState(() => {
    return localStorage.getItem('format24h') !== 'false';
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('selectedTimezones', JSON.stringify(timezones));
  }, [timezones]);

  useEffect(() => {
    localStorage.setItem('format24h', format24h);
  }, [format24h]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.classList.toggle('light-theme', theme === 'light');
  }, [theme]);

  const getTimeForTimezone = useCallback((tz) => {
    try {
      const options = {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: !format24h,
      };
      return new Intl.DateTimeFormat('en-US', options).format(currentTime);
    } catch (e) {
      return 'Invalid TZ';
    }
  }, [currentTime, format24h]);

  const getDateForTimezone = useCallback((tz) => {
    try {
      const options = {
        timeZone: tz,
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      };
      return new Intl.DateTimeFormat('en-US', options).format(currentTime);
    } catch (e) {
      return '';
    }
  }, [currentTime]);

  const getUTCOffset = useCallback((tz) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'short',
      });
      const parts = formatter.formatToParts(currentTime);
      const tzName = parts.find(p => p.type === 'timeZoneName');
      return tzName ? tzName.value : '';
    } catch (e) {
      return '';
    }
  }, [currentTime]);

  const addTimezone = useCallback((tz) => {
    if (!timezones.includes(tz)) {
      setTimezones([...timezones, tz]);
    }
  }, [timezones]);

  const removeTimezone = useCallback((tz) => {
    setTimezones(timezones.filter(t => t !== tz));
  }, [timezones]);

  const resetToDefault = useCallback(() => {
    if (window.confirm('Reset to default timezones?')) {
      setTimezones(DEFAULT_TIMEZONES);
    }
  }, []);

  const filteredTimezones = timezones.filter(tz =>
    tz.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`clock-app ${theme}`}>
      <header className="clock-header">
        <h1>🕐 MULTI-TIMEZONE CLOCK</h1>
        <p>Real-time digital clock for multiple time zones worldwide</p>

        <div className="header-controls">
          <button
            className="btn"
            onClick={() => setFormat24h(!format24h)}
          >
            Toggle Format ({format24h ? '24H' : '12H'})
          </button>
          <button
            className="btn"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            Toggle Theme 🌓
          </button>
          <button className="btn" onClick={resetToDefault}>
            ↻ Reset to Default
          </button>
        </div>

        <div className="stats">
          <div className="stat-item">
            <span>⏰ Timezones: {timezones.length}</span>
          </div>
          <div className="stat-item">
            <span>🌍 UTC: {new Intl.DateTimeFormat('en-US', {
              timeZone: 'UTC',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }).format(currentTime)}</span>
          </div>
        </div>
      </header>

      <div className="search-container">
        <input
          type="text"
          className="search-input"
          placeholder="Search timezone (e.g., 'New York', 'Tokyo')..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="clocks-grid">
        {filteredTimezones.map((tz) => (
          <div key={tz} className="clock-card">
            <div className="timezone-name">
              {tz.replace(/_/g, ' ')}
            </div>
            <div className="timezone-offset">
              {getUTCOffset(tz)}
            </div>
            <div className="digital-clock">
              {getTimeForTimezone(tz)}
            </div>
            <div className="date-display">
              {getDateForTimezone(tz)}
            </div>
            <div className="card-actions">
              <button
                className="card-btn"
                onClick={() => {
                  navigator.clipboard.writeText(`${tz}: ${getTimeForTimezone(tz)}`);
                }}
              >
                📋 Copy
              </button>
              <button
                className="card-btn"
                onClick={() => removeTimezone(tz)}
              >
                🗑️ Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <footer className="clock-footer">
        <p>🕐 Multi-Timezone Digital Clock | Made with ❤️</p>
      </footer>
    </div>
  );
};

export default MultiTimezoneClock;
```

```css
/* MultiTimezoneClock.css */
:root {
  --primary-color: #1a1a2e;
  --secondary-color: #16213e;
  --accent-color: #0f3460;
  --text-color: #eaeaea;
  --clock-color: #00ff88;
  --border-color: #00cc6f;
}

.clock-app.light {
  --primary-color: #f5f5f5;
  --secondary-color: #ffffff;
  --text-color: #333333;
  --clock-color: #1a1a1a;
  --border-color: #0066cc;
}

.clock-app {
  font-family: 'Courier New', monospace;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  color: var(--text-color);
  min-height: 100vh;
  padding: 20px;
}

.clock-header {
  text-align: center;
  margin-bottom: 40px;
}

.clock-header h1 {
  font-size: 2.5rem;
  color: var(--clock-color);
  text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
  margin-bottom: 10px;
}

.header-controls {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px;
}

.btn {
  padding: 10px 20px;
  border: 2px solid var(--border-color);
  background: transparent;
  color: var(--border-color);
  border-radius: 5px;
  cursor: pointer;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  transition: all 0.3s ease;
  text-transform: uppercase;
  font-weight: bold;
}

.btn:hover {
  background: var(--border-color);
  color: var(--primary-color);
  transform: scale(1.05);
}

.search-container {
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
}

.search-input {
  padding: 12px 20px;
  border: 2px solid var(--border-color);
  background: rgba(0, 204, 111, 0.1);
  color: var(--text-color);
  border-radius: 5px;
  font-family: 'Courier New', monospace;
  width: 100%;
  max-width: 400px;
}

.search-input:focus {
  outline: none;
  border-color: var(--clock-color);
}

.clocks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.clock-card {
  background: rgba(22, 33, 62, 0.8);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 25px;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
}

.clock-card:hover {
  transform: translateY(-5px);
  border-color: var(--clock-color);
  box-shadow: 0 10px 30px rgba(0, 255, 136, 0.3);
}

.timezone-name {
  font-size: 0.85rem;
  color: #00b4ff;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.digital-clock {
  font-size: 2.5rem;
  color: var(--clock-color);
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
  font-weight: bold;
  letter-spacing: 2px;
  margin: 10px 0;
}

.date-display {
  font-size: 0.9rem;
  color: rgba(234, 234, 234, 0.7);
  margin-bottom: 15px;
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.card-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--border-color);
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.card-btn:hover {
  background: var(--border-color);
  color: var(--primary-color);
}

.clock-footer {
  text-align: center;
  padding: 20px;
  color: rgba(234, 234, 234, 0.5);
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .clocks-grid {
    grid-template-columns: 1fr;
  }

  .header-controls {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
```

---

## 📌 KONFIGURACJA (timezones.json)

```json
{
  "defaultTimezones": [
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "America/Denver",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Rome",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Asia/Hong_Kong",
    "Asia/Singapore",
    "Asia/Dubai",
    "Asia/Bangkok",
    "Asia/Kolkata",
    "Australia/Sydney",
    "Australia/Melbourne",
    "Pacific/Auckland",
    "America/Sao_Paulo",
    "Africa/Cairo",
    "Africa/Johannesburg"
  ],
  "settings": {
    "format24h": true,
    "theme": "dark",
    "autoRefresh": true,
    "refreshInterval": 1000,
    "showDate": true,
    "showUTCOffset": true,
    "showDayOfWeek": true
  }
}
```

---

## 📌 URUCHOMIENIE

### **Web Version (HTML)**
```bash
# Otwórz plik .html w przeglądarce
# LUB uruchom serwer
python -m http.server 8000
# Otwórz: http://localhost:8000/clock.html
```

### **Desktop (PyQt)**
```bash
pip install PyQt6 pytz
python clock_desktop.py
```

### **React.js**
```bash
npx create-react-app multi-timezone-clock
cd multi-timezone-clock
# Skopiuj MultiTimezoneClock.jsx do src/
# Edytuj App.js aby importować komponent
npm start
```

---

## ✨ CECHY

✅ **Wiele stref czasowych** (10+ miast)  
✅ **Format 12h/24h**  
✅ **Ciemny/jasny motyw**  
✅ **Wyszukiwanie** stref czasowych  
✅ **Dodawanie/usuwanie** stref  
✅ **Synchronizacja z UTC**  
✅ **Zapis ustawień** (localStorage)  
✅ **Responsywny design**  
✅ **Real-time updates**  
✅ **Informacje o dacie i dniu**

---

## 🎉 GOTOWE!

Masz teraz **kompletną aplikację zegara wielostrtefowego** w 3 wersjach! 

Która wersja Ci się podoba najbardziej? 🕐