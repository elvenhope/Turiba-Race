/**
 * CreditsScene.js
 *
 * A scrollable credits page.
 * Background: white with two diagonal #404E55 stripes (top-left corner and
 * bottom-right / bottom / left / top-right corner), matching the Figma stripe
 * geometry extracted from CharScene.
 *
 * Assets expected (add to your preload / boot scene):
 *   "holding_cat"      – large decorative cat image (bottom-right bg)
 *   "author_davit"     – portrait photo of Davit
 *   "author_vanesa"    – portrait photo of Vanesa
 *   "credits_img_1"    – square photo for reality row
 *   "credits_img_2"    – square photo for reality row
 *   "credits_img_3"    – square photo for reality row
 *   "arrow_left"       – back-button icon
 */

export default class CreditsScene extends Phaser.Scene {
    constructor() {
        super("CreditsScene");
    }

    // ─────────────────────────────────────────────────────────────
    //  PRELOAD  (add your own keys here if not loaded globally)
    // ─────────────────────────────────────────────────────────────
    preload() {
        // If assets are already loaded globally, remove these lines:
        this.load.image("holding_cat",  "assets/holding_cat.png");
        this.load.image("author_davit", "assets/author_davit.png");
        this.load.image("author_vanesa","assets/author_vanesa.jpg");
        this.load.image("credits_img_1","assets/credits_img_1.png");
        this.load.image("credits_img_2","assets/credits_img_2.png");
        this.load.image("credits_img_3","assets/credits_img_3.png");
        // this.load.image("arrow_left",   "assets/arrow_left.png");

        this.load.script("webfont", "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js");
    }

    // ─────────────────────────────────────────────────────────────
    //  CREATE
    // ─────────────────────────────────────────────────────────────
    create() {
        this.uiCreated = false;

        WebFont.load({
            custom: { families: ["CamingoDos Pro"] },
            google:  { families: ["Barlow Condensed:700"] },
            active:   () => this.buildUI(),
            inactive: () => this.buildUI(),
        });

        this.scale.on("resize", this.onResize, this);
    }

    // ─────────────────────────────────────────────────────────────
    //  DPR
    // ─────────────────────────────────────────────────────────────
    get dpr() {
        return Math.min(window.devicePixelRatio || 1, 3);
    }

    // ─────────────────────────────────────────────────────────────
    //  RESPONSIVE FONT SIZE HELPER
    //  Scales a "base" pixel size (designed for ~800px wide screens)
    //  proportionally to the current screen width, with a min/max clamp.
    // ─────────────────────────────────────────────────────────────
    fs(basePx, w) {
        // base design width — tweak if your desktop canvas is different
        const DESIGN_W = 800;
        const scaled   = basePx * (w / DESIGN_W);
        // never go below 60% or above 150% of the base size
        return Math.round(Phaser.Math.Clamp(scaled, basePx * 0.6, basePx * 1.5)) + "px";
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
        this.createScrollContainer(w, h);
        this.createBackButton(w, h);
    }

    // ─────────────────────────────────────────────────────────────
    //  BACKGROUND  (white + stripes + cat)
    // ─────────────────────────────────────────────────────────────
    drawBackground(w, h) {
        if (this.bgGraphics) this.bgGraphics.destroy();

        const g = this.add.graphics();
        this.bgGraphics = g;

        // White base
        g.fillStyle(0xffffff, 1);
        g.fillRect(0, 0, w, h);

        this.drawStripes(g, w, h);
        this.drawCatImage(w, h);
    }

    /**
     * Two diagonal decorative stripes in colour #404E55.
     */
    drawStripes(g, w, h) {
        const STRIPE_COLOR = 0x404E55;

        const angleRad = Phaser.Math.DegToRad(28.23);
        const cosA = Math.cos(angleRad);
        const sinA = Math.sin(angleRad);

        const hw = (599.15 / 816 / 2) * h;
        const hh = (1594.10 / 816 / 2) * h;

        const localCorners = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];

        const drawStripe = (cx, cy) => {
            const pts = localCorners.map(([lx, ly]) => new Phaser.Geom.Point(
                lx * cosA - ly * sinA + cx,
                lx * sinA + ly * cosA + cy
            ));
            g.fillStyle(STRIPE_COLOR, 1);
            g.fillPoints(pts, true);
        };

        drawStripe(w * -0.05, h * 0.02);
        drawStripe(w * 1.05,  h * 0.98);
    }

    drawCatImage(w, h) {
        if (this.catImage) this.catImage.destroy();

        if (!this.textures.exists("holding_cat")) return;

        const frame  = this.textures.getFrame("holding_cat");
        const aspect = frame.realWidth / frame.realHeight;

        const maxCatW = w * 0.55;
        const idealH  = h * 0.9;
        const idealW  = idealH * aspect;

        const catW = Math.min(idealW, maxCatW);
        const catH = catW / aspect;

        const overhang = catW * 0.18;
        const catX = w + overhang - catW / 2;
        const catY = h * 1 - catH / 2;

        this.catImage = this.add.image(catX, catY, "holding_cat")
            .setDisplaySize(catW, catH)
            .setOrigin(0.5)
            .setDepth(1)
            .setAlpha(1);
    }

    // ─────────────────────────────────────────────────────────────
    //  BACK BUTTON
    // ─────────────────────────────────────────────────────────────
    createBackButton(w, h) {
        if (this.backBtn) this.backBtn.destroy();

        const PAD  = Math.max(14, w * 0.03);
        const SIZE = Math.max(36, Math.min(w * 0.09, 56));

        if (this.textures.exists("arrow_left")) {
            this.backBtn = this.add.image(PAD + SIZE / 2, PAD + SIZE / 2, "arrow_left")
                .setDisplaySize(SIZE, SIZE)
                .setOrigin(0.5)
                .setDepth(50)
                .setInteractive({ useHandCursor: true });
        } else {
            const c = this.add.container(PAD + SIZE / 2, PAD + SIZE / 2).setDepth(50);
            const bg = this.add.graphics();
            bg.fillStyle(0x404E55, 1);
            bg.fillRoundedRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE, 10);
            const arrow = this.add.text(0, 0, "←", {
                fontFamily: "Arial",
                fontSize:   this.fs(24, w),
                color:      "#ffffff",
                resolution: this.dpr,
            }).setOrigin(0.5);
            c.add([bg, arrow]);
            c.setSize(SIZE, SIZE).setInteractive({ useHandCursor: true });
            this.backBtn = c;
        }

        this.backBtn.on("pointerdown", () => this.scene.start("MenuScene"));
        this.backBtn.on("pointerover", () => this.tweens.add({ targets: this.backBtn, scale: 1.12, duration: 80 }));
        this.backBtn.on("pointerout",  () => this.tweens.add({ targets: this.backBtn, scale: 1,    duration: 80 }));
    }

    // ─────────────────────────────────────────────────────────────
    //  SCROLL CONTAINER
    // ─────────────────────────────────────────────────────────────
    createScrollContainer(w, h) {
        if (this.scrollContent)  this.scrollContent.destroy();
        if (this.scrollMask)     this.scrollMask.destroy();
        if (this.scrollGraphics) this.scrollGraphics.destroy();

        this.scrollContent = this.add.container(0, 0).setDepth(10);

        const items = this.buildContentItems(w, h);
        items.forEach(item => this.scrollContent.add(item));

        this.totalContentHeight = this.computeContentHeight(items, h);

        this.scrollGraphics = this.add.graphics();
        this.scrollGraphics.fillRect(0, 0, w, h);
        this.scrollMask = new Phaser.Display.Masks.GeometryMask(this, this.scrollGraphics);
        this.scrollContent.setMask(this.scrollMask);

        this.scrollY    = 0;
        this.minScrollY = 0;
        this.maxScrollY = Math.max(0, this.totalContentHeight - h);

        this.setupScrollInput();
    }

    // ─────────────────────────────────────────────────────────────
    //  CONTENT BUILDER
    // ─────────────────────────────────────────────────────────────
    buildContentItems(w, h) {
        const items = [];
        const ACCENT_HX = 0x404E55;

        // ── Layout margins ────────────────────────────────────────
        const MARGIN     = w * 0.09;
        const CONTENT_W  = w - MARGIN * 2;
        const COL_GAP    = w * 0.03;

        // Photo column: square, scales with screen
        const ROW_H      = h * 0.38;
        const PHOTO_SIDE = ROW_H;

        // Text column width capped for readability
        const TEXT_COL_W = Math.min(CONTENT_W - PHOTO_SIDE - COL_GAP, 520);

        // Row 1: photo LEFT, text RIGHT
        const R1_PHOTO_X = MARGIN;
        const R1_TEXT_X  = MARGIN + PHOTO_SIDE + COL_GAP;

        // Row 2: text LEFT, photo RIGHT
        const R2_TEXT_X  = MARGIN;
        const R2_PHOTO_X = MARGIN + TEXT_COL_W + COL_GAP;

        let curY = h * 0.07;

        // ── HEADER BADGE ──────────────────────────────────────────
        // Font sizes first so we can size the badge to fit the text
        const badgeTitleFontSize = this.fs(32, w);
        const badgeSubFontSize   = this.fs(14, w);

        // Measure the title text by creating it off-screen temporarily
        const _badgeTitle = this.add.text(-9999, -9999, "CREDITS", {
            fontFamily: this.isFontLoaded("CamingoDos Pro") ? "CamingoDos Pro" : "Barlow Condensed",
            fontStyle:  "bold",
            fontSize:   badgeTitleFontSize,
            resolution: this.dpr,
        });
        const _badgeSub = this.add.text(-9999, -9999, "Created by two ITF students", {
            fontFamily: "Arial",
            fontSize:   badgeSubFontSize,
            resolution: this.dpr,
        });

        const BADGE_PAD_X = w * 0.07;
        const BADGE_PAD_Y = h * 0.018;
        const BADGE_GAP   = h * 0.008;   // gap between title and subtitle

        const BADGE_W = Math.max(
            _badgeTitle.displayWidth, _badgeSub.displayWidth
        ) + BADGE_PAD_X * 2;
        const BADGE_H = _badgeTitle.displayHeight + _badgeSub.displayHeight
                      + BADGE_GAP + BADGE_PAD_Y * 2;

        _badgeTitle.destroy();
        _badgeSub.destroy();

        const badgeG = this.add.graphics();
        badgeG.fillStyle(ACCENT_HX, 1);
        badgeG.fillRoundedRect(w / 2 - BADGE_W / 2, curY, BADGE_W, BADGE_H, Math.max(8, BADGE_H * 0.12));
        items.push(badgeG);

        const badgeTitle = this.add.text(w / 2, curY + BADGE_PAD_Y, "CREDITS", {
            fontFamily: this.isFontLoaded("CamingoDos Pro") ? "CamingoDos Pro" : "Barlow Condensed",
            fontStyle:  "bold",
            fontSize:   badgeTitleFontSize,
            color:      "#ffffff",
            resolution: this.dpr,
        }).setOrigin(0.5, 0);
        items.push(badgeTitle);

        const badgeSub = this.add.text(w / 2, curY + BADGE_PAD_Y + badgeTitle.displayHeight + BADGE_GAP, "Created by two ITF students", {
            fontFamily: "Arial",
            fontSize:   badgeSubFontSize,
            color:      "#aaaaaa",
            resolution: this.dpr,
        }).setOrigin(0.5, 0);
        items.push(badgeSub);

        curY += BADGE_H + h * 0.07;

        // ── ROW 1: Davit — photo left, text right ─────────────────
        const davitRt = this.makeContainPortrait("author_davit", PHOTO_SIDE, 0xf0f0f0);
        davitRt.setPosition(R1_PHOTO_X + PHOTO_SIDE / 2, curY + PHOTO_SIDE / 2).setOrigin(0.5);
        items.push(davitRt);

        const devTitle = this.add.text(R1_TEXT_X, curY, "The Developer", {
            fontFamily: this.isFontLoaded("CamingoDos Pro") ? "CamingoDos Pro" : "Barlow Condensed",
            fontStyle:  "bold",
            fontSize:   this.fs(48, w),
            color:      "#111111",
            resolution: this.dpr,
        });
        items.push(devTitle);

        const devName = this.add.text(R1_TEXT_X, curY + devTitle.displayHeight + h * 0.01, "Davit Zuroshvili", {
            fontFamily: "Arial",
            fontStyle:  "bold",
            fontSize:   this.fs(20, w),
            color:      "#56A7DE",
            resolution: this.dpr,
        });
        items.push(devName);

        const devDesc = this.add.text(
            R1_TEXT_X,
            curY + devTitle.displayHeight + devName.displayHeight + h * 0.025,
            "A student at Business University ''Turiba'', the one who enjoys and knows programming like the back of his hand. He was dragged into this by the designer, and by bribery of getting a hoodie.", {
            fontFamily:  "Arial",
            fontSize:    this.fs(16, w),
            color:       "#333333",
            wordWrap:    { width: TEXT_COL_W },
            lineSpacing: 4,
            resolution:  this.dpr,
        });
        items.push(devDesc);

        const row1BottomY = curY + ROW_H;
        curY = row1BottomY + h * 0.04;

        // ── ARROW 1 ───────────────────────────────────────────────
        const arrow1StartX = R1_PHOTO_X + PHOTO_SIDE / 2;
        const arrow1StartY = row1BottomY;

        const ARROW_GAP = h * 0.12;
        const arrowMidY = curY + ARROW_GAP / 2;
        curY += ARROW_GAP;

        // ── ROW 2: Vanesa — text left, photo right ────────────────
        const row2StartY = curY;

        const desTitle = this.add.text(R2_TEXT_X, curY, "The Designer", {
            fontFamily: this.isFontLoaded("CamingoDos Pro") ? "CamingoDos Pro" : "Barlow Condensed",
            fontStyle:  "bold",
            fontSize:   this.fs(48, w),
            color:      "#111111",
            resolution: this.dpr,
        });
        items.push(desTitle);

        const desName = this.add.text(R2_TEXT_X, curY + desTitle.displayHeight + h * 0.01, "Vanesa Smite", {
            fontFamily: "Arial",
            fontStyle:  "bold",
            fontSize:   this.fs(20, w),
            color:      "#56A7DE",
            resolution: this.dpr,
        });
        items.push(desName);

        const desDesc = this.add.text(
            R2_TEXT_X,
            curY + desTitle.displayHeight + desName.displayHeight + h * 0.025,
            "A student at Business University ''Turiba'', a creative person who enjoys any crafts, be it robotics or art. Game development holds a special place in her heart, which gave the desire to create her university its very own game.", {
            fontFamily:  "Arial",
            fontSize:    this.fs(16, w),
            color:       "#333333",
            wordWrap:    { width: TEXT_COL_W },
            lineSpacing: 4,
            resolution:  this.dpr,
        });
        items.push(desDesc);

        const van_imgX = R2_PHOTO_X + PHOTO_SIDE / 2;
        const vanesaRt = this.makeContainPortrait("author_vanesa", PHOTO_SIDE, 0xf0f0f0);
        vanesaRt.setPosition(van_imgX, curY + PHOTO_SIDE / 2).setOrigin(0.5);
        items.push(vanesaRt);

        const row2BottomY = curY + ROW_H;

        // ── DRAW ARROW 1 ──────────────────────────────────────────
        items.push(this.drawTwistyArrow(
            arrow1StartX, arrow1StartY,
            van_imgX,     row2StartY + 10,
            arrowMidY
        ));

        curY = row2BottomY + h * 0.04;

        // ── ARROW 2 ───────────────────────────────────────────────
        const arrow2StartX = van_imgX;
        const arrow2StartY = row2BottomY;
        const ARROW2_GAP   = h * 0.12;
        const arrow2MidY   = curY + ARROW2_GAP / 2;
        const arrow2EndY   = curY + ARROW2_GAP;

        items.push(this.drawTwistyArrow(
            arrow2StartX, arrow2StartY,
            w / 2,        arrow2EndY,
            arrow2MidY,
            true
        ));

        curY = arrow2EndY + h * 0.02;

        // ── ROW 3: Reality of game dev ────────────────────────────
        const row3Width = w * 0.7;

        const realityTitle = this.add.text(w / 2, curY, "THE REALITY OF GAME DEV.", {
            fontFamily: "Arial",
            fontStyle:  "bold",
            fontSize:   this.fs(38, w),
            color:      "#56A7DE",
            resolution: this.dpr,
        }).setOrigin(0.5, 0);
        items.push(realityTitle);

        curY += realityTitle.displayHeight + h * 0.02;

        const realityDesc = this.add.text(w / 2, curY,
            "''Even though we enjoyed creating a game for our University, we won't lie and say that it was easy. There were frustrations and sleepless nights. Yet, we still made it.''", {
            fontFamily:  "Arial",
            fontSize:    this.fs(16, w),
            color:       "#333333",
            wordWrap:    { width: row3Width },
            lineSpacing: 5,
            align:       "center",
            resolution:  this.dpr,
        }).setOrigin(0.5, 0);
        items.push(realityDesc);

        curY += realityDesc.displayHeight + h * 0.045;

        // ── PHOTO ROW ─────────────────────────────────────────────
        const PHOTO_KEYS  = ["credits_img_1", "credits_img_2", "credits_img_3"];
        const PHOTO_COUNT = PHOTO_KEYS.length;
        const PHOTO_GAP   = w * 0.025;
        const PHOTO_SIZE  = Math.min((row3Width - PHOTO_GAP * (PHOTO_COUNT - 1)) / PHOTO_COUNT, h * 0.22);
        const ROW_TOTAL_W = PHOTO_SIZE * PHOTO_COUNT + PHOTO_GAP * (PHOTO_COUNT - 1);
        let photoX        = w / 2 - ROW_TOTAL_W / 2 + PHOTO_SIZE / 2;

        PHOTO_KEYS.forEach(key => {
            const rt = this.makeContainPortrait(key, PHOTO_SIZE, 0xf0f0f0);
            rt.setPosition(photoX, curY + PHOTO_SIZE / 2).setOrigin(0.5);
            items.push(rt);
            photoX += PHOTO_SIZE + PHOTO_GAP;
        });

        curY += PHOTO_SIZE + h * 0.08;

        this._contentHeight = curY;
        return items;
    }

    computeContentHeight(items, h) {
        return this._contentHeight || h * 2;
    }

    // ─────────────────────────────────────────────────────────────
    //  PORTRAIT / IMAGE HELPER
    // ─────────────────────────────────────────────────────────────
    makeContainPortrait(key, squareSize, bgColor = 0xeeeeee) {
        const rt = this.add.renderTexture(0, 0, squareSize, squareSize).setOrigin(0.5);

        const bgRect = this.add.graphics().setVisible(false);
        bgRect.fillStyle(bgColor, 1);
        bgRect.fillRect(0, 0, squareSize, squareSize);
        rt.draw(bgRect, 0, 0);
        bgRect.destroy();

        if (!this.textures.exists(key)) return rt;

        const frame = this.textures.getFrame(key);
        const srcW  = frame.realWidth;
        const srcH  = frame.realHeight;

        const scale = Math.min(squareSize / srcW, squareSize / srcH);
        const dstW  = srcW * scale;
        const dstH  = srcH * scale;

        const offX  = (squareSize - dstW) / 2;
        const offY  = (squareSize - dstH) / 2;

        const tmp = this.add.image(0, 0, key)
            .setOrigin(0, 0)
            .setScale(scale)
            .setVisible(false);

        rt.draw(tmp, offX, offY);
        tmp.destroy();

        return rt;
    }

    // ─────────────────────────────────────────────────────────────
    //  TWISTY ARROW
    // ─────────────────────────────────────────────────────────────
    drawTwistyArrow(x1, y1, x2, y2, midY, reverseX = false) {
        const g = this.add.graphics();
        // Scale stroke width with screen width
        const strokeW = Math.max(3, Math.min(this.scale.width * 0.008, 8));
        g.lineStyle(strokeW, 0x56A7DE, 1);

        const flip = reverseX ? -1 : 1;
        const cp1x = x1 + flip * 60;
        const cp1y = y1 + (midY - y1) * 0.6;
        const cp2x = x2 - flip * 60;
        const cp2y = y2 - (y2 - midY) * 0.6;

        const STEPS = 60;
        let prevX = x1, prevY = y1;
        for (let i = 1; i <= STEPS; i++) {
            const t  = i / STEPS;
            const it = 1 - t;
            const nx = it*it*it*x1 + 3*it*it*t*cp1x + 3*it*t*t*cp2x + t*t*t*x2;
            const ny = it*it*it*y1 + 3*it*it*t*cp1y + 3*it*t*t*cp2y + t*t*t*y2;
            g.strokeLineShape(new Phaser.Geom.Line(prevX, prevY, nx, ny));
            prevX = nx; prevY = ny;
        }

        const angle   = Math.atan2(y2 - cp2y, x2 - cp2x);
        const ARR_LEN = Math.max(12, strokeW * 3);
        const ARR_ANG = 0.4;
        g.strokeLineShape(new Phaser.Geom.Line(
            x2, y2,
            x2 - ARR_LEN * Math.cos(angle - ARR_ANG),
            y2 - ARR_LEN * Math.sin(angle - ARR_ANG)
        ));
        g.strokeLineShape(new Phaser.Geom.Line(
            x2, y2,
            x2 - ARR_LEN * Math.cos(angle + ARR_ANG),
            y2 - ARR_LEN * Math.sin(angle + ARR_ANG)
        ));

        return g;
    }

    // ─────────────────────────────────────────────────────────────
    //  SCROLL INPUT
    // ─────────────────────────────────────────────────────────────
    setupScrollInput() {
        this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
            this.scrollY = Phaser.Math.Clamp(
                this.scrollY + deltaY * 0.8,
                this.minScrollY,
                this.maxScrollY
            );
            this.scrollContent.y = -this.scrollY;
        });

        let touchStartY  = 0;
        let scrollStartY = 0;
        let isDragging   = false;

        this.input.on("pointerdown", (p) => {
            touchStartY  = p.y;
            scrollStartY = this.scrollY;
            isDragging   = true;
        });

        this.input.on("pointermove", (p) => {
            if (!isDragging || !p.isDown) return;
            const delta = touchStartY - p.y;
            this.scrollY = Phaser.Math.Clamp(
                scrollStartY + delta,
                this.minScrollY,
                this.maxScrollY
            );
            this.scrollContent.y = -this.scrollY;
        });

        this.input.on("pointerup", () => { isDragging = false; });
    }

    // ─────────────────────────────────────────────────────────────
    //  RESIZE
    // ─────────────────────────────────────────────────────────────
    onResize(gameSize) {
        if (!this.scene.isActive("CreditsScene") || !this.uiCreated) return;
        const { width: w, height: h } = gameSize;

        this.drawBackground(w, h);

        if (this.scrollContent)  this.scrollContent.destroy();
        if (this.scrollMask)     this.scrollMask.destroy();
        if (this.scrollGraphics) this.scrollGraphics.destroy();

        this.createScrollContainer(w, h);
        this.createBackButton(w, h);
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

    shutdown() {
        this.scale.off("resize", this.onResize, this);
        this.input.off("wheel");
        this.input.off("pointerdown");
        this.input.off("pointermove");
        this.input.off("pointerup");
    }
}