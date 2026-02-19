export default class UIScene extends Phaser.Scene {
	constructor() {
		super("UIScene");

		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;
	}

	get isMobile() {
		return (this.scale.width / this.scale.height) > 1.9;
	}

	preload() {
		this.load.image("arrow_up",    "assets/arrow_up.png");
		this.load.image("arrow_down",  "assets/arrow_down.png");
		this.load.image("arrow_left",  "assets/arrow_left.png");
		this.load.image("arrow_right", "assets/arrow_right.png");
	}

	create() {
		this.touchAccel     = false;
		this.touchBrake     = false;
		this.steerLeft      = false;
		this.steerRight     = false;
		this.overlay        = null;
		this.overlayButtons = [];
		this.lapText        = null;   // explicitly null until constructed below

		const { width, height } = this.scale;

		this.cameras.main.setScroll(0, 0);
		this.cameras.main.setZoom(1);

		// --- Lap display ---
		this.lapText = this.add.text(width - 200, 16, "Lap: 0/3", {
			fontSize:        "32px",
			fontFamily:      "Arial",
			color:           "#ffffff",
			backgroundColor: "#000000",
			padding:         { x: 10, y: 5 },
		}).setDepth(1000);

		// Guard: only update lapText if it exists and is still active.
		// RaceScene emits lapUpdate immediately after launching UIScene,
		// which can arrive before create() finishes on slower frames.
		this.events.off("lapUpdate");
		this.events.on("lapUpdate", (currentLap, maxLaps) => {
			if (this.lapText && this.lapText.active) {
				this.lapText.setText(`Lap: ${currentLap}/${maxLaps}`);
			}
		});

		// --- Arrow buttons ---
		this.leftBtn  = this.makeArrow("arrow_left",  "left");
		this.rightBtn = this.makeArrow("arrow_right", "right");
		this.upBtn    = this.makeArrow("arrow_up",    "up");
		this.downBtn  = this.makeArrow("arrow_down",  "down");

		this.positionArrows();

		// --- Burger menu ---
		this.overlay        = null;
		this.overlayButtons = [];
		this.burgerBtn      = null;
		this.createBurgerMenu();

		this.scale.on("resize", this.onResize, this);
	}

	// ─────────────────────────────────────────────────────────────
	//  ARROW FACTORY
	// ─────────────────────────────────────────────────────────────
	makeArrow(textureKey, dir) {
		const img = this.add.image(0, 0, textureKey)
			.setAlpha(0)
			.setDepth(500);

		img.baseScale = 1;

		img.on("pointerdown", () => {
			this.tweens.killTweensOf(img);
			this.tweens.add({
				targets:  img,
				scale:    img.baseScale * 0.80,
				alpha:    0.50,
				duration: 60,
				ease:     "Sine.easeOut",
			});
			this.events.emit(`${dir}-down`);
		});

		const release = () => {
			this.tweens.killTweensOf(img);
			this.tweens.add({
				targets:  img,
				scale:    img.baseScale,
				alpha:    0.85,
				duration: 100,
				ease:     "Sine.easeOut",
			});
			this.events.emit(`${dir}-up`);
		};

		img.on("pointerup",  release);
		img.on("pointerout", release);

		return img;
	}

	applyArrowSize(img, size) {
		img.setDisplaySize(size, size);
		img.baseScale = img.scaleX;
	}

	// ─────────────────────────────────────────────────────────────
	//  POSITIONING
	// ─────────────────────────────────────────────────────────────
	positionArrows() {
		const { width, height } = this.scale;
		const mobile = this.isMobile;

		[this.leftBtn, this.rightBtn, this.upBtn, this.downBtn].forEach(btn => {
			btn.setAlpha(mobile ? 0.85 : 0);
			if (mobile) btn.setInteractive({ useHandCursor: true });
			else        btn.disableInteractive();
		});

		if (!mobile) return;

		const s    = Math.min(width, height) * 0.18;
		const gap  = s * 1;
		const inset = s * 1;

		const yLR    = height - inset;
		const xLeft  = inset;
		const xRight = inset + s + gap;

		this.applyArrowSize(this.leftBtn,  s);
		this.applyArrowSize(this.rightBtn, s);
		this.leftBtn.setPosition(xLeft,  yLR);
		this.rightBtn.setPosition(xRight, yLR);

		const xUD   = width - inset;
		const yDown = height - inset;
		const yUp   = yDown - s - gap;

		this.applyArrowSize(this.upBtn,   s);
		this.applyArrowSize(this.downBtn, s);
		this.upBtn.setPosition(xUD, yUp);
		this.downBtn.setPosition(xUD, yDown);

		if (this.burgerBtn) this.burgerBtn.setPosition(50, 50);

		if (this.overlay) {
			const bg = this.overlay.getByName("bg");
			if (bg) {
				bg.setSize(width, height);
				bg.setPosition(width / 2, height / 2);
			}
			const btnStartY = height * 0.3;
			this.overlayButtons.forEach((btn, i) => {
				btn.setPosition(width / 2, btnStartY + i * 80);
			});
		}
	}

	onResize() {
		if (!this.scene.isActive("UIScene")) return;
		this.positionArrows();
		if (this.lapText && this.lapText.active) {
			this.lapText.setPosition(this.scale.width - 200, 16);
		}
	}

	// ─────────────────────────────────────────────────────────────
	//  BURGER MENU
	// ─────────────────────────────────────────────────────────────
	createBurgerMenu() {
		this.burgerBtn = this.add.text(50, 50, "☰", {
			fontSize: "48px",
			color:    "#ffffff",
		}).setInteractive({ useHandCursor: true }).setDepth(1000);

		this.burgerBtn.on("pointerup", () => this.showOverlay());
	}

	showOverlay() {
		if (this.overlay) return;

		this.overlay       = this.add.container(0, 0);
		this.overlay.alpha = 0;

		const bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.6)
			.setOrigin(0, 0)
			.setName("bg");
		this.overlay.add(bg);

		const options = ["Resume", "Options", "Back to Menu"];
		this.overlayButtons = [];

		options.forEach((text, i) => {
			const btn = this.add.text(
				this.scale.width / 2,
				this.scale.height * 0.3 + i * 80,
				text,
				{ fontSize: "48px", color: "#ffffff" }
			).setOrigin(0.5).setInteractive({ useHandCursor: true });

			btn.on("pointerup", () => this.handleOverlayAction(text));
			this.overlay.add(btn);
			this.overlayButtons.push(btn);
		});

		this.tweens.add({ targets: this.overlay, alpha: 1, duration: 300, ease: "Power2" });
	}

	hideOverlay() {
		if (!this.overlay) return;
		this.tweens.add({
			targets:    this.overlay,
			alpha:      0,
			duration:   300,
			ease:       "Power2",
			onComplete: () => {
				this.overlay.destroy(true);
				this.overlay        = null;
				this.overlayButtons = [];
			},
		});
	}

	handleOverlayAction(action) {
		switch (action) {
			case "Resume":       this.hideOverlay(); break;
			case "Options":      console.log("Options clicked"); break;
			case "Back to Menu": this.hideOverlay(); this.quitRace(); break;
		}
	}

	quitRace() {
		const raceScene = this.scene.get("RaceScene");
		if (raceScene && raceScene.socket) raceScene.socket.disconnect();
		this.scene.stop("FinishOverlay");
		this.scene.stop("RaceScene");
		this.scene.stop("UIScene");
		this.scene.start("MenuScene");
	}

	resetOverlay() {
		if (this.overlay) this.overlay.destroy(true);
		this.overlay        = null;
		this.overlayButtons = [];
	}

	shutdown() {
		// Remove all listeners this scene registered so nothing fires
		// into a destroyed scene on the next race launch
		this.events.off("lapUpdate");
		this.events.off("left-down");
		this.events.off("left-up");
		this.events.off("right-down");
		this.events.off("right-up");
		this.events.off("up-down");
		this.events.off("up-up");
		this.events.off("down-down");
		this.events.off("down-up");
		this.scale.off("resize", this.onResize, this);

		// Destroy overlay cleanly if the scene is stopped mid-game
		if (this.overlay) {
			this.overlay.destroy(true);
			this.overlay        = null;
			this.overlayButtons = [];
		}

		this.lapText = null;
	}
}