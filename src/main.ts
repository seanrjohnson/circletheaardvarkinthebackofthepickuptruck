import Phaser from "phaser";
import { GameScene } from "./game/GameScene";
import "./style.css";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: 640,
  height: 480,
  backgroundColor: "#111111",
  pixelArt: true,
  antialias: false,
  render: { pixelArt: true, antialias: false, roundPixels: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 640,
    height: 480,
  },
  input: { activePointers: 2 },
  scene: [GameScene],
});
