export default class CharScene extends Phaser.Scene {
    constructor() {
        super("CharScene");

        this.characters = [
            { name: "Tourism Faculty", path: "assets/Characters/tourism.png", car_path: "assets/Cars/Tourism.png" },
            { name: "IT Faculty", path: "assets/Characters/ITF.png", car_path: "assets/Cars/ITF.png" },
            { name: "Law Faculty", path: "assets/Characters/law.png", car_path: "assets/Cars/Law.png" },
            { name: "Business Faculty", path: "assets/Characters/business.png", car_path: "assets/Cars/Business.png" },
			{ name: "Communications Faculty", path: "assets/Characters/communications.png", car_path: "assets/Cars/Communications.png" },
			{ name: "Healthcare Department", path: "assets/Characters/healthcare.png", car_path: "assets/Cars/Healthcare.png" },
			{ name: "Organization Department", path: "assets/Characters/organization.png", car_path: "assets/Cars/Organization.png" },
        ];

        this.currentIndex = 0;

        this.charHeight = 400;
        const charAspect = 650 / 1280;
        this.charWidth = this.charHeight * charAspect;

        this.socket = null;
        this.isConnecting = false;
    }

    preload() {
        this.characters.forEach(char => {
            this.load.image(char.name, char.path);
        });

        this.load.image("arrow_left", "assets/arrow_left.png");
        this.load.image("arrow_right", "assets/arrow_right.png");
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        const arrowHeight = 80;
        const arrowWidth = arrowHeight * (3860 / 3200);

        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0xAEDFF7, 0xAEDFF7, 0x6EC1F7, 0x6EC1F7, 1);
        graphics.fillRect(0, 0, w, h);

        this.charNameText = this.add.text(
            w / 2,
            h * 0.15,
            this.characters[this.currentIndex].name,
            { fontSize: "36px", color: "#ffffff", fontFamily: "Arial" }
        ).setOrigin(0.5);

        this.charImage = this.add.image(
            w / 2,
            h * 0.45,
            this.characters[this.currentIndex].name
        )
        .setOrigin(0.5)
        .setDisplaySize(this.charWidth, this.charHeight);

        this.leftArrow = this.add.image(w * 0.2, h / 2, "arrow_left")
            .setInteractive({ useHandCursor: true })
            .setDisplaySize(arrowWidth, arrowHeight);
        this.leftArrow.on("pointerdown", () => this.switchCharacter(-1));

        this.rightArrow = this.add.image(w * 0.8, h / 2, "arrow_right")
            .setInteractive({ useHandCursor: true })
            .setDisplaySize(arrowWidth, arrowHeight);
        this.rightArrow.on("pointerdown", () => this.switchCharacter(1));

        const buttonWidth = 220;
        const buttonHeight = 60;

        this.chooseBtn = this.add.container(w / 2, h * 0.8);

        const rect = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x1E90FF)
            .setStrokeStyle(2, 0xffffff)
            .setRounded(10);

        const btnText = this.add.text(0, 0, "Choose", {
            fontSize: "24px",
            color: "#ffffff",
            fontFamily: "Arial",
            fontStyle: "bold",
        }).setOrigin(0.5);

        this.chooseBtn.add([rect, btnText]);
        this.chooseBtn.setSize(buttonWidth, buttonHeight);
        this.chooseBtn.setInteractive({ useHandCursor: true });

        this.chooseBtn.on("pointerdown", () => this.chooseCharacter());

        this.chooseBtn.on("pointerover", () => {
            this.tweens.add({
                targets: this.chooseBtn,
                scale: 1.05,
                duration: 100,
                ease: "Sine.easeOut"
            });
        });

        this.chooseBtn.on("pointerout", () => {
            this.tweens.add({
                targets: this.chooseBtn,
                scale: 1,
                duration: 100,
                ease: "Sine.easeOut"
            });
        });

        // Waiting text (hidden initially)
        this.waitingText = this.add.text(
            w / 2,
            h * 0.92,
            "",
            { fontSize: "20px", color: "#ffffff" }
        ).setOrigin(0.5);

        // Reset connection state when scene is created
        this.isConnecting = false;
        if (this.socket) {
            this.cleanupSocket();
        }
    }

    switchCharacter(direction) {
        const w = this.scale.width;
        const h = this.scale.height;

        this.currentIndex = Phaser.Math.Wrap(
            this.currentIndex + direction,
            0,
            this.characters.length
        );

        const oldChar = this.charImage;

        const newChar = this.add.image(
            w / 2 + direction * w,
            h * 0.45,
            this.characters[this.currentIndex].name
        )
        .setOrigin(0.5)
        .setDisplaySize(this.charWidth, this.charHeight);

        this.charImage = newChar;

        this.tweens.add({
            targets: oldChar,
            x: `+=${-direction * w}`,
            alpha: 0,
            duration: 300,
            ease: "Cubic.easeOut",
            onComplete: () => oldChar.destroy()
        });

        this.tweens.add({
            targets: newChar,
            x: w / 2,
            duration: 300,
            ease: "Cubic.easeOut"
        });

        this.charNameText.setText(this.characters[this.currentIndex].name);
    }

    chooseCharacter() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        this.chooseBtn.disableInteractive();
        this.waitingText.setText("Connecting to server...");

        const selectedChar = this.characters[this.currentIndex];

        // Connect to server
        this.socket = io("https://turiba-race-server.onrender.com");

        this.socket.on("connect", () => {
            if (!this.scene.isActive()) return; // Check if scene is still active
            
            this.waitingText.setText("Waiting for players...");

            this.socket.emit("joinRace", {
                name: selectedChar.name,
                character: selectedChar
            });
        });

        this.socket.on("roomUpdate", (room) => {
            if (!this.scene.isActive()) return; // Check if scene is still active
            
            this.waitingText.setText(
                `Players in room: ${room.players.length}/4`
            );
        });

        this.socket.on("startRace", (room) => {
            if (!this.scene.isActive()) return; // Check if scene is still active
            
            this.waitingText.setText("Race starting...");

            // Small delay for polish
            this.time.delayedCall(500, () => {
                this.scene.start("RaceScene", {
                    selectedChar,
                    socket: this.socket,
					roomData: room
                });

                this.scene.launch("UIScene", {
                    selectedChar
                });
            });
        });

        this.socket.on("disconnect", () => {
            if (!this.scene.isActive()) return; // Check if scene is still active
            
            this.waitingText.setText("Disconnected from server.");
            this.isConnecting = false;
            this.chooseBtn.setInteractive();
        });
    }

    cleanupSocket() {
        if (this.socket) {
            this.socket.removeAllListeners();
            if (this.socket.connected) {
                this.socket.disconnect();
            }
            this.socket = null;
        }
    }

    shutdown() {
        this.cleanupSocket();
    }
}