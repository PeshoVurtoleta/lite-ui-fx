import type { UIFXRecipe } from '../UIFXController';

// ── Toggles ──
export declare function PendulumToggle(): UIFXRecipe;
export declare function CircuitToggle(options?: { seed?: number }): UIFXRecipe;
export declare function LightningToggle(options?: { seed?: number }): UIFXRecipe;
export declare function DNAToggle(): UIFXRecipe;

// ── Buttons ──
export declare function HeartbeatButton(options?: { seed?: number }): UIFXRecipe;
export declare function BreathingButton(): UIFXRecipe;
export declare function InkSplashButton(options?: { seed?: number }): UIFXRecipe;
export declare function PixelDissolveButton(options?: { seed?: number; cols?: number; rows?: number }): UIFXRecipe;
export declare function FireworkButton(options?: { seed?: number }): UIFXRecipe;

// ── Sliders ──
export declare function AuroraSlider(): UIFXRecipe;
export declare function WaveSlider(options?: { seed?: number }): UIFXRecipe;
export declare function ElasticBandSlider(): UIFXRecipe;
export declare function GravitySlider(): UIFXRecipe;

// ── Loaders ──
export declare function OrbitLoader(): UIFXRecipe;
export declare function HelixLoader(): UIFXRecipe;

// ── Checkboxes ──
export declare function RippleCheck(): UIFXRecipe;
export declare function MorphCheck(): UIFXRecipe;

// ── Counters ──
export declare function FlameCounter(options?: { seed?: number }): UIFXRecipe;
export declare function GlitchCounter(options?: { seed?: number }): UIFXRecipe;

// ── Rating ──
export declare function BubbleRating(options?: { seed?: number }): UIFXRecipe;

export declare const UIFXRecipes2: {
    PendulumToggle: typeof PendulumToggle;
    CircuitToggle: typeof CircuitToggle;
    LightningToggle: typeof LightningToggle;
    DNAToggle: typeof DNAToggle;
    HeartbeatButton: typeof HeartbeatButton;
    BreathingButton: typeof BreathingButton;
    InkSplashButton: typeof InkSplashButton;
    PixelDissolveButton: typeof PixelDissolveButton;
    FireworkButton: typeof FireworkButton;
    AuroraSlider: typeof AuroraSlider;
    WaveSlider: typeof WaveSlider;
    ElasticBandSlider: typeof ElasticBandSlider;
    GravitySlider: typeof GravitySlider;
    OrbitLoader: typeof OrbitLoader;
    HelixLoader: typeof HelixLoader;
    RippleCheck: typeof RippleCheck;
    MorphCheck: typeof MorphCheck;
    FlameCounter: typeof FlameCounter;
    GlitchCounter: typeof GlitchCounter;
    BubbleRating: typeof BubbleRating;
};
export default UIFXRecipes2;
