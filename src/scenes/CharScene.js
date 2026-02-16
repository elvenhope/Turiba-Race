export default class CharScene extends Phaser.Scene {
    constructor() {
        super("CharScene");

        this.characters = [
            { name: "Tourism Faculty", path: "assets/tourism_char.png" },
            { name: "IT Faculty", path: "assets/tourism_char.png" },
            { name: "Law Faculty", path: "assets/tourism_char.png" },
            { name: "Business Faculty", path: "assets/tourism_char.png" },
        ];

        this.currentIndex = 0;

        // Desired height of character in-game
        this.charHeight = 400;

        // Calculate width based on aspect ratio (650 / 1280)
        const charAspect = 650 / 1280;
        this.charWidth = this.charHeight * charAspect;
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
        const arrowWidth = arrowHeight * (3860 / 3200); // ≈97

        // Light blue gradient background
        const graphics = this.add.graphics();
        graphics.fillGradientStyle(
            0xAEDFF7, // top-left
            0xAEDFF7, // top-right
            0x6EC1F7, // bottom-left
            0x6EC1F7, // bottom-right
            1
        );
        graphics.fillRect(0, 0, w, h);

        // Character name text
        this.charNameText = this.add.text(w / 2, h * 0.15, this.characters[this.currentIndex].name, {
            fontSize: "36px",
            color: "#ffffff",
            fontFamily: "Arial",
        }).setOrigin(0.5);

        // Character image
        this.charImage = this.add.image(w / 2, h * 0.45, this.characters[this.currentIndex].name)
            .setOrigin(0.5)
            .setDisplaySize(this.charWidth, this.charHeight);

        // Left arrow
        this.leftArrow = this.add.image(w * 0.2, h / 2, "arrow_left")
            .setInteractive({ useHandCursor: true })
            .setDisplaySize(arrowWidth, arrowHeight);
        this.leftArrow.on("pointerdown", () => this.switchCharacter(-1));

        // Right arrow
        this.rightArrow = this.add.image(w * 0.8, h / 2, "arrow_right")
            .setInteractive({ useHandCursor: true })
            .setDisplaySize(arrowWidth, arrowHeight);
        this.rightArrow.on("pointerdown", () => this.switchCharacter(1));

        // Manual "Choose" button container
        const buttonWidth = 220;
        const buttonHeight = 60;
        const buttonX = w / 2;
        const buttonY = h * 0.8;

        this.chooseBtn = this.add.container(buttonX, buttonY);

        const rect = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x1E90FF, 1)
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

        // Hover animation for button
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
    }

    switchCharacter(direction) {
        const w = this.scale.width;
        const h = this.scale.height;

        // Update index
        this.currentIndex = Phaser.Math.Wrap(this.currentIndex + direction, 0, this.characters.length);

        // Old character image
        const oldChar = this.charImage;

        // New character offscreen
        const newChar = this.add.image(w / 2 + direction * w, h * 0.45, this.characters[this.currentIndex].name)
            .setOrigin(0.5)
            .setDisplaySize(this.charWidth, this.charHeight)
            .setAlpha(1);

        // Replace reference immediately
        this.charImage = newChar;

        // Animate old character out
        this.tweens.add({
            targets: oldChar,
            x: `+=${-direction * w}`,
            alpha: 0,
            duration: 300,
            ease: "Cubic.easeOut",
            onComplete: () => oldChar.destroy()
        });

        // Animate new character in
        this.tweens.add({
            targets: newChar,
            x: w / 2,
            duration: 300,
            ease: "Cubic.easeOut"
        });

        // Update character name
        this.charNameText.setText(this.characters[this.currentIndex].name);

        // ✅ Scale-based bounce (works even if user spams)
        this.chooseBtn.setScale(1); // reset scale
        this.tweens.add({
            targets: this.chooseBtn,
            scale: 1.05,
            duration: 100,
            yoyo: true,
            ease: "Sine.easeInOut"
        });
    }

    chooseCharacter() {
        console.log("Chosen character:", this.characters[this.currentIndex].name);

        this.scene.start("RaceScene", { selectedChar: this.characters[this.currentIndex] });
        this.scene.launch("UIScene", { selectedChar: this.characters[this.currentIndex] });
    }
}
