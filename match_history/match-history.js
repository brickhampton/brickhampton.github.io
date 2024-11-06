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
            day: 'numeric',
            year: 'numeric'
        });
    }

    formatGameStatus(dateStr) {
        const gameDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        gameDate.setHours(0, 0, 0, 0);
        return gameDate < today ? 'Final' : 'TBD';
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
            const homeScore = parseInt(match[homeIndex]);
            const awayScore = parseInt(match[awayIndex]);
            const gameStatus = this.formatGameStatus(match[dateIndex]);
            const gameDate = this.formatDate(match[dateIndex]);

            const gameHTML = `
                <a href="../index.html?season=${match[seasonIndex]}&game=${match[gameIndex]}" class="game-card">
                    <div class="game-container">
                        <div class="team-info ${homeScore > awayScore ? 'winner' : 'loser'}">
                            <div class="team-logo"></div>
                            <div class="team-details">
                                <div class="team-name">Brickhampton</div>
                                <div class="team-score">${homeScore}</div>
                            </div>
                        </div>
                        <div class="team-info ${awayScore > homeScore ? 'winner' : 'loser'}">
                            <div class="team-logo"></div>
                            <div class="team-details">
                                <div class="team-name">${match[opponentIndex]}</div>
                                <div class="team-score">${awayScore}</div>
                            </div>
                        </div>
                        <div class="game-meta">
                            <div class="game-status">${gameStatus}</div>
                            <div class="game-views">
                                <span>Game ${match[gameIndex]}</span>
                            </div>
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
