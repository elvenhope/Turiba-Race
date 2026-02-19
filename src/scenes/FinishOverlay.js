export default class FinishOverlay extends Phaser.Scene {
    constructor() {
        super("FinishOverlay");
    }

    create(data) {
        const { position, playerName, finishOrder, raceFinished } = data;

        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // Get the local socket id from RaceScene where the socket actually lives
        const raceScene = this.scene.get("RaceScene");
        const mySocketId = raceScene?.socket?.id ?? null;

        // Semi-transparent overlay
        this.add.rectangle(cx, cy,
            this.cameras.main.width,
            this.cameras.main.height,
            0x000000, 0.7
        ).setScrollFactor(0);

        // Finish position text
        this.add.text(cx, cy - 140,
            `${this.getOrdinal(position)} Place!`,
            {
                fontSize: "64px",
                fontFamily: "Arial",
                color: this.getPositionColor(position),
                fontStyle: "bold",
            }
        ).setOrigin(0.5).setScrollFactor(0);

        // Leaderboard header
        this.add.text(cx, cy - 60,
            "Race Results",
            {
                fontSize: "32px",
                fontFamily: "Arial",
                color: "#ffffff",
                fontStyle: "bold",
            }
        ).setOrigin(0.5).setScrollFactor(0);

        // Finish order entries
        finishOrder.forEach((entry, index) => {
            const isMe  = mySocketId && entry.id === mySocketId;
            const isNPC = entry.isNPC === true || String(entry.id).startsWith("npc_");

            // Label: add a bot tag for NPCs
            const label = isNPC
                ? `${this.getOrdinal(entry.position)}. ${entry.name} [BOT]`
                : `${this.getOrdinal(entry.position)}. ${entry.name}`;

            const color = isMe
                ? "#FFD700"   // gold for local player
                : isNPC
                    ? "#aaaaaa"   // grey for bots
                    : "#ffffff";  // white for other humans

            this.add.text(cx, cy - 10 + (index * 36), label, {
                fontSize: "24px",
                fontFamily: "Arial",
                color,
                fontStyle: isMe ? "bold" : "normal",
            }).setOrigin(0.5).setScrollFactor(0);
        });

        // Bottom status / button
        if (!raceFinished) {
            this.add.text(cx, cy + 170,
                "Waiting for other players...",
                {
                    fontSize: "20px",
                    fontFamily: "Arial",
                    color: "#aaaaaa",
                }
            ).setOrigin(0.5).setScrollFactor(0);
        } else {
            const returnButton = this.add.text(cx, cy + 170,
                "Return to Menu",
                {
                    fontSize: "24px",
                    fontFamily: "Arial",
                    color: "#ffffff",
                    backgroundColor: "#4CAF50",
                    padding: { x: 20, y: 10 },
                }
            ).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

            returnButton.on("pointerover", () => returnButton.setColor("#FFD700"));
            returnButton.on("pointerout",  () => returnButton.setColor("#ffffff"));
            returnButton.on("pointerdown", () => {
                this.scene.stop("RaceScene");
                this.scene.stop("UIScene");
                this.scene.stop("FinishOverlay");
                this.scene.start("MenuScene");
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
            case 1:  return "#FFD700"; // Gold
            case 2:  return "#C0C0C0"; // Silver
            case 3:  return "#CD7F32"; // Bronze
            default: return "#ffffff";
        }
    }
}