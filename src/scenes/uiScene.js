export default class UIScene extends Phaser.Scene {
	constructor() {
		super("UIScene");

		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;
	}

	create() {
		// Reset state variables
		this.touchAccel = false;
		this.touchBrake = false;
		this.steerLeft = false;
		this.steerRight = false;
		this.overlay = null;
		this.overlayButtons = [];
		
		const { width, height } = this.scale;

		// Fixed camera for UI
		this.cameras.main.setScroll(0, 0);
		this.cameras.main.setZoom(1);

		// Circle radius (responsive)
		this.radius = Math.min(width, height) * 0.15;

		// --- Lap display ---
		this.lapText = this.add.text(width - 200, 16, "Lap: 0/3", {
			fontSize: "32px",
			fontFamily: "Arial",
			color: "#ffffff",
			backgroundColor: "#000000",
			padding: { x: 10, y: 5 }
		}).setDepth(1000);

		// Remove any existing lapUpdate listener before adding new one
		this.events.off("lapUpdate");
		
		// Listen for lap updates from RaceScene
		this.events.on("lapUpdate", (currentLap, maxLaps) => {
			this.lapText.setText(`Lap: ${currentLap}/${maxLaps}`);
		});

		// --- Touch buttons ---
		this.leftBtn = this.add.circle(0, 0, this.radius, 0x0000ff, 0.3).setInteractive();
		this.rightBtn = this.add.circle(0, 0, this.radius, 0x0000ff, 0.3).setInteractive();
		this.upBtn = this.add.circle(0, 0, this.radius, 0xff0000, 0.3).setInteractive();
		this.downBtn = this.add.circle(0, 0, this.radius, 0xff0000, 0.3).setInteractive();
		this.positionCircles();

		this.addInput(this.leftBtn, "left");
		this.addInput(this.rightBtn, "right");
		this.addInput(this.upBtn, "up");
		this.addInput(this.downBtn, "down");

		// --- Overlay / Burger Menu ---
		this.overlay = null;
		this.overlayButtons = [];
		this.burgerBtn = null;
		this.createBurgerMenu();

		// --- Resize listener ---
		this.scale.on("resize", this.onResize, this);
	}

	addInput(circle, dir) {
		circle.on("pointerdown", () => this.events.emit(`${dir}-down`));
		circle.on("pointerup", () => this.events.emit(`${dir}-up`));
		circle.on("pointerout", () => this.events.emit(`${dir}-up`));
	}

	positionCircles() {
		const { width, height } = this.scale;
		this.radius = Math.min(width, height) * 0.15;

		// Left/Right
		const yLR = height * 0.85;
		const xLeft = width * 0.1;
		const xRight = xLeft + this.radius * 2;
		this.leftBtn.setPosition(xLeft, yLR).setRadius(this.radius);
		this.rightBtn.setPosition(xRight, yLR).setRadius(this.radius);

		// Up/Down
		const xUD = width * 0.9;
		const yUp = height * 0.6;
		const yDown = yUp + this.radius * 2;
		this.upBtn.setPosition(xUD, yUp).setRadius(this.radius);
		this.downBtn.setPosition(xUD, yDown).setRadius(this.radius);

		// Burger button top-left
		if (this.burgerBtn) this.burgerBtn.setPosition(50, 50);

		// Overlay background
		if (this.overlay) {
			const bg = this.overlay.getByName("bg");
			if (bg) {
				bg.setSize(this.scale.width, this.scale.height);
				bg.setPosition(this.scale.width / 2, this.scale.height / 2);
			}
			// Reposition overlay buttons
			const btnStartY = this.scale.height * 0.3;
			this.overlayButtons.forEach((btn, i) => {
				btn.setPosition(this.scale.width / 2, btnStartY + i * 80);
			});
		}
	}

	onResize(gameSize) {
		this.positionCircles();
	}

	// ---------------- Overlay / Burger Menu ----------------
	createBurgerMenu() {
		// Simple burger icon
		this.burgerBtn = this.add.text(50, 50, "☰", { fontSize: "48px", color: "#ffffff" })
			.setInteractive({ useHandCursor: true });
		this.burgerBtn.on("pointerup", () => this.showOverlay());
	}

	showOverlay() {
		if (this.overlay) return;

		this.overlay = this.add.container(0, 0);
		this.overlay.alpha = 0; // start invisible

		// Semi-transparent background
		const bg = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.6)
			.setOrigin(0, 0)
			.setName("bg");
		this.overlay.add(bg);

		const options = ["Resume", "Options", "Back to Menu"];
		this.overlayButtons = [];

		options.forEach((text, i) => {
			const btn = this.add.text(this.scale.width / 2, this.scale.height * 0.3 + i * 80, text, {
				fontSize: "48px",
				color: "#ffffff"
			}).setOrigin(0.5).setInteractive({ useHandCursor: true });

			btn.on("pointerup", () => this.handleOverlayAction(text));
			this.overlay.add(btn);
			this.overlayButtons.push(btn);
		});

		// Fade in overlay
		this.tweens.add({
			targets: this.overlay,
			alpha: 1,
			duration: 300,
			ease: "Power2"
		});
	}

	hideOverlay() {
		if (!this.overlay) return;

		this.tweens.add({
			targets: this.overlay,
			alpha: 0,
			duration: 300,
			ease: "Power2",
			onComplete: () => {
				this.overlay.destroy(true);
				this.overlay = null;
				this.overlayButtons = [];
			}
		});
	}

	handleOverlayAction(action) {
		switch (action) {
			case "Resume":
				this.hideOverlay();
				break;
			case "Options":
				console.log("Options clicked");
				break;
			case "Back to Menu":
				this.hideOverlay();
				this.quitRace();
				break;
		}
	}

	quitRace() {
		// Get the RaceScene to access the socket
		const raceScene = this.scene.get("RaceScene");
		
		if (raceScene && raceScene.socket) {
			// Disconnect socket - this will trigger the server's disconnect handler
			// which already handles removePlayer and roomUpdate
			raceScene.socket.disconnect();
		}
		
		// Stop both scenes
		this.scene.stop("RaceScene");
		this.scene.stop("UIScene");
		
		// Start menu scene
		this.scene.start("MenuScene");
	}

	resetOverlay() {
		if (this.overlay) this.overlay.destroy(true);
		this.overlay = null;
		this.overlayButtons = [];
	}

	shutdown() {
		// Clean up all event listeners when scene is stopped
		this.events.off("lapUpdate");
		this.scale.off("resize", this.onResize, this);
	}
}