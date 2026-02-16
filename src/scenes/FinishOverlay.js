export default class FinishOverlay extends Phaser.Scene {
    constructor() {
        super("FinishOverlay");
    }

    create(data) {
        const { position, playerName, finishOrder, raceFinished } = data;

        // Semi-transparent overlay
        const overlay = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000,
            0.7
        ).setScrollFactor(0);

        // Finish position text
        const positionText = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 100,
            `${this.getOrdinal(position)} Place!`,
            {
                fontSize: "64px",
                fontFamily: "Arial",
                color: this.getPositionColor(position),
                fontStyle: "bold"
            }
        ).setOrigin(0.5).setScrollFactor(0);

        // Leaderboard
        const leaderboardY = this.cameras.main.centerY;
        this.add.text(
            this.cameras.main.centerX,
            leaderboardY - 20,
            "Race Results",
            {
                fontSize: "32px",
                fontFamily: "Arial",
                color: "#ffffff",
                fontStyle: "bold"
            }
        ).setOrigin(0.5).setScrollFactor(0);

        // Display finish order
        finishOrder.forEach((entry, index) => {
            const isCurrentPlayer = entry.id === this.game.socket?.id;
            this.add.text(
                this.cameras.main.centerX,
                leaderboardY + 20 + (index * 40),
                `${this.getOrdinal(entry.position)}. ${entry.name}`,
                {
                    fontSize: "24px",
                    fontFamily: "Arial",
                    color: isCurrentPlayer ? "#FFD700" : "#ffffff",
                    fontStyle: isCurrentPlayer ? "bold" : "normal"
                }
            ).setOrigin(0.5).setScrollFactor(0);
        });

        // Wait for race to finish message
        if (!raceFinished) {
            this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY + 150,
                "Waiting for other players...",
                {
                    fontSize: "20px",
                    fontFamily: "Arial",
                    color: "#aaaaaa"
                }
            ).setOrigin(0.5).setScrollFactor(0);
        } else {
            // Show return button when race is complete
            const returnButton = this.add.text(
                this.cameras.main.centerX,
                this.cameras.main.centerY + 150,
                "Return to Menu",
                {
                    fontSize: "24px",
                    fontFamily: "Arial",
                    color: "#ffffff",
                    backgroundColor: "#4CAF50",
                    padding: { x: 20, y: 10 }
                }
            ).setOrigin(0.5).setScrollFactor(0).setInteractive();

            returnButton.on("pointerdown", () => {
                this.scene.stop("RaceScene");
                this.scene.stop("UIScene");
                this.scene.stop("FinishOverlay");
                this.scene.start("MenuScene"); // or whatever your menu scene is called
            });
        }
    }

    getOrdinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    getPositionColor(position) {
        switch (position) {
            case 1: return "#FFD700"; // Gold
            case 2: return "#C0C0C0"; // Silver
            case 3: return "#CD7F32"; // Bronze
            default: return "#ffffff"; // White
        }
    }
}