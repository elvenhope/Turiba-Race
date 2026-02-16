export default class MenuScene extends Phaser.Scene {
	constructor() {
		super("MenuScene");
	}

	preload() {
		this.load.image("bg", "assets/menuBg.jpeg");
	}

	create() {
		this.createUI();

		// Re-layout on resize / orientation change
		this.scale.on("resize", this.onResize, this);
	}

	createUI() {
		const { width, height } = this.scale;

		// Fullscreen background
		this.bg = this.add.image(width / 2, height / 2, "bg");
		this.bg.setDisplaySize(width, height);

		// Start button
		this.startButton = this.add.container(width * 0.83, height * 0.25);
		const hitArea = this.add.rectangle(0, 0, 260, 100, 0x000000, 0);
		this.startButton.add(hitArea);
		this.startButton.setSize(260, 100);
		this.startButton.setInteractive({ useHandCursor: true });
		this.startButton.on("pointerup", () => {
			this.scene.start("CharScene");
		});
	}

	onResize(gameSize) {
		const { width, height } = gameSize;

		this.bg.setDisplaySize(width, height);
		this.bg.setPosition(width / 2, height / 2);

		this.startButton.setPosition(width * 0.83, height * 0.25);
	}
}
