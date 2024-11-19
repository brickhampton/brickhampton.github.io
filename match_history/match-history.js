class MatchHistory {
    constructor() {
        this.SPREADSHEET_ID = '1vIxVfJnDiYpgD_3rqwA2R8ztHTJYf9rnkxogBcXBYnY';
        this.API_KEY = 'AIzaSyAq45prrww38ePuq3IZjQ1FLVqQd1a-Gdg';
        this.MATCH_HISTORY_TAB = 'match_history';
        this.MATCH_RANGE = 'A:H';
        this.IMAGE_URLS_TAB = 'image_urls';
        this.IMAGE_RANGE = 'A:B';
        this.filters = {
            season: 'all',
            showFuture: false
        };
        this.teamLogos = {}; // Add this to store team logos
        this.init();
    }

    async init() {
        try {
            const [matchData, imageData] = await Promise.all([
                this.fetchMatchData(),
                this.fetchImageUrls()
            ]);
            
            if (matchData.values && matchData.values.length > 0) {
                this.matchData = matchData;
                
                // Store team logos
                if (imageData.values && imageData.values.length > 0) {
                    this.mapTeamLogos(imageData.values);
                }
                
                this.setupFilters();
                this.renderMatches();
            }
        } catch (error) {
            console.error('Error initializing match history:', error);
        }
    }

    async fetchImageUrls() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${this.IMAGE_URLS_TAB}!${this.IMAGE_RANGE}?key=${this.API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch image URLs from Google Sheets');
        }
        return await response.json();
    }

    mapTeamLogos(rows) {
        // Skip header row and map team names to logo URLs
        rows.slice(1).forEach(row => {
            if (row[0] && row[1]) {
                const teamName = row[0].trim();
                const logoUrl = row[1].trim();
                this.teamLogos[teamName] = logoUrl;
            }
        });
    }

    setupFilters() {
        // Create filter container
        const filtersHTML = `
        <div class="filters">
            <div class="filter-group">
                <select class="filter-select" id="seasonFilter">
                    <option value="all">All Seasons</option>
                    ${this.getUniqueSeasons().map(season => 
                        `<option value="${season}">Season ${season}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="filter-group">
                <button class="toggle-button" id="futureGamesToggle">
                    <span class="toggle-text">Show Upcoming Games</span>
                </button>
            </div>
        </div>
    `;

        // Insert filters before games list
        const gamesList = document.getElementById('gamesList');
        gamesList.insertAdjacentHTML('beforebegin', filtersHTML);

        // Setup event listeners
        document.getElementById('seasonFilter').addEventListener('change', (e) => {
            this.filters.season = e.target.value;
            this.renderMatches();
        });

        // Optimized toggle handler
        const toggleButton = document.getElementById('futureGamesToggle');
        toggleButton.addEventListener('click', () => {
            this.filters.showFuture = !this.filters.showFuture;
            toggleButton.classList.toggle('active');
            toggleButton.querySelector('.toggle-text').textContent = 
                this.filters.showFuture ? 'Hide Upcoming Games' : 'Show Upcoming Games';
            document.getElementById('gamesList').classList.toggle('show-future');
        });
    }

    getUniqueSeasons() {
        if (!this.matchData || !this.matchData.values) return [];
        
        const headers = this.matchData.values[0].map(header => header.toLowerCase().trim());
        const seasonIndex = headers.indexOf('season');
        
        // Get unique seasons from data
        const seasons = new Set(
            this.matchData.values.slice(1)
                .map(row => row[seasonIndex])
                .filter(Boolean)
        );
        
        // Convert to array and sort
        return Array.from(seasons).sort((a, b) => {
            const seasonOrder = {
                'S25': 1,
                'W25': 2,
                'S24': 3,
                'W24': 4
            };
            // Sort in ascending order (lower numbers appear first)
            return seasonOrder[a] - seasonOrder[b];
        });
    }

    async fetchMatchData() {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.SPREADSHEET_ID}/values/${this.MATCH_HISTORY_TAB}!${this.MATCH_RANGE}?key=${this.API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch match data from Google Sheets');
        }
        return await response.json();
    }

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatGameStatus(dateStr, gameTime) {
        const gameDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        gameDate.setHours(0, 0, 0, 0);
        
        const isPlayed = gameDate < today;
        const formattedDate = this.formatDate(dateStr);
        
        if (isPlayed) {
            return {
                status: 'Final',
                detail: formattedDate
            };
        } else {
            return {
                status: gameTime || 'TBD',
                detail: formattedDate
            };
        }
    }

    getScore(scoreStr) {
        const score = parseInt(scoreStr);
        return isNaN(score) ? 0 : score;
    }

    getWinnerLoserClasses(homeScore, awayScore, isPlayed) {
        if (!isPlayed) return { home: '', away: '' };
        
        return {
            home: homeScore > awayScore ? 'winner' : 'loser',
            away: awayScore > homeScore ? 'winner' : 'loser'
        };
    }

    renderMatches() {
        if (!this.matchData || !this.matchData.values) return;

        const headers = this.matchData.values[0].map(header => header.toLowerCase().trim());
        const dateIndex = headers.indexOf('date');
        const homeIndex = headers.indexOf('home');
        const awayIndex = headers.indexOf('away');
        const opponentIndex = headers.indexOf('opponent');
        const seasonIndex = headers.indexOf('season');
        const gameIndex = headers.indexOf('game');
        const timeIndex = headers.indexOf('time');

        const gamesList = document.getElementById('gamesList');
        gamesList.innerHTML = ''; // Clear existing games

        // Apply only season filter during render
        const matches = this.matchData.values.slice(1)
            .filter(match => this.filters.season === 'all' || match[seasonIndex] === this.filters.season)
            .reverse();

        matches.forEach((match, index) => {
            const homeScore = this.getScore(match[homeIndex]);
            const awayScore = this.getScore(match[awayIndex]);
            const gameDate = new Date(match[dateIndex]);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            gameDate.setHours(0, 0, 0, 0);
            
            const isPlayed = gameDate < today;
            const isFutureGame = !isPlayed;
            const gameTime = timeIndex !== -1 ? match[timeIndex] : null;
            const gameStatus = this.formatGameStatus(match[dateIndex], gameTime);
            const classes = this.getWinnerLoserClasses(homeScore, awayScore, isPlayed);

            // Get team logos
            const brickhamptonLogo = this.teamLogos['Brickhampton'] || '';
            const opponentLogo = this.teamLogos[match[opponentIndex]] || '';

            const classNames = ['game-card'];
            if (index === 0) classNames.push('first-game');
            if (isFutureGame) classNames.push('future-game');

            const gameHTML = `
                <a href="../index.html?season=${encodeURIComponent(match[seasonIndex])}&game=${encodeURIComponent(match[gameIndex])}" 
                   class="${classNames.join(' ')}">
                    <div class="game-container">
                        <div class="teams-container">
                            <div class="team-info ${classes.home}">
                                <div class="team-logo" ${brickhamptonLogo ? `style="background-image: url('${brickhamptonLogo}');"` : ''}></div>
                                <div class="team-details">
                                    <div class="team-name">Brickhampton</div>
                                    <div class="team-score">${homeScore}</div>
                                </div>
                            </div>
                            <div class="team-info ${classes.away}">
                                <div class="team-logo" ${opponentLogo ? `style="background-image: url('${opponentLogo}');"` : ''}></div>
                                <div class="team-details">
                                    <div class="team-name">${match[opponentIndex]}</div>
                                    <div class="team-score">${awayScore}</div>
                                </div>
                            </div>
                        </div>
                        <div class="game-meta">
                            <div class="game-status">
                                <div class="status-text">${gameStatus.status}</div>
                                <div class="status-date">${gameStatus.detail}</div>
                            </div>
                            <div class="game-number">${match[seasonIndex]} Game ${match[gameIndex]}</div>
                        </div>
                    </div>
                </a>
            `;

            gamesList.insertAdjacentHTML('beforeend', gameHTML);
        });

        if (this.filters.showFuture) {
            gamesList.classList.add('show-future');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MatchHistory();
});