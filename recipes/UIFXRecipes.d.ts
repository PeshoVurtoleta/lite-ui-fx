import type {UIFXRecipe } from '../UIFXController';

// ── Toggles ──
export declare function SwarmToggle(options?: { seed?: number; count?: number }): UIFXRecipe;
export declare function LiquidToggle(): UIFXRecipe;
export declare function NeonPulseToggle(): UIFXRecipe;

// ── Buttons ──
export declare function MagneticButton(options?: { maxPull?: number }): UIFXRecipe;
export declare function ShatterButton(options?: { seed?: number }): UIFXRecipe;
export declare function ConfettiButton(options?: { seed?: number; colors?: string[] }): UIFXRecipe;
export declare function GlitchButton(options?: { seed?: number }): UIFXRecipe;

// ── Sliders ──
export declare function SparkSlider(options?: { seed?: number; color?: string }): UIFXRecipe;
export declare function CosmicSlider(options?: { seed?: number; dustCount?: number }): UIFXRecipe;
export declare function LaserSlider(): UIFXRecipe;

export declare const UIFXRecipes: {
    SwarmToggle: typeof SwarmToggle;
    LiquidToggle: typeof LiquidToggle;
    NeonPulseToggle: typeof NeonPulseToggle;
    MagneticButton: typeof MagneticButton;
    ShatterButton: typeof ShatterButton;
    ConfettiButton: typeof ConfettiButton;
    GlitchButton: typeof GlitchButton;
    SparkSlider: typeof SparkSlider;
    CosmicSlider: typeof CosmicSlider;
    LaserSlider: typeof LaserSlider;
};
export default UIFXRecipes;
