class MatchHistory {
    constructor() {
        this.SPREADSHEET_ID = '1vIxVfJnDiYpgD_3rqwA2R8ztHTJYf9rnkxogBcXBYnY';
        this.API_KEY = 'AIzaSyAq45prrww38ePuq3IZjQ1FLVqQd1a-Gdg';
        this.MATCH_HISTORY_TAB = 'match_history';
        this.MATCH_RANGE = 'A:G';
        this.init();
    }

    async init() {
        try {
            const matchData = await this.fetchMatchData();
            if (matchData.values && matchData.values.length > 0) {
                this.renderMatches(matchData.values);
            }
        } catch (error) {
            console.error('Error initializing match history:', error);
        }
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
            day: 'numeric'
        });
    }

    formatTime(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    formatGameStatus(dateStr) {
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
                status: this.formatTime(dateStr),
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

    renderMatches(data) {
        const headers = data[0].map(header => header.toLowerCase().trim());
        const dateIndex = headers.indexOf('date');
        const homeIndex = headers.indexOf('home');
        const awayIndex = headers.indexOf('away');
        const opponentIndex = headers.indexOf('opponent');
        const seasonIndex = headers.indexOf('season');
        const gameIndex = headers.indexOf('game');

        const gamesList = document.getElementById('gamesList');
        const matches = data.slice(1).reverse(); // Reverse to show newest first

        matches.forEach(match => {
            const homeScore = this.getScore(match[homeIndex]);
            const awayScore = this.getScore(match[awayIndex]);
            const gameDate = new Date(match[dateIndex]);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            gameDate.setHours(0, 0, 0, 0);
            
            const isPlayed = gameDate < today;
            const gameStatus = this.formatGameStatus(match[dateIndex]);
            const classes = this.getWinnerLoserClasses(homeScore, awayScore, isPlayed);

            const gameHTML = `
                <a href="../index.html?season=${encodeURIComponent(match[seasonIndex])}&game=${encodeURIComponent(match[gameIndex])}" class="game-card">
                    <div class="game-container">
                        <div class="teams-container">
                            <div class="team-info ${classes.home}">
                                <div class="team-logo"></div>
                                <div class="team-details">
                                    <div class="team-name">Brickhampton</div>
                                    <div class="team-score">${homeScore}</div>
                                </div>
                            </div>
                            <div class="team-info ${classes.away}">
                                <div class="team-logo"></div>
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MatchHistory();
});
