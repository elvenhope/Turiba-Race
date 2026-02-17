export default class CharScene extends Phaser.Scene {
    constructor() {
        super("CharScene");

        this.characters = [
            {
                name: "Tourism Faculty",
                path: "assets/Characters/tourism.png",
                car_path: "assets/Cars/Tourism.png",
                character_description: "Tourism is one of the most dynamic, global and demanding sectors in the world. Studying in this field stands for learning how to organize and manage trips and journeys, the principles of hotel and other accommodation service management, the principles of catering, tourism logistics, and the very essence of business, as well as its cornerstones.",
                color: "#65BD60"
            },
            {
                name: "IT Faculty",
                path: "assets/Characters/ITF.png",
                car_path: "assets/Cars/ITF.png",
                character_description: "A bachelor's degree in computer systems is your opportunity to start a successful career in the tech industry. Professional specialists are prepared for starting independent work in the field of informatics with knowledge in computer system architecture, software engineering, system analysis, basic technologies of databases and artificial intelligence.",
                color: "#404E55"
            },
            {
                name: "Law Faculty",
                path: "assets/Characters/law.png",
                car_path: "assets/Cars/Law.png",
                character_description: "Law studies at Turiba Business School provide an opportunity to obtain a Bachelor of Social Sciences degree in Law. A Bachelor of Laws prepares for further studies in a Master's program and independent research activities, as well as provides a theoretical basis for professional activities in areas related to law.",
                color: "#809699"
            },
            {
                name: "Business Faculty",
                path: "assets/Characters/business.png",
                car_path: "assets/Cars/Business.png",
                character_description: "Study business administration at Turiba University and receive a degree that will be valued anywhere in Europe! Our bachelor's program in business administration has been designed to provide students with hands-on experience, to prepare them for the challenges they will face in their work.",
                color: "#00587E"
            },
            {
                name: "Communications Faculty",
                path: "assets/Characters/communications.png",
                car_path: "assets/Cars/Communications.png",
                character_description: "The International Communication Management program provides an opportunity to learn how to manage communication in an international environment. You will learn how to plan, organize and manage organization's international communication, analyze information, target audiences and information channels.",
                color: "#F7934E"
            },
            {
                name: "Healthcare Department",
                path: "assets/Characters/healthcare.png",
                car_path: "assets/Cars/Healthcare.png",
                character_description: "Cosmetology, body and facial massages, body cosmetic procedures, facial cosmetic procedures, mesotherapy and biorevitalization, electroprocedures, decorative cosmetics, holistic approach and procedures, hand and foot care, SPA massages, aromatherapy, basics of micropigmentation and tattooing.",
                color: "#008674"
            },
            {
                name: "Organization Department",
                path: "assets/Characters/organization.png",
                car_path: "assets/Cars/Organization.png",
                character_description: "Nowadays, organizational security is essential in both digital and physical environments. The demand for qualified security professionals is growing worldwide. Turiba Business School offers a bachelor's degree program in Organizational Security — the only one of its kind in the Baltics.",
                color: "#C8D2D2"
            },
        ];

        this.currentIndex = 0;
        this.socket       = null;
        this.isConnecting = false;

        // ── Carousel tunables ─────────────────────────────────────
        this.THUMB_SIZE        = 120;    // inactive thumbnail square px
        this.THUMB_SIZE_ACTIVE = 165;    // active thumbnail square px
        this.THUMB_GAP         = 16;     // gap between thumbnails px

        // Fraction of character image height used as "head" region for crop
        this.HEAD_CROP_FRACTION = 0.42;
    }

    // ─────────────────────────────────────────────────────────────
    //  PRELOAD
    // ─────────────────────────────────────────────────────────────
    preload() {
        this.characters.forEach(char => this.load.image(char.name, char.path));
        this.load.script("webfont", "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js");
    }

    // ─────────────────────────────────────────────────────────────
    //  CREATE
    // ─────────────────────────────────────────────────────────────
    create() {
        WebFont.load({
            // CamingoDos Pro must be declared via @font-face in your HTML.
            // Barlow Condensed is a Google Fonts fallback with a similar bold-condensed feel.
            custom: { families: ["CamingoDos Pro"] },
            google: { families: ["Barlow Condensed:700"] },
            active:   () => this.buildUI(),
            inactive: () => this.buildUI(),
        });

        this.scale.on("resize", this.onResize, this);
    }

    // ─────────────────────────────────────────────────────────────
    //  BUILD UI
    // ─────────────────────────────────────────────────────────────
    buildUI() {
        if (this.uiCreated) return;
        this.uiCreated = true;

        const w = this.scale.width;
        const h = this.scale.height;

        this.drawBackground(w, h);
        this.createSection1(w, h);
        this.createSection2(w, h);
        this.createCarousel(w, h);
        this.createButtons(w, h);
        this.createWaitingText(w, h);

        this.isConnecting = false;
        if (this.socket) this.cleanupSocket();
    }

    // ─────────────────────────────────────────────────────────────
    //  DPR — used to render text at native pixel density so it stays
    //  crisp even when Phaser's canvas is CSS-scaled by EXPAND mode.
    //  Clamped to 3 so very high-DPI phones don't waste memory.
    get dpr() {
        return Math.min(window.devicePixelRatio || 1, 3);
    }

    // ─────────────────────────────────────────────────────────────
    //  BACKGROUND
    // ─────────────────────────────────────────────────────────────
    drawBackground(w, h) {
        if (this.bgGraphics) this.bgGraphics.destroy();
        const g = this.add.graphics();
        this.bgGraphics = g;

        // Base light blue
        g.fillStyle(0x4BA3D3, 1);
        g.fillRect(0, 0, w, h);

        this.drawStrips(g, w, h);
    }

    /**
     * Two diagonal decorative strips matching the Figma design.
     * They are tinted with the current character's color.
     *
     * Figma canvas: 1456 × 816
     * Both strips:  599.15 × 1594.10 px, rotated -28.23°
     *
     * Strip 1 top-left (660.37, -283.44)  → center (0.659, 0.629) normalized
     * Strip 2 top-left (1348.96, -134.90) → center (1.132, 0.811) normalized
     *                                        (partially off-screen right — intentional)
     * Strip w/h normalized to canvas:
     *   halfW = (599.15 / 1456) / 2 = 0.2057
     *   halfH = (1594.10 / 816) / 2 = 0.9767
     */
    drawStrips(g, w, h) {
        const char     = this.characters[this.currentIndex];
        const color    = Phaser.Display.Color.HexStringToColor(char.color);

        // Darken the character colour slightly for the strip
        const darken   = (c) => Math.max(0, c - 45);
        const stripHex = Phaser.Display.Color.GetColor(
            darken(color.r), darken(color.g), darken(color.b)
        );

        // / slash = top-right, bottom-left lean
        // CCW rotation matrix (standard, y-axis down):
        //   x' = x·cos - y·sin
        //   y' = x·sin + y·cos
        const angleRad = Phaser.Math.DegToRad(28.23);
        const cosA     = Math.cos(angleRad);
        const sinA     = Math.sin(angleRad);

        // Size both dimensions relative to screen HEIGHT only — keeps strips
        // visually identical on any aspect ratio (desktop wide or mobile landscape).
        // Figma strip: 599.15 × 1594.10 px on 816px-tall canvas.
        const hw = (599.15  / 816 / 2) * h;   // half-width  ~0.367h
        const hh = (1594.10 / 816 / 2) * h;   // half-height ~0.977h

        // Unrotated corners relative to strip centre
        const localCorners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];

        const drawStrip = (cx, cy, alpha) => {
            const pts = localCorners.map(([lx, ly]) => new Phaser.Geom.Point(
                lx * cosA - ly * sinA + cx,   // x' (CCW = / slash)
                lx * sinA + ly * cosA + cy    // y'
            ));
            g.fillStyle(stripHex, alpha);
            g.fillPoints(pts, true);
        };

        // Anchor X to screen centre so strips stay symmetric on any width.
        // Figma canvas centre: 728px. Strip centres relative to that:
        //   Strip 1: (959.95 - 728) = +231.95, y = 513.61
        //   Strip 2: (1648.54 - 728) = +920.54, y = 662.15
        // All scaled by h/816 so they scale with the strips.
        const scale = h / 816;
        drawStrip(w * 0.5 + 231.95 * scale, 513.61 * scale, 0.55);
        drawStrip(w * 0.5 + 920.54 * scale, 662.15 * scale, 0.55);
    }

    // ─────────────────────────────────────────────────────────────
    //  SECTION 1 — name + description, top-left quadrant
    // ─────────────────────────────────────────────────────────────
    createSection1(w, h) {
        const char = this.characters[this.currentIndex];
        const padX = w * 0.04;
        const padY = h * 0.05;
        const maxW = w * 0.44;

        // Resolve font: prefer CamingoDos Pro, fall back to Barlow Condensed
        const titleFont = this.isFontLoaded("CamingoDos Pro")
            ? "CamingoDos Pro"
            : "Barlow Condensed";

        this.nameText = this.add.text(padX, padY, char.name.toUpperCase(), {
            fontFamily:      titleFont,
            fontStyle:       "bold",
            fontSize:        "88px",
            color:           char.color,
            stroke:          "#ffffff",
            strokeThickness: 6,
            wordWrap:        { width: maxW, useAdvancedWrap: true },
            lineSpacing:     -10,
            resolution:      this.dpr,
        }).setDepth(10);

        const descY = this.nameText.y + this.nameText.displayHeight + h * 0.02;

        this.descText = this.add.text(padX, descY, char.character_description, {
            fontFamily:  "Arial",
            fontStyle:   "bold",
            fontSize:    "21px",
            color:       "#ffffff",
            wordWrap:    { width: maxW, useAdvancedWrap: true },
            lineSpacing: 5,
            resolution:  this.dpr,
        }).setDepth(10);
    }

    // ─────────────────────────────────────────────────────────────
    //  SECTION 2 — character portrait, right half
    // ─────────────────────────────────────────────────────────────
    createSection2(w, h) {
        const char = this.characters[this.currentIndex];

        const displayH   = h * 0.90;
        const displayW   = displayH * (650 / 1280);
        const portraitX  = w * 0.73;
        const portraitY  = h * 0.47;

        this.portraitImage = this.add.image(portraitX, portraitY, char.name)
            .setOrigin(0.5)
            .setDisplaySize(displayW, displayH)
            .setDepth(5);
    }

    // ─────────────────────────────────────────────────────────────
    //  CAROUSEL
    // ─────────────────────────────────────────────────────────────
    createCarousel(w, h) {
        this.carouselY       = h * 0.71;
        this.carouselCenterX = w * 0.5;

        this.thumbContainers = [];
        this.characters.forEach((_, i) => {
            this.thumbContainers.push(this.createThumb(i));
        });

        // Arrows
        const arrowStyle = {
            fontFamily: "Arial",
            fontSize:   "56px",
            fontStyle:  "bold",
            color:      "#ffffff",
            resolution: this.dpr,
        };
        this.leftArrowBtn = this.add.text(0, 0, "<", arrowStyle)
            .setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });
        this.rightArrowBtn = this.add.text(0, 0, ">", arrowStyle)
            .setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor: true });

        this.leftArrowBtn.on("pointerdown",  () => this.switchCharacter(-1));
        this.rightArrowBtn.on("pointerdown", () => this.switchCharacter(1));
        this.leftArrowBtn.on("pointerover",  () => this.leftArrowBtn.setAlpha(0.55));
        this.leftArrowBtn.on("pointerout",   () => this.leftArrowBtn.setAlpha(1));
        this.rightArrowBtn.on("pointerover", () => this.rightArrowBtn.setAlpha(0.55));
        this.rightArrowBtn.on("pointerout",  () => this.rightArrowBtn.setAlpha(1));

        this.repositionCarousel(w, h);
    }

    createThumb(index) {
        const isActive = index === this.currentIndex;
        const size     = isActive ? this.THUMB_SIZE_ACTIVE : this.THUMB_SIZE;
        const char     = this.characters[index];

        const container = this.add.container(0, 0).setDepth(15);

        // Background
        const bg = this.add.rectangle(0, 0, size, size, 0x1A3A50).setOrigin(0.5);

        // Head-cropped render texture
        const rt = this.add.renderTexture(0, 0, size, size).setOrigin(0.5);
        this.drawHeadCrop(rt, char.name, size);

        // Active border
        const border = this.add.graphics();
        if (isActive) {
            border.lineStyle(4, 0xffffff, 1);
            border.strokeRect(-size / 2 - 3, -size / 2 - 3, size + 6, size + 6);
        }

        container.add([bg, rt, border]);
        container.setSize(size, size);
        container.setInteractive({ useHandCursor: true });
        container.on("pointerdown", () => {
            if (index === this.currentIndex) return;
            const dir = index > this.currentIndex ? 1 : -1;
            this.switchCharacter(dir, index);
        });

        return { container, rt, bg, border, size, index };
    }

    drawHeadCrop(rt, textureKey, size) {
        if (!this.textures.exists(textureKey)) return;
        const frame  = this.textures.getFrame(textureKey);
        const srcW   = frame.realWidth;
        const srcH   = frame.realHeight;
        const cropH  = srcH * this.HEAD_CROP_FRACTION;
        const scaleX = size / srcW;
        const scaleY = size / cropH;

        const tmp = this.add.image(0, 0, textureKey)
            .setOrigin(0, 0).setScale(scaleX, scaleY).setVisible(false);
        rt.clear();
        rt.draw(tmp, -size / 2, -size / 2);
        tmp.destroy();
    }

    repositionCarousel(w, h) {
        const n       = this.characters.length;
        const active  = this.THUMB_SIZE_ACTIVE;
        const inactive = this.THUMB_SIZE;
        const gap     = this.THUMB_GAP;
        const totalW  = active + (n - 1) * (inactive + gap);

        let curX = this.carouselCenterX - totalW / 2;

        this.thumbContainers.forEach((thumb, i) => {
            const size = i === this.currentIndex ? active : inactive;
            thumb.container.setPosition(curX + size / 2, this.carouselY);
            curX += size + gap;
        });

        const rowLeft  = this.carouselCenterX - totalW / 2;
        const rowRight = this.carouselCenterX + totalW / 2;
        if (this.leftArrowBtn)  this.leftArrowBtn.setPosition(rowLeft  - 45, this.carouselY);
        if (this.rightArrowBtn) this.rightArrowBtn.setPosition(rowRight + 45, this.carouselY);
    }

    // ─────────────────────────────────────────────────────────────
    //  BUTTONS
    // ─────────────────────────────────────────────────────────────
    createButtons(w, h) {
        const btnW = 190;
        const btnH = 58;
        const padX = w * 0.04;
        const btnY = h * 0.91;

        // BACK — transparent fill, orange outline
        this.backBtn = this.makeButton(
            padX + btnW / 2, btnY, btnW, btnH,
            "BACK",
            null,         // no fill
            0xF7934E, 5,  // orange stroke
            "#F7934E",    // orange text
            () => this.scene.start("MenuScene")
        );

        // START — blue fill, no stroke
        this.startBtn = this.makeButton(
            w - padX - btnW / 2, btnY, btnW, btnH,
            "START",
            0x56A7DE,     // blue fill
            null, 0,
            "#ffffff",
            () => this.chooseCharacter()
        );
    }

    makeButton(x, y, bw, bh, label, fillColor, strokeColor, strokeThick, textColor, callback) {
        const c = this.add.container(x, y).setDepth(20);
        const r = bh / 2;

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.25);
        shadow.fillRoundedRect(-bw / 2 + 4, -bh / 2 + 4, bw, bh, r);

        // Body
        const body = this.add.graphics();
        if (fillColor !== null) {
            body.fillStyle(fillColor, 1);
            body.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, r);
        }
        if (strokeColor && strokeThick > 0) {
            body.lineStyle(strokeThick, strokeColor, 1);
            body.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, r);
        }

        const txt = this.add.text(0, 0, label, {
            fontFamily: "Arial",
            fontStyle:  "bold",
            fontSize:   "24px",
            color:      textColor,
            resolution: this.dpr,
        }).setOrigin(0.5);

        c.add([shadow, body, txt]);
        c.setSize(bw, bh);
        c.setInteractive({ useHandCursor: true });
        c.on("pointerdown", callback);
        c.on("pointerover", () => this.tweens.add({ targets: c, scale: 1.06, duration: 80, ease: "Sine.easeOut" }));
        c.on("pointerout",  () => this.tweens.add({ targets: c, scale: 1,    duration: 80, ease: "Sine.easeOut" }));

        return c;
    }

    createWaitingText(w, h) {
        this.waitingText = this.add.text(w / 2, h * 0.95, "", {
            fontFamily: "Arial",
            fontSize:   "20px",
            color:      "#ffffff",
            resolution: this.dpr,
        }).setOrigin(0.5).setDepth(25);
    }

    // ─────────────────────────────────────────────────────────────
    //  SWITCH CHARACTER
    // ─────────────────────────────────────────────────────────────
    switchCharacter(direction, targetIndex = null) {
        const prevIndex   = this.currentIndex;
        const len         = this.characters.length;

        this.currentIndex = targetIndex !== null
            ? targetIndex
            : Phaser.Math.Wrap(this.currentIndex + direction, 0, len);

        const char = this.characters[this.currentIndex];
        const w    = this.scale.width;
        const h    = this.scale.height;

        // ── Redraw background strips in new character's colour ──
        this.drawBackground(w, h);

        // ── Section 1 update ──
        this.nameText.setText(char.name.toUpperCase()).setColor(char.color);
        this.descText.setText(char.character_description);
        this.descText.setY(this.nameText.y + this.nameText.displayHeight + h * 0.02);

        // ── Portrait slide ──
        const portraitX  = w * 0.73;
        const portraitY  = h * 0.47;
        const displayH   = h * 0.90;
        const displayW   = displayH * (650 / 1280);
        const slideDir   = direction >= 0 ? 1 : -1;

        const oldP = this.portraitImage;
        this.tweens.add({
            targets:  oldP,
            x:        portraitX - slideDir * w * 0.25,
            alpha:    0,
            duration: 220,
            ease:     "Cubic.easeOut",
            onComplete: () => oldP.destroy()
        });

        this.portraitImage = this.add.image(
            portraitX + slideDir * w * 0.25, portraitY, char.name
        ).setOrigin(0.5).setDisplaySize(displayW, displayH).setDepth(5).setAlpha(0);

        this.tweens.add({
            targets:  this.portraitImage,
            x:        portraitX,
            alpha:    1,
            duration: 220,
            ease:     "Cubic.easeOut"
        });

        // ── Carousel thumbnail resize ──
        this.thumbContainers.forEach((thumb, i) => {
            const isNowActive = i === this.currentIndex;
            const wasActive   = i === prevIndex;

            if (!isNowActive && !wasActive) return;

            const newSize = isNowActive ? this.THUMB_SIZE_ACTIVE : this.THUMB_SIZE;
            const oldSize = wasActive   ? this.THUMB_SIZE_ACTIVE : this.THUMB_SIZE;

            // Scale trick: set to oldSize/newSize so the tween to scale=1 looks correct
            thumb.container.setScale(oldSize / newSize);
            this.tweens.add({
                targets:  thumb.container,
                scale:    1,
                duration: 200,
                ease:     "Cubic.easeOut",
            });

            // Redraw crop at new size
            thumb.rt.resize(newSize, newSize);
            this.drawHeadCrop(thumb.rt, this.characters[i].name, newSize);
            thumb.bg.setSize(newSize, newSize);

            // Redraw border
            thumb.border.clear();
            if (isNowActive) {
                thumb.border.lineStyle(4, 0xffffff, 1);
                thumb.border.strokeRect(-newSize / 2 - 3, -newSize / 2 - 3, newSize + 6, newSize + 6);
            }

            thumb.size = newSize;
            thumb.container.setSize(newSize, newSize);
        });

        this.time.delayedCall(10, () => this.repositionCarousel(w, h));
    }

    // ─────────────────────────────────────────────────────────────
    //  SERVER CONNECTION
    // ─────────────────────────────────────────────────────────────
    chooseCharacter() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        if (this.startBtn) this.startBtn.disableInteractive();
        this.waitingText.setText("Connecting to server...");

        const selectedChar = this.characters[this.currentIndex];
        // this.socket = io("https://turiba-race-server.onrender.com");
		this.socket = io("localhost:3000");

        this.socket.on("connect", () => {
            if (!this.scene.isActive()) return;
            this.waitingText.setText("Waiting for players...");
            this.socket.emit("joinRace", { name: selectedChar.name, character: selectedChar });
        });

        this.socket.on("roomUpdate", (room) => {
            if (!this.scene.isActive()) return;
            this.waitingText.setText(`Players in room: ${room.players.length}/4`);
        });

        this.socket.on("startRace", (room) => {
            if (!this.scene.isActive()) return;
            this.waitingText.setText("Race starting...");
            this.time.delayedCall(500, () => {
                this.scene.start("RaceScene", { selectedChar, socket: this.socket, roomData: room });
                this.scene.launch("UIScene", { selectedChar });
            });
        });

        this.socket.on("disconnect", () => {
            if (!this.scene.isActive()) return;
            this.waitingText.setText("Disconnected from server.");
            this.isConnecting = false;
            if (this.startBtn) this.startBtn.setInteractive();
        });
    }

    // ─────────────────────────────────────────────────────────────
    //  RESIZE
    // ─────────────────────────────────────────────────────────────
    onResize(gameSize) {
        if (!this.uiCreated) return;
        const { width: w, height: h } = gameSize;

        this.drawBackground(w, h);

        const padX = w * 0.04;
        const maxW = w * 0.44;
        this.nameText.setPosition(padX, h * 0.05).setWordWrapWidth(maxW);
        this.descText
            .setPosition(padX, h * 0.05 + this.nameText.displayHeight + h * 0.02)
            .setWordWrapWidth(maxW);

        const displayH = h * 0.90;
        const displayW = displayH * (650 / 1280);
        this.portraitImage.setPosition(w * 0.73, h * 0.47).setDisplaySize(displayW, displayH);

        this.carouselY       = h * 0.71;
        this.carouselCenterX = w * 0.5;
        this.repositionCarousel(w, h);

        const btnW = 190;
        const btnH = 58;
        const btnY = h * 0.91;
        if (this.backBtn)  this.backBtn.setPosition(padX + btnW / 2, btnY);
        if (this.startBtn) this.startBtn.setPosition(w - padX - btnW / 2, btnY);
        if (this.waitingText) this.waitingText.setPosition(w / 2, h * 0.95);
    }

    // ─────────────────────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────────────────────
    isFontLoaded(family) {
        try {
            return document.fonts && [...document.fonts].some(
                f => f.family === family && f.status === "loaded"
            );
        } catch (_) { return false; }
    }

    cleanupSocket() {
        if (this.socket) {
            this.socket.removeAllListeners();
            if (this.socket.connected) this.socket.disconnect();
            this.socket = null;
        }
    }

    shutdown() { this.cleanupSocket(); }
}