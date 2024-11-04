// Configuration
const SPREADSHEET_ID = '1vIxVfJnDiYpgD_3rqwA2R8ztHTJYf9rnkxogBcXBYnY';
const API_KEY = 'AIzaSyAq45prrww38ePuq3IZjQ1FLVqQd1a-Gdg';
const SHEET_NAME = 'master_data';
const MATCH_HISTORY_TAB = 'match_history';
const RANGE = 'A:Z';
const MATCH_RANGE = 'A:G';

class GameStats {
    constructor() {
        this.requiredStats = {
            player: ['player', 'name', 'player name'],
            pts: ['pts', 'points', 'total points'],
            reb: ['reb', 'rebounds', 'total rebounds'],
            ast: ['ast', 'assists', 'total assists'],
            stl: ['stl', 'steals'],
            blk: ['blk', 'blocks'],
            fgm: ['fgm', 'fg made', 'field goals made'],
            fga: ['fga', 'fg attempted', 'field goals attempted'],
            threeFgm: ['3fgm', '3pm', 'three pointers made'],
            threeFga: ['3fga', '3pa', 'three pointers attempted'],
            ftm: ['ftm', 'ft made', 'free throws made'],
            fta: ['fta', 'ft attempted', 'free throws attempted'],
            tsPercent: ['ts%', 'true shooting', 'true shooting percentage'],
            to: ['to', 'turnovers'],
            eff: ['eff', 'efficiency'],
            game: ['game', 'game number']
        };
        
        this.columnMap = {};
        this.allGameData = [];
        this.currentGameIndex = 0;
        this.matchData = null;
        this.init();
        this.setupGameNavigation();
    }

    setupGameNavigation() {
        const navContainer = document.createElement('div');
        navContainer.className = 'game-navigation';
        navContainer.innerHTML = `
            <button id="prevGame" class="nav-button">←</button>
            <span id="gameIndicator"></span>
            <button id="nextGame" class="nav-button">→</button>
        `;

        const scoreHeader = document.querySelector('.score-header');
        scoreHeader.after(navContainer);

        document.getElementById('prevGame').addEventListener('click', () => this.changeGame(-1));
        document.getElementById('nextGame').addEventListener('click', () => this.changeGame(1));
    }

    changeGame(direction) {
        const newIndex = this.currentGameIndex + direction;
        if (newIndex >= 0 && newIndex < this.gameGroups.length) {
            this.currentGameIndex = newIndex;
            this.renderCurrentGame();
            this.updateGameNavigation();
            this.updateGameScore();
        }
    }

    updateGameNavigation() {
        const prevButton = document.getElementById('prevGame');
        const nextButton = document.getElementById('nextGame');
        const gameIndicator = document.getElementById('gameIndicator');

        prevButton.disabled = this.currentGameIndex === 0;
        nextButton.disabled = this.currentGameIndex === this.gameGroups.length - 1;

        const currentGame = this.gameGroups[this.currentGameIndex][0];
        const gameNumber = this.getValue(currentGame, 'game');
        gameIndicator.textContent = `Game ${gameNumber}`;
    }

    async init() {
        try {
            const [gameData, matchData] = await Promise.all([
                this.fetchSheetData(),
                this.fetchMatchData()
            ]);
            
            if (gameData.values && gameData.values.length > 0) {
                this.mapHeadersToRequiredStats(gameData.values[0]);
                
                // Group data by game number
                const rows = gameData.values.slice(1);
                this.gameGroups = this.groupByGame(rows);
                
                // Store match data
                if (matchData.values && matchData.values.length > 0) {
                    this.matchData = matchData;
                }
                
                // Initialize with the latest game
                this.currentGameIndex = this.gameGroups.length - 1;
                this.renderCurrentGame();
                this.updateGameNavigation();
                this.updateGameScore();
            }
        } catch (error) {
            console.error('Error initializing game stats:', error);
        }
    }

    groupByGame(rows) {
        const gameMap = new Map();
        
        rows.forEach(row => {
            const gameNumber = this.getValue(row, 'game');
            if (!gameMap.has(gameNumber)) {
                gameMap.set(gameNumber, []);
            }
            gameMap.get(gameNumber).push(row);
        });

        return Array.from(gameMap.values())
            .sort((a, b) => {
                const gameA = parseInt(this.getValue(a[0], 'game'));
                const gameB = parseInt(this.getValue(b[0], 'game'));
                return gameA - gameB;
            });
    }

    renderCurrentGame() {
        if (this.gameGroups && this.gameGroups.length > 0) {
            const currentGameData = this.gameGroups[this.currentGameIndex];
            this.renderGameData(currentGameData);
        }
    }

    async fetchSheetData() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!${RANGE}?key=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch data from Google Sheets');
        }
        return await response.json();
    }

    async fetchMatchData() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${MATCH_HISTORY_TAB}!${MATCH_RANGE}?key=${API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch match data from Google Sheets');
        }
        return await response.json();
    }

    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }).replace(',', ',');
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateStr;
        }
    }

    updateGameScore() {
        if (!this.matchData || !this.matchData.values) return;

        // Get headers to find correct columns
        const headers = this.matchData.values[0].map(header => header.toLowerCase().trim());
        const homeIndex = headers.indexOf('home');
        const awayIndex = headers.indexOf('away');
        const opponentIndex = headers.indexOf('opponent');
        const dateIndex = headers.indexOf('date');
        const seasonIndex = headers.indexOf('season');
        const gameIndex = headers.indexOf('game');

        if (homeIndex === -1 || awayIndex === -1 || opponentIndex === -1) {
            console.error('Required columns not found in match_history');
            return;
        }

        // Find the matching game in match history
        const currentGame = this.gameGroups[this.currentGameIndex][0];
        const currentGameNumber = this.getValue(currentGame, 'game');
        
        const matchRow = this.matchData.values.find(row => row[gameIndex] === currentGameNumber);
        
        if (!matchRow) {
            console.error('No matching game found in match history');
            return;
        }

        // Update game info container
        const gameInfoHTML = `
            <div class="game-date">${this.formatDate(matchRow[dateIndex])}</div>
            <div class="game-number">Game ${matchRow[gameIndex]} • ${matchRow[seasonIndex]}</div>
        `;

        document.querySelector('.game-info').innerHTML = gameInfoHTML;
        
        // Get scores as numbers for comparison
        const homeScore = parseInt(matchRow[homeIndex]) || 0;
        const awayScore = parseInt(matchRow[awayIndex]) || 0;

        // Get team info elements
        const teamAInfo = document.getElementById('team-a-score').parentElement;
        const teamBInfo = document.getElementById('team-b-score').parentElement;

        // Update team names and scores
        document.getElementById('team-a-name').textContent = 'Brickhampton';
        document.getElementById('team-b-name').textContent = matchRow[opponentIndex];
        document.getElementById('team-a-score').textContent = homeScore;
        document.getElementById('team-b-score').textContent = awayScore;

        // Remove any existing winner/loser classes
        teamAInfo.classList.remove('winner', 'loser', 'winner-left');
        teamBInfo.classList.remove('winner', 'loser', 'winner-right');

        // Apply winner/loser styling based on score comparison
        if (homeScore > awayScore) {
            teamAInfo.classList.add('winner', 'winner-left');
            teamBInfo.classList.add('loser');
        } else if (awayScore > homeScore) {
            teamAInfo.classList.add('loser');
            teamBInfo.classList.add('winner', 'winner-right');
        } else {
            teamAInfo.classList.add('winner');
            teamBInfo.classList.add('winner');
        }
    }

    mapHeadersToRequiredStats(headers) {
        const headerMap = headers.reduce((map, header, index) => {
            map[header.toLowerCase().trim()] = index;
            return map;
        }, {});

        for (const [stat, possibleHeaders] of Object.entries(this.requiredStats)) {
            for (const header of possibleHeaders) {
                if (headerMap.hasOwnProperty(header)) {
                    this.columnMap[stat] = headerMap[header];
                    break;
                }
            }
        }
    }

    getValue(row, statKey, defaultValue = '0') {
        const index = this.columnMap[statKey];
        return index !== undefined ? (row[index] || defaultValue) : defaultValue;
    }

    calculateShotStats(made, attempted) {
        const madeNum = parseInt(made) || 0;
        const attemptsNum = parseInt(attempted) || 0;
        const percentage = attemptsNum > 0 ? ((madeNum / attemptsNum) * 100).toFixed(1) : '0.0';
        return {
            made: madeNum,
            attempts: attemptsNum,
            percentage,
            display: `${madeNum}/${attemptsNum}`
        };
    }

    async fetchAndDisplayTeamData() {
        try {
            const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Teams!A:C?key=${API_KEY}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.values && data.values.length >= 2) {
                document.getElementById('team-a-name').textContent = data.values[0][0] || 'Team A';
                document.getElementById('team-a-score').textContent = data.values[0][1] || '0';
                document.getElementById('team-b-name').textContent = data.values[1][0] || 'Team B';
                document.getElementById('team-b-score').textContent = data.values[1][1] || '0';
            }
        } catch (error) {
            console.error('Error fetching team data:', error);
        }
    }

    calculateTeamStats(players) {
        const stats = {
            fg: { made: 0, attempts: 0 },
            threeFg: { made: 0, attempts: 0 },
            ft: { made: 0, attempts: 0 },
            reb: 0,
            ast: 0,
            to: 0
        };

        players.forEach(player => {
            // Add FG stats
            stats.fg.made += player.fgStats.made;
            stats.fg.attempts += player.fgStats.attempts;

            // Add 3FG stats
            stats.threeFg.made += player.threeFgStats.made;
            stats.threeFg.attempts += player.threeFgStats.attempts;

            // Add FT stats
            stats.ft.made += player.ftStats.made;
            stats.ft.attempts += player.ftStats.attempts;

            // Add other stats
            stats.reb += parseInt(player.reb) || 0;
            stats.ast += parseInt(player.ast) || 0;
            stats.to += parseInt(player.to) || 0;
        });

        return stats;
    }

    formatPercentage(made, attempts, isTS = false) {
        if (attempts === 0) return '';
        const percentage = (made / attempts) * 100;
        
        // For TS%, we consider > 100% as perfect
        const isPerfect = isTS ? percentage >= 100 : percentage === 100;
        
        // Format number based on whether it's perfect
        const formattedNumber = isPerfect ? Math.round(percentage) : percentage.toFixed(1);
        
        return {
            value: formattedNumber,
            isPerfect
        };
    }

    calculateShotStats(made, attempted) {
        const madeNum = parseInt(made) || 0;
        const attemptsNum = parseInt(attempted) || 0;
        const percentageResult = this.formatPercentage(madeNum, attemptsNum);
        return {
            made: madeNum,
            attempts: attemptsNum,
            percentage: typeof percentageResult === 'string' ? percentageResult : percentageResult.value,
            isPerfect: typeof percentageResult === 'string' ? false : percentageResult.isPerfect,
            display: `${madeNum}/${attemptsNum}`
        };
    }

    formatTSPercentage(value) {
        const percentage = parseFloat(value) || 0;
        const isPerfect = percentage >= 100;
        return {
            value: isPerfect ? Math.round(percentage) : percentage.toFixed(1),
            isPerfect
        };
    }

    renderGameData(rows) {
        const players = rows.map(row => {
            // Calculate all shooting statistics
            const fgStats = this.calculateShotStats(
                this.getValue(row, 'fgm'),
                this.getValue(row, 'fga')
            );

            const threeFgStats = this.calculateShotStats(
                this.getValue(row, 'threeFgm'),
                this.getValue(row, 'threeFga')
            );

            const ftStats = this.calculateShotStats(
                this.getValue(row, 'ftm'),
                this.getValue(row, 'fta')
            );

            const tsPercentage = this.formatTSPercentage(this.getValue(row, 'tsPercent'));

            return {
                name: this.getValue(row, 'player', ''),
                pts: this.getValue(row, 'pts'),
                reb: this.getValue(row, 'reb'),
                ast: this.getValue(row, 'ast'),
                stl: this.getValue(row, 'stl'),
                blk: this.getValue(row, 'blk'),
                fgStats,
                threeFgStats,
                ftStats,
                tsPercentage,
                to: this.getValue(row, 'to'),
                eff: this.getValue(row, 'eff')
            };
        });

        // Calculate team totals and update display...
        const teamStats = this.calculateTeamStats(players);
        this.updateTeamStats(teamStats);
        this.updatePlayerRows(players);
    }

    updateTeamStats(stats) {
        const statValues = document.querySelectorAll('.stat-value');
        const percentages = document.querySelectorAll('.stat-value-percentage');

        // Update FG
        const fgPercentage = this.formatPercentage(stats.fg.made, stats.fg.attempts);
        statValues[0].textContent = `${stats.fg.made}/${stats.fg.attempts}`;
        percentages[0].textContent = `${fgPercentage.value}%`;
        if (fgPercentage.isPerfect) {
            percentages[0].classList.add('perfect-percentage');
        } else {
            percentages[0].classList.remove('perfect-percentage');
        }

        // Update 3FG
        const threeFgPercentage = this.formatPercentage(stats.threeFg.made, stats.threeFg.attempts);
        statValues[1].textContent = `${stats.threeFg.made}/${stats.threeFg.attempts}`;
        percentages[1].textContent = `${threeFgPercentage.value}%`;
        if (threeFgPercentage.isPerfect) {
            percentages[1].classList.add('perfect-percentage');
        } else {
            percentages[1].classList.remove('perfect-percentage');
        }

        // Update FT
        const ftPercentage = this.formatPercentage(stats.ft.made, stats.ft.attempts);
        statValues[2].textContent = `${stats.ft.made}/${stats.ft.attempts}`;
        percentages[2].textContent = `${ftPercentage.value}%`;
        if (ftPercentage.isPerfect) {
            percentages[2].classList.add('perfect-percentage');
        } else {
            percentages[2].classList.remove('perfect-percentage');
        }

        // Update other stats
        statValues[3].textContent = stats.reb;
        statValues[4].textContent = stats.ast;
        statValues[5].textContent = stats.to;
    }

    updatePlayerRows(players) {
        const container = document.querySelector('.scrollable-wrapper');
        const playerRowsHTML = players.map(player => `
            <div class="player-row">
                <div class="fixed-column">
                    <div class="player-photo"></div>
                    <div class="player-name">${player.name}</div>
                </div>
                <div>${player.pts}</div>
                <div>${player.reb}</div>
                <div>${player.ast}</div>
                <div>${player.stl}</div>
                <div>${player.blk}</div>
                <div class="${player.fgStats.isPerfect ? 'perfect-percentage' : ''}">${player.fgStats.percentage}</div>
                <div>${player.fgStats.display}</div>
                <div>${player.threeFgStats.display}</div>
                <div>${player.ftStats.display}</div>
                <div class="${player.tsPercentage.isPerfect ? 'perfect-percentage' : ''}">${player.tsPercentage.value}</div>
                <div>${player.to}</div>
                <div>${player.eff}</div>
            </div>
        `).join('');

        // Clear existing player rows
        const existingRows = container.querySelectorAll('.player-row');
        existingRows.forEach(row => row.remove());
        
        // Insert new player rows after stats-columns
        const statsColumns = container.querySelector('.stats-columns');
        statsColumns.insertAdjacentHTML('afterend', playerRowsHTML);
    }
}

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GameStats();
});
