export default class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	// ─────────────────────────────────────────────────────────────
	//  BUTTON CONFIG
	//  Tweak offsetX / offsetY per button to nudge individual positions.
	//  Values are in pixels relative to the auto-calculated base position.
	//  You can also set separate mobileOffsetX/Y for phone layout.
	// ─────────────────────────────────────────────────────────────
	get BUTTON_CONFIG() {
		return [
			{
				id: "startButton",
				defaultTexture: "start_default",
				hoverTexture: "start_hoover",
				label: "START",
				offsetX: 0,   // desktop nudge
				offsetY: 0,
				mobileOffsetX: 0,   // phone nudge
				mobileOffsetY: 0,
				callback: () => this.scene.start("CharScene"),
			},
			{
				id: "creditsButton",
				defaultTexture: "credits_default",
				hoverTexture: "credits_hoover",
				label: "CREDITS",
				offsetX: -100,
				offsetY: 0,
				mobileOffsetX: -150,
				mobileOffsetY: 0,
				callback: () => console.log("Credits pressed!"),
			},
			{
				id: "batButton",
				defaultTexture: "bat_default",
				hoverTexture: "bat_hoover",
				label: "BAT",
				offsetX: -10,
				offsetY: 0,
				mobileOffsetX: -70,
				mobileOffsetY: 0,
				callback:       () => window.open("https://www.turiba.lv", "_blank"),
			},
			{
				id: "clickmeButton",
				defaultTexture: "clickme_default",
				hoverTexture: "clickme_hoover",
				label: "CLICK ME",
				offsetX: -100,
				offsetY: 0,
				mobileOffsetX: -150,
				mobileOffsetY: 0,
				callback: () => console.log("Click me pressed!"),
			},
		];
	}

	// ─────────────────────────────────────────────────────────────
	//  RESPONSIVE HELPERS
	//
	//  Device tiers (landscape only):
	//    "desktop"      — aspect ratio <= 1.9  (e.g. 16:9  = 1.78, 16:10 = 1.6)
	//    "wideMobile"   — aspect ratio >  1.9  (e.g. Xiaomi 2456x1080 = 2.27)
	//
	//  Adjust the 1.9 threshold here if needed.
	// ─────────────────────────────────────────────────────────────
	get aspectRatio() {
		return this.scale.width / this.scale.height;
	}

	get isWideMobile() {
		return this.aspectRatio > 1.9;
	}

	/**
	 * uiScale — keeps every element proportional to a 1280x720 reference canvas.
	 * Clamped so things never get absurdly tiny or huge.
	 */
	get uiScale() {
		const { width, height } = this.scale;
		const s = Math.min(width / 1280, height / 720);
		return Math.max(0.4, Math.min(s, 2.0));
	}

	// ─────────────────────────────────────────────────────────────
	//  LAYOUT  (fractions of screen — tweak these to move things)
	// ─────────────────────────────────────────────────────────────
	getLayout() {
		const { width, height } = this.scale;
		const wide = this.isWideMobile;   // true = phone in landscape

		return {
			// ── Title ──────────────────────────────────────────
			titleX: wide ? width * 0.03 : width * 0.05,
			titleY: wide ? height * 0.05 : height * 0.08,
			titleFontSize: Math.round((wide ? 70 : 90) * this.uiScale),

			// ── Pole ───────────────────────────────────────────
			// On a super-wide screen push the pole further right so the
			// left side has room for the title
			poleX: wide ? width * 0.78 : width * 0.80,
			poleY: wide ? height * 0.15 : height * 0.20,
			poleFraction: wide ? 0.98 : 0.85,

			// ── Button column ──────────────────────────────────
			// Slightly to the left of the pole base
			buttonBaseX: wide ? width * 0.78 : width * 0.75,
			buttonBaseY: wide ? height * 0.22 : height * 0.3,
			buttonSpacing: wide ? height * 0.15 : height * 0.16,

			// Buttons scale with uiScale; on wide mobile make them
			// a touch smaller so four fit within the shorter height
			buttonW: Math.round((wide ? 300 : 300) * this.uiScale),
			buttonH: Math.round((wide ? 100 : 100) * this.uiScale),
		};
	}

	// ─────────────────────────────────────────────────────────────
	//  PRELOAD
	// ─────────────────────────────────────────────────────────────
	preload() {
		this.load.image("bg", "assets/start_page.png");
		this.load.image("pole", "assets/bg_pole.png");

		this.load.image("start_default", "assets/default/start_default.png");
		this.load.image("start_hoover", "assets/hoover/start_hoover.png");
		this.load.image("clickme_default", "assets/default/clickme_default.png");
		this.load.image("clickme_hoover", "assets/hoover/clickme_hoover.png");
		this.load.image("bat_default", "assets/default/BAT_default.png");
		this.load.image("bat_hoover", "assets/hoover/BAT_hoover.png");
		this.load.image("credits_default", "assets/default/credits_default.png");
		this.load.image("credits_hoover", "assets/hoover/credits_hoover.png");

		this.load.script("webfont", "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js");

		this.load.on("loaderror", (file) =>
			console.error("Error loading:", file.key, file.src)
		);
	}

	// ─────────────────────────────────────────────────────────────
	//  CREATE
	// ─────────────────────────────────────────────────────────────
	create() {
		WebFont.load({
			google: { families: ["Barriecito"] },
			active: () => this.createUI(),
			inactive: () => this.createUI(),   // fallback if no network
		});

		this.scale.on("resize", this.onResize, this);
	}

	createUI() {
		// Guard against double-call (font active + resize race)
		if (this.uiCreated) return;
		this.uiCreated = true;

		const { width, height } = this.scale;
		const layout = this.getLayout();

		// ── Background ──────────────────────────────────────────
		this.bg = this.add.image(0, 0, "bg")
			.setOrigin(0, 0)
			.setDisplaySize(width, height);

		// ── Title ───────────────────────────────────────────────
		this.titleText = this.add.text(
			layout.titleX,
			layout.titleY,
			" T U R Ī B A  \n R A C E",
			{
				fontFamily: "Barriecito",
				fontSize: `${layout.titleFontSize}px`,
				color: "#2d64a5",
				stroke: "#ffffff",
				strokeThickness: 6,
			}
		);

		// ── Pole ────────────────────────────────────────────────
		this.pole = this.add.image(layout.poleX, layout.poleY, "pole")
			.setOrigin(0, 0);
		const poleScale = (height * layout.poleFraction) / this.pole.height;
		this.pole.setScale(poleScale);

		// ── Buttons ─────────────────────────────────────────────
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
	}

	// ─────────────────────────────────────────────────────────────
	//  BUTTON FACTORY
	// ─────────────────────────────────────────────────────────────
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
		button.hoverTexture = hoverTexture;

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

	// ─────────────────────────────────────────────────────────────
	//  RESIZE
	// ─────────────────────────────────────────────────────────────
	onResize(gameSize) {
		// If UI hasn't been built yet (font still loading), skip —
		// createUI will pick up the correct size when it runs.
		if (!this.uiCreated) return;

		const { width, height } = gameSize;
		const layout = this.getLayout();

		if (this.bg) this.bg.setDisplaySize(width, height);

		if (this.titleText) {
			this.titleText.setPosition(layout.titleX, layout.titleY);
			this.titleText.setFontSize(`${layout.titleFontSize}px`);
		}

		if (this.pole) {
			this.pole.setPosition(layout.poleX, layout.poleY);
			const poleScale = (height * layout.poleFraction) / this.pole.height;
			this.pole.setScale(poleScale);
		}

		if (this.buttons) {
			this.buttons.forEach((btn) => {
				const cfg = this.BUTTON_CONFIG[btn.configIndex];
				const ox = this.isWideMobile ? cfg.mobileOffsetX : cfg.offsetX;
				const oy = this.isWideMobile ? cfg.mobileOffsetY : cfg.offsetY;

				const bx = layout.buttonBaseX + ox;
				const by = layout.buttonBaseY + layout.buttonSpacing * btn.configIndex + oy;

				btn.setPosition(bx, by);
				btn.setDisplaySize(layout.buttonW, layout.buttonH);
				btn.btnW = layout.buttonW;
				btn.btnH = layout.buttonH;
			});
		}
	}
}