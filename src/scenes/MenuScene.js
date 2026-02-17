export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
    }

    preload() {
        this.load.image("bg", "assets/start_page.png");
        this.load.image("pole", "assets/bg_pole.png");
        
        // Load button states
        this.load.image("start_default", "assets/default/start_default.png");
        this.load.image("start_hoover", "assets/hoover/start_hoover.png");
        this.load.image("clickme_default", "assets/default/clickme_default.png");
        this.load.image("clickme_hoover", "assets/hoover/clickme_hoover.png");
        this.load.image("bat_default", "assets/default/BAT_default.png");
        this.load.image("bat_hoover", "assets/hoover/BAT_hoover.png");
        this.load.image("credits_default", "assets/default/credits_default.png");
        this.load.image("credits_hoover", "assets/hoover/credits_hoover.png");
        
        // Load a cool font (Google Fonts style)
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');

        // Debug: Check for load errors
        this.load.on('loaderror', (file) => {
            console.error('Error loading:', file.key, file.src);
        });
    }

    create() {
        // Load custom font
        WebFont.load({
            google: {
                families: ['Barriecito']
            },
            active: () => {
                this.createUI();
            }
        });
        
        // Re-layout on resize / orientation change
        this.scale.on("resize", this.onResize, this);
    }

    createUI() {
        const { width, height } = this.scale;

        // Fullscreen background
        this.bg = this.add.image(0, 0, "bg");
        this.bg.setOrigin(0, 0);
        this.bg.setDisplaySize(width, height);

        // Title text with cool racing font
        this.titleText = this.add.text(width * 0.2, height * 0.1, " T U R Ī B A  \n R A C E", {
            fontFamily: 'Barriecito',
            fontSize: '130px',
            color: '#2d64a5',
			stroke: '#ffffff',
			strokeThickness: 6,
            
        });

        // Pole positioned on right side
        this.pole = this.add.image(width * 0.8, height * 0.2, "pole");
        this.pole.setOrigin(0, 0);
        
        // Scale pole to fit screen height nicely
        const poleScale = (height * 0.8) / this.pole.height;
        this.pole.setScale(poleScale);

        // Create buttons attached to the pole
        const buttonSpacing = height * 0.12;
        const startY = height * 0.25;
        const buttonX = width * 0.8 - this.pole.displayWidth * poleScale * 0.5 - 30;

        // Start button
        this.startButton = this.createButton(
            buttonX, 
            startY,
            "start_default",
            "start_hoover",
            "START",
            () => this.scene.start("CharScene")
        );

        // Click Me button
        this.clickmeButton = this.createButton(
            buttonX,
            startY + buttonSpacing,
            "clickme_default",
            "clickme_hoover",
            "CLICK ME",
            () => console.log("Click me pressed!")
        );

        // BAT button
        this.batButton = this.createButton(
            buttonX,
            startY + buttonSpacing * 2,
            "bat_default",
            "bat_hoover",
            "BAT",
            () => console.log("BAT pressed!")
        );

        // Credits button
        this.creditsButton = this.createButton(
            buttonX,
            startY + buttonSpacing * 3,
            "credits_default",
            "credits_hoover",
            "CREDITS",
            () => console.log("Credits pressed!")
        );
    }

    createButton(x, y, defaultTexture, hoverTexture, labelText, callback) {
        // Check if texture exists
        const textureExists = this.textures.exists(defaultTexture);
        console.log(`Button texture "${defaultTexture}" exists:`, textureExists);

        let button;
        const buttonWidth = 180;
        const buttonHeight = 50;
        
        if (textureExists) {
            button = this.add.image(x, y, defaultTexture);
            button.setOrigin(0, 0);
            button.setDisplaySize(buttonWidth, buttonHeight);
        } else {
            // Fallback: create a colored rectangle if image doesn't exist
            console.warn(`Texture "${defaultTexture}" not found, using fallback rectangle`);
            button = this.add.rectangle(x, y, buttonWidth, buttonHeight, 0x4444ff);
            button.setOrigin(0, 0);
        }
        
        button.setInteractive({ useHandCursor: true });

        button.buttonWidth = buttonWidth;
        button.buttonHeight = buttonHeight;

        // Hover effect
        button.on("pointerover", () => {
            if (this.textures.exists(hoverTexture)) {
                button.setTexture(hoverTexture);
            }
            // Always reapply display size after texture change, with hover scale
            button.setDisplaySize(buttonWidth * 1.1, buttonHeight * 1.1);
            if (button.debugOutline) {
                button.debugOutline.setStrokeStyle(4, 0x00ff00);
            }
        });

        button.on("pointerout", () => {
            if (this.textures.exists(defaultTexture)) {
                button.setTexture(defaultTexture);
            }
            // Always reapply display size after texture change, back to normal
            button.setDisplaySize(buttonWidth, buttonHeight);
            if (button.debugOutline) {
                button.debugOutline.setStrokeStyle(4, 0xff0000);
            }
        });

        button.on("pointerup", callback);

        return button;
    }

    onResize(gameSize) {
        const { width, height } = gameSize;

        // Resize background
        this.bg.setDisplaySize(width, height);
        this.bg.setPosition(0, 0);

        // Reposition title
        if (this.titleText) {
            this.titleText.setPosition(width * 0.3, height * 0.1);
        }

        // Reposition pole
        if (this.pole) {
            this.pole.setPosition(width * 0.70, 0);
            const poleScale = (height * 0.8) / this.pole.height;
            this.pole.setScale(poleScale);
        }

        // Reposition buttons
        const buttonSpacing = height * 0.12;
        const startY = height * 0.25;
        const buttonX = width * 0.72;

        if (this.startButton) {
            this.startButton.setPosition(buttonX, startY);
            if (this.startButton.debugOutline) {
                this.startButton.debugOutline.setPosition(buttonX, startY);
            }
            if (this.startButton.debugLabel) {
                this.startButton.debugLabel.setPosition(buttonX + this.startButton.buttonWidth / 2, startY + this.startButton.buttonHeight / 2);
            }
        }
        if (this.clickmeButton) {
            this.clickmeButton.setPosition(buttonX, startY + buttonSpacing);
            if (this.clickmeButton.debugOutline) {
                this.clickmeButton.debugOutline.setPosition(buttonX, startY + buttonSpacing);
            }
            if (this.clickmeButton.debugLabel) {
                this.clickmeButton.debugLabel.setPosition(buttonX + this.clickmeButton.buttonWidth / 2, startY + buttonSpacing + this.clickmeButton.buttonHeight / 2);
            }
        }
        if (this.batButton) {
            this.batButton.setPosition(buttonX, startY + buttonSpacing * 2);
            if (this.batButton.debugOutline) {
                this.batButton.debugOutline.setPosition(buttonX, startY + buttonSpacing * 2);
            }
            if (this.batButton.debugLabel) {
                this.batButton.debugLabel.setPosition(buttonX + this.batButton.buttonWidth / 2, startY + buttonSpacing * 2 + this.batButton.buttonHeight / 2);
            }
        }
        if (this.creditsButton) {
            this.creditsButton.setPosition(buttonX, startY + buttonSpacing * 3);
            if (this.creditsButton.debugOutline) {
                this.creditsButton.debugOutline.setPosition(buttonX, startY + buttonSpacing * 3);
            }
            if (this.creditsButton.debugLabel) {
                this.creditsButton.debugLabel.setPosition(buttonX + this.creditsButton.buttonWidth / 2, startY + buttonSpacing * 3 + this.creditsButton.buttonHeight / 2);
            }
        }
    }
}