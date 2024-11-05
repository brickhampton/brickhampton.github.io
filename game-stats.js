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
            per: ['per', 'efficiency'],
            game: ['game', 'game number'],
            season: ['season'] // Add season to required stats
        };
        
        this.columnMap = {};
        this.allGameData = [];
        this.currentGameIndex = 0;
        this.matchData = null;
        this.currentSort = { column: null, ascending: null };
        this.init();
        this.setupGameNavigation();
        this.setupColumnSorting();
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
        const season = this.getValue(currentGame, 'season');
        gameIndicator.textContent = `${season} Game ${gameNumber}`;
    }

    async init() {
        try {
            const [gameData, matchData] = await Promise.all([
                this.fetchSheetData(),
                this.fetchMatchData()
            ]);
            
            if (gameData.values && gameData.values.length > 0) {
                this.mapHeadersToRequiredStats(gameData.values[0]);
                
                // Store match data
                if (matchData.values && matchData.values.length > 0) {
                    this.matchData = matchData;
                }

                // Group data by game number
                const rows = gameData.values.slice(1);
                this.gameGroups = this.groupByGame(rows);
                
                // Find the latest completed game
                this.currentGameIndex = this.findLatestCompletedGameIndex();
                
                this.renderCurrentGame();
                this.updateGameNavigation();
                this.updateGameScore();
            }
        } catch (error) {
            console.error('Error initializing game stats:', error);
        }
    }

    findLatestCompletedGameIndex() {
        if (!this.matchData || !this.matchData.values || !this.gameGroups) {
            return 0;
        }

        const headers = this.matchData.values[0].map(header => header.toLowerCase().trim());
        const dateIndex = headers.indexOf('date');
        const seasonIndex = headers.indexOf('season');
        const gameIndex = headers.indexOf('game');
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Loop through games in reverse order to find the latest completed game
        for (let i = this.gameGroups.length - 1; i >= 0; i--) {
            const currentGame = this.gameGroups[i][0];
            const currentGameNumber = this.getValue(currentGame, 'game');
            const currentSeason = this.getValue(currentGame, 'season');
            
            // Find matching match data
            const matchRow = this.matchData.values.find(row => 
                row[gameIndex] === currentGameNumber && 
                row[seasonIndex] === currentSeason
            );
            
            if (matchRow) {
                const gameDate = new Date(matchRow[dateIndex]);
                gameDate.setHours(0, 0, 0, 0);
                
                if (gameDate < today) {
                    return i;
                }
            }
        }
        
        // If no completed games found, return the first game
        return 0;
    }

    groupByGame(rows) {
        const gameMap = new Map();
        
        rows.forEach(row => {
            const gameNumber = this.getValue(row, 'game');
            const season = this.getValue(row, 'season');
            const gameKey = `${season}-${gameNumber}`;
            
            if (!gameMap.has(gameKey)) {
                gameMap.set(gameKey, []);
            }
            gameMap.get(gameKey).push(row);
        });

        // Custom season comparison function
        const compareSeasons = (seasonA, seasonB) => {
            // Define season order (add more seasons as needed)
            const seasonOrder = {
                'W24': 1,
                'S24': 2,
                'W25': 3,
                'S25': 4
                // Add future seasons with higher numbers
                // 'F24': 3,
                // 'W25': 4,
                // etc.
            };
            
            return seasonOrder[seasonA] - seasonOrder[seasonB];
        };

        // Convert to array and sort by season and game number
        return Array.from(gameMap.values())
            .sort((a, b) => {
                const seasonA = this.getValue(a[0], 'season');
                const seasonB = this.getValue(b[0], 'season');
                const gameA = parseInt(this.getValue(a[0], 'game'));
                const gameB = parseInt(this.getValue(b[0], 'game'));
                
                // First compare seasons using custom ordering
                const seasonComparison = compareSeasons(seasonA, seasonB);
                if (seasonComparison !== 0) {
                    return seasonComparison;
                }
                // If seasons are the same, compare game numbers
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

    formatGameStatus(dateStr) {
        const gameDate = new Date(dateStr);
        const today = new Date();
        // Reset time part to compare just the dates
        today.setHours(0, 0, 0, 0);
        gameDate.setHours(0, 0, 0, 0);
        
        return gameDate < today ? 'Final' : 'TBD';
    }

    formatDate(dateStr) {
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
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

        if (homeIndex === -1 || awayIndex === -1 || opponentIndex === -1 || seasonIndex === -1) {
            console.error('Required columns not found in match_history');
            return;
        }

        // Find the matching game in match history using both season and game number
        const currentGame = this.gameGroups[this.currentGameIndex][0];
        const currentGameNumber = this.getValue(currentGame, 'game');
        const currentSeason = this.getValue(currentGame, 'season');
        
        const matchRow = this.matchData.values.find(row => 
            row[gameIndex] === currentGameNumber && 
            row[seasonIndex] === currentSeason
        );
        
        if (!matchRow) {
            console.error('No matching game found in match history');
            return;
        }

        // Get game status
        const gameStatus = this.formatGameStatus(matchRow[dateIndex]);

        // Update game info container
        const gameInfoHTML = `
            <div class="game-status">${gameStatus}</div>
            <div class="game-date">${this.formatDate(matchRow[dateIndex])}</div>
            <div class="game-number">${currentSeason} Game ${matchRow[gameIndex]}</div>
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
        // Return empty values if there are no attempts
        if (attempts === 0) {
            return {
                value: '',
                isPerfect: false
            };
        }
        
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
            percentage: percentageResult.value, // This will now be empty string when 0/0
            isPerfect: percentageResult.isPerfect,
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

    setupColumnSorting() {
        const statsColumns = document.querySelector('.stats-columns');
        const columns = statsColumns.children;
        
        // Add sorting indicators and click handlers to all columns except the player name
        Array.from(columns).forEach((column, index) => {
            if (index === 0) return; // Skip the player name column
            
            // Modify the wrapper structure to maintain alignment
            const originalContent = column.textContent;
            column.innerHTML = originalContent;
            
            // Add sort indicator as a pseudo-element using a class
            column.style.cursor = 'pointer';
            column.classList.add('sortable-column');
            
            // Add click handler
            column.addEventListener('click', () => this.handleColumnSort(index));
        });
    
        // Update CSS for sort indicators
        const style = document.createElement('style');
        style.textContent = `
            .sortable-column {
                position: relative;
                user-select: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
            }
            .sort-asc::after,
            .sort-desc::after {
                content: '';
                display: inline-block;
                width: 0;
                height: 0;
                margin-left: 4px;
            }
            .sort-asc::after {
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-bottom: 4px solid var(--accent-blue);
            }
            .sort-desc::after {
                border-left: 4px solid transparent;
                border-right: 4px solid transparent;
                border-top: 4px solid var(--accent-blue);
            }
            .sortable-column:hover {
                color: var(--accent-blue);
            }
        `;
        document.head.appendChild(style);
    }

    handleColumnSort(columnIndex) {
        const columns = ['player', 'pts', 'reb', 'ast', 'stl', 'blk', 'fgPercent', 'fg', 'threeFg', 'ft', 'tsPercent', 'to', 'per'];
        const column = columns[columnIndex];
        
        // Three-state cycling logic
        if (this.currentSort.column !== column) {
            // New column: start with descending
            this.currentSort.column = column;
            this.currentSort.ascending = false;
        } else {
            // Same column: cycle through states
            if (this.currentSort.ascending === false) {
                // Currently descending -> switch to ascending
                this.currentSort.ascending = true;
            } else if (this.currentSort.ascending === true) {
                // Currently ascending -> clear sort
                this.currentSort.column = null;
                this.currentSort.ascending = null;
            }
        }

        // Update visual indicators
        this.updateSortIndicators(columnIndex);
        
        // Re-render the current game with the new sort
        this.renderCurrentGame();
    }

    updateSortIndicators(columnIndex) {
        const columns = document.querySelector('.stats-columns').children;
        Array.from(columns).forEach((col, i) => {
            col.classList.remove('sort-asc', 'sort-desc');
            if (i === columnIndex && this.currentSort.ascending !== null) {
                col.classList.add(this.currentSort.ascending ? 'sort-asc' : 'sort-desc');
            }
        });
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
                pts: parseInt(this.getValue(row, 'pts')) || 0,
                reb: parseInt(this.getValue(row, 'reb')) || 0,
                ast: parseInt(this.getValue(row, 'ast')) || 0,
                stl: parseInt(this.getValue(row, 'stl')) || 0,
                blk: parseInt(this.getValue(row, 'blk')) || 0,
                fgStats,
                fgPercent: parseFloat(fgStats.percentage) || 0,
                threeFgStats,
                ftStats,
                tsPercentage,
                to: parseInt(this.getValue(row, 'to')) || 0,
                per: this.getValue(row, 'per')  // Keep as string to preserve formatting
            };
        });

        // Sort players if a sort is active
        if (this.currentSort.column && this.currentSort.ascending !== null) {
            players.sort((a, b) => {
                let aValue, bValue;
                
                if (this.currentSort.column === 'per') {
                    // For PER, convert to number for sorting
                    aValue = parseInt(a.per) || 0;
                    bValue = parseInt(b.per) || 0;
                } else {
                    // Rest of the sorting logic remains the same
                    switch (this.currentSort.column) {
                        case 'fgPercent':
                            aValue = a.fgPercent;
                            bValue = b.fgPercent;
                            break;
                        case 'tsPercent':
                            aValue = parseFloat(a.tsPercentage.value);
                            bValue = parseFloat(b.tsPercentage.value);
                            break;
                        case 'fg':
                            aValue = a.fgStats.made;
                            bValue = b.fgStats.made;
                            break;
                        case 'threeFg':
                            aValue = a.threeFgStats.made;
                            bValue = b.threeFgStats.made;
                            break;
                        case 'ft':
                            aValue = a.ftStats.made;
                            bValue = b.ftStats.made;
                            break;
                        default:
                            aValue = a[this.currentSort.column];
                            bValue = b[this.currentSort.column];
                    }
                }
                
                if (this.currentSort.ascending) {
                    return aValue - bValue;
                } else {
                    return bValue - aValue;
                }
            });
        }

        // Calculate team totals and update display
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
        percentages[0].textContent = fgPercentage.value ? `${fgPercentage.value}%` : '';
        if (fgPercentage.isPerfect) {
            percentages[0].classList.add('perfect-percentage');
        } else {
            percentages[0].classList.remove('perfect-percentage');
        }

        // Update 3FG
        const threeFgPercentage = this.formatPercentage(stats.threeFg.made, stats.threeFg.attempts);
        statValues[1].textContent = `${stats.threeFg.made}/${stats.threeFg.attempts}`;
        percentages[1].textContent = threeFgPercentage.value ? `${threeFgPercentage.value}%` : '';
        if (threeFgPercentage.isPerfect) {
            percentages[1].classList.add('perfect-percentage');
        } else {
            percentages[1].classList.remove('perfect-percentage');
        }

        // Update FT
        const ftPercentage = this.formatPercentage(stats.ft.made, stats.ft.attempts);
        statValues[2].textContent = `${stats.ft.made}/${stats.ft.attempts}`;
        percentages[2].textContent = ftPercentage.value ? `${ftPercentage.value}%` : '';
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
                <div>${player.per}</div>
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
