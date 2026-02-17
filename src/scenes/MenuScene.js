export default class MenuScene extends Phaser.Scene {
    constructor() {
        super("MenuScene");
    }

    get BUTTON_CONFIG() {
        return [
            {
                id:             "startButton",
                defaultTexture: "start_default",
                hoverTexture:   "start_hoover",
                label:          "START",
                offsetX:        0,
                offsetY:        0,
                mobileOffsetX:  0,
                mobileOffsetY:  0,
                callback:       () => {
                    this.scene.start("CharScene");
                },
            },
            {
                id:             "creditsButton",
                defaultTexture: "credits_default",
                hoverTexture:   "credits_hoover",
                label:          "CREDITS",
                offsetX:        -100,
                offsetY:        0,
                mobileOffsetX:  -150,
                mobileOffsetY:  0,
                callback:       () => console.log("Credits pressed!"),
            },
            {
                id:             "batButton",
                defaultTexture: "bat_default",
                hoverTexture:   "bat_hoover",
                label:          "BAT",
                offsetX:        -10,
                offsetY:        0,
                mobileOffsetX:  -70,
                mobileOffsetY:  0,
                callback:       () => window.open("https://www.turiba.lv", "_blank"),
            },
            {
                id:             "clickmeButton",
                defaultTexture: "clickme_default",
                hoverTexture:   "clickme_hoover",
                label:          "CLICK ME",
                offsetX:        -100,
                offsetY:        0,
                mobileOffsetX:  -150,
                mobileOffsetY:  0,
                callback:       () => console.log("Click me pressed!"),
            },
        ];
    }

    get aspectRatio() {
        return this.scale.width / this.scale.height;
    }

    get isWideMobile() {
        return this.aspectRatio > 1.9;
    }

    get uiScale() {
        const { width, height } = this.scale;
        const s = Math.min(width / 1280, height / 720);
        return Math.max(0.4, Math.min(s, 2.0));
    }

    getLayout() {
        const { width, height } = this.scale;
        const wide = this.isWideMobile;

        return {
            titleX:        wide ? width  * 0.03  : width  * 0.05,
            titleY:        wide ? height * 0.05  : height * 0.08,
            titleFontSize: Math.round((wide ? 70 : 90) * this.uiScale),

            poleX:         wide ? width  * 0.78  : width  * 0.80,
            poleY:         wide ? height * 0.15  : height * 0.20,
            poleFraction:  wide ? 0.98            : 0.85,

            buttonBaseX:   wide ? width  * 0.78  : width  * 0.75,
            buttonBaseY:   wide ? height * 0.22  : height * 0.3,
            buttonSpacing: wide ? height * 0.15  : height * 0.16,

            buttonW: Math.round((wide ? 300 : 300) * this.uiScale),
            buttonH: Math.round((wide ? 100 : 100) * this.uiScale),
        };
    }

    preload() {
        this.load.image("bg",   "assets/start_page.png");
        this.load.image("pole", "assets/bg_pole.png");

        this.load.image("start_default",   "assets/default/start_default.png");
        this.load.image("start_hoover",    "assets/hoover/start_hoover.png");
        this.load.image("clickme_default", "assets/default/clickme_default.png");
        this.load.image("clickme_hoover",  "assets/hoover/clickme_hoover.png");
        this.load.image("bat_default",     "assets/default/BAT_default.png");
        this.load.image("bat_hoover",      "assets/hoover/BAT_hoover.png");
        this.load.image("credits_default", "assets/default/credits_default.png");
        this.load.image("credits_hoover",  "assets/hoover/credits_hoover.png");

        this.load.script("webfont", "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js");

        this.load.on("loaderror", (file) =>
            console.error("Error loading:", file.key, file.src)
        );
    }

    create() {
		this.uiCreated = false;
        WebFont.load({
            custom: { families: ["CamingoDos Pro"] },
            google: { families: ["Barlow Condensed:700"] },
            active:   () => this.buildUI(),
            inactive: () => this.buildUI(),
        });
    }

    buildUI() {
        if (this.uiCreated) return;
        this.uiCreated = true;

        const { width, height } = this.scale;
        const layout = this.getLayout();

        this.bg = this.add.image(0, 0, "bg")
            .setOrigin(0, 0)
            .setDisplaySize(width, height);

        const titleFont = this.isFontLoaded("CamingoDos Pro")
            ? "CamingoDos Pro"
            : "Barlow Condensed";

        this.titleText = this.add.text(
            layout.titleX,
            layout.titleY,
            " T U R Ī B A  \n R A C E",
            {
                fontFamily:      titleFont,
                fontStyle:       "bold",
                fontSize:        `${layout.titleFontSize}px`,
                color:           "#2d64a5",
                stroke:          "#ffffff",
                strokeThickness: 6,
            }
        );

        this.pole = this.add.image(layout.poleX, layout.poleY, "pole")
            .setOrigin(0, 0);
        const poleScale = (height * layout.poleFraction) / this.pole.height;
        this.pole.setScale(poleScale);

        this.buttons = [];

        this.BUTTON_CONFIG.forEach((cfg, index) => {
            const ox = this.isWideMobile ? cfg.mobileOffsetX : cfg.offsetX;
            const oy = this.isWideMobile ? cfg.mobileOffsetY : cfg.offsetY;

            const bx = layout.buttonBaseX + ox;
            const by = layout.buttonBaseY + layout.buttonSpacing * index + oy;

            const btn = this.createButton(
                bx, by,
                cfg.defaultTexture,
                cfg.hoverTexture,
                layout.buttonW,
                layout.buttonH,
                cfg.callback
            );

            btn.configIndex = index;
            this[cfg.id] = btn;
            this.buttons.push(btn);
        });

        this.scale.on("resize", this.onResize, this);
    }

    isFontLoaded(family) {
        try {
            return document.fonts && [...document.fonts].some(
                f => f.family === family && f.status === "loaded"
            );
        } catch (_) { return false; }
    }

    createButton(x, y, defaultTexture, hoverTexture, w, h, callback) {
        let button;

        if (this.textures.exists(defaultTexture)) {
            button = this.add.image(x, y, defaultTexture)
                .setOrigin(0, 0)
                .setDisplaySize(w, h);
        } else {
            console.warn(`Texture "${defaultTexture}" not found, using fallback`);
            button = this.add.rectangle(x, y, w, h, 0x4444ff)
                .setOrigin(0, 0);
        }

        button.setInteractive({ useHandCursor: true });
        button.btnW = w;
        button.btnH = h;
        button.defaultTexture = defaultTexture;
        button.hoverTexture   = hoverTexture;

        const HOVER_SCALE = 1.08;

        button.on("pointerover", () => {
            if (this.textures.exists(hoverTexture)) button.setTexture(hoverTexture);
            button.setDisplaySize(button.btnW * HOVER_SCALE, button.btnH * HOVER_SCALE);
        });

        button.on("pointerout", () => {
            if (this.textures.exists(defaultTexture)) button.setTexture(defaultTexture);
            button.setDisplaySize(button.btnW, button.btnH);
        });

        button.on("pointerup", callback);

        return button;
    }

    onResize(gameSize) {
		if (!this.scene.isActive("MenuScene")) return;
        if (!this.uiCreated) return;

        const { width, height } = gameSize;
        const layout = this.getLayout();

        if (this.bg) this.bg.setDisplaySize(width, height);

        if (this.titleText) {
            this.titleText.setPosition(layout.titleX, layout.titleY);
            this.titleText.setFontSize(layout.titleFontSize);
        }

        if (this.pole) {
            this.pole.setPosition(layout.poleX, layout.poleY);
            const poleScale = (height * layout.poleFraction) / this.pole.height;
            this.pole.setScale(poleScale);
        }

        if (this.buttons) {
            this.buttons.forEach((btn) => {
                const cfg = this.BUTTON_CONFIG[btn.configIndex];
                const ox  = this.isWideMobile ? cfg.mobileOffsetX : cfg.offsetX;
                const oy  = this.isWideMobile ? cfg.mobileOffsetY : cfg.offsetY;

                const bx  = layout.buttonBaseX + ox;
                const by  = layout.buttonBaseY + layout.buttonSpacing * btn.configIndex + oy;

                btn.setPosition(bx, by);
                btn.setDisplaySize(layout.buttonW, layout.buttonH);
                btn.btnW = layout.buttonW;
                btn.btnH = layout.buttonH;
            });
        }
    }

    shutdown() {
		console.log("Shutting down MenuScene...");
        this.uiCreated = false;
        this.scale.off("resize", this.onResize, this);
    }
}