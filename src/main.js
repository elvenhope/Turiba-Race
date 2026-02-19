import MenuScene from "./scenes/MenuScene.js";
import RaceScene from "./scenes/RaceScene.js";
import UIScene from "./scenes/uiScene.js";
import CharScene from "./scenes/CharScene.js";
import FinishOverlay from './scenes/FinishOverlay.js';
import CreditsScene from './scenes/CreditsScene.js';

const config = {
	type: Phaser.AUTO,
	parent: "game-container",
	width: 1280,     // use full available width
	height: 720,  // optional: full height

	backgroundColor: "#000000",

	pixelArt: false,

	render: {
        antialias:    true,   // smooth curves / diagonals on images
        antialiasGL:  true,
        roundPixels:  false,  // keep false — rounding blurs text at non-integer positions
    },

	scale: {
		mode: Phaser.Scale.EXPAND,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		orientation: Phaser.Scale.LANDSCAPE,
		// width: window.innerWidth,     // use full available width
		// height: window.innerHeight,   // optional: full height
	},

	physics: {
		default: "matter",
		matter: {
			debug: false,
			gravity: { x: 0, y: 0 }
		}
	},


	input: {
		activePointers: 3
	},

	scene: [MenuScene, RaceScene, UIScene, CharScene, FinishOverlay, CreditsScene],
};

new Phaser.Game(config);
