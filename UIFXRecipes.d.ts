import type { UIFXRecipe, UIFXInstance, MountOptions } from './UIFXController';

// ===========================================================
//  RECIPE OPTIONS + FACTORIES (all 50)
// ===========================================================

/**
 * The reserved theming options every recipe factory accepts (decisions/0002).
 * All optional; omitting them reproduces the recipe's shipped look byte-for-byte.
 */
export interface RecipeOptions {
    /** Seed for a recipe's deterministic RNG (particle bursts, jitter). */
    seed?: number;
    /**
     * Positional palette override; wins over `theme`. For most recipes it maps
     * over the role order (accent, dim, surface, ...); for an array-palette recipe
     * (Confetti, Firework, Aurora, RadioOrbit, PasswordStrength, ReactionPicker)
     * it IS the palette.
     */
    colors?: string[];
    /** Named theme roles: `light` -> accent, `mid` -> dim/muted, `dark` -> surface. */
    theme?: { light: string; mid: string; dark: string };
    /**
     * Visible canvas label. Falls back to the mount `label`, then the recipe's
     * default string -- so setting only `label` keeps the visible text equal to the
     * accessible name (WCAG 2.5.3 label-in-name). Ignored by recipes painting no text.
     */
    text?: string;
    /** Canvas font string; falls back to the recipe's historical font literal. */
    font?: string;
}

// -- Vol.1: Toggles --
export declare function SwarmToggle(options?: RecipeOptions & { count?: number }): UIFXRecipe;
export declare function LiquidToggle(options?: RecipeOptions): UIFXRecipe;
export declare function NeonPulseToggle(options?: RecipeOptions): UIFXRecipe;

// -- Vol.1: Buttons --
export declare function MagneticButton(options?: RecipeOptions & { maxPull?: number }): UIFXRecipe;
export declare function ShatterButton(options?: RecipeOptions): UIFXRecipe;
export declare function ConfettiButton(options?: RecipeOptions): UIFXRecipe;
export declare function GlitchButton(options?: RecipeOptions): UIFXRecipe;

// -- Vol.1: Sliders --
export declare function SparkSlider(options?: RecipeOptions & { color?: string }): UIFXRecipe;
export declare function CosmicSlider(options?: RecipeOptions & { dustCount?: number }): UIFXRecipe;
export declare function LaserSlider(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Toggles --
export declare function PendulumToggle(options?: RecipeOptions): UIFXRecipe;
export declare function CircuitToggle(options?: RecipeOptions): UIFXRecipe;
export declare function LightningToggle(options?: RecipeOptions): UIFXRecipe;
export declare function DNAToggle(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Buttons --
export declare function HeartbeatButton(options?: RecipeOptions): UIFXRecipe;
export declare function BreathingButton(options?: RecipeOptions): UIFXRecipe;
export declare function InkSplashButton(options?: RecipeOptions): UIFXRecipe;
export declare function PixelDissolveButton(options?: RecipeOptions & { cols?: number; rows?: number }): UIFXRecipe;
export declare function FireworkButton(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Sliders --
export declare function AuroraSlider(options?: RecipeOptions): UIFXRecipe;
export declare function WaveSlider(options?: RecipeOptions): UIFXRecipe;
export declare function ElasticBandSlider(options?: RecipeOptions): UIFXRecipe;
export declare function GravitySlider(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Loaders --
export declare function OrbitLoader(options?: RecipeOptions): UIFXRecipe;
export declare function HelixLoader(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Checkboxes --
export declare function RippleCheck(options?: RecipeOptions): UIFXRecipe;
export declare function MorphCheck(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Counters --
export declare function FlameCounter(options?: RecipeOptions): UIFXRecipe;
export declare function GlitchCounter(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Rating --
export declare function BubbleRating(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Knobs --
export declare function VolumeKnob(options?: RecipeOptions): UIFXRecipe;
export declare function CompassKnob(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Progress --
export declare function RingProgress(options?: RecipeOptions): UIFXRecipe;
export declare function BatteryGauge(options?: RecipeOptions): UIFXRecipe;
export declare function SignalMeter(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Controls --
export declare function PillTabs(options?: RecipeOptions): UIFXRecipe;
export declare function Stepper(options?: RecipeOptions): UIFXRecipe;
export declare function RadioOrbit(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Indicators --
export declare function PasswordStrength(options?: RecipeOptions): UIFXRecipe;
export declare function WaterLevel(options?: RecipeOptions): UIFXRecipe;
export declare function HeatMap(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Mood --
export declare function DayNightToggle(options?: RecipeOptions): UIFXRecipe;
export declare function ReactionPicker(options?: RecipeOptions): UIFXRecipe;
export declare function NotificationBell(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Feedback --
export declare function TypewriterField(options?: RecipeOptions): UIFXRecipe;
export declare function SoundWaveBtn(options?: RecipeOptions): UIFXRecipe;
export declare function UploadProgress(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Fun --
export declare function ScratchReveal(options?: RecipeOptions): UIFXRecipe;
export declare function TimerCountdown(options?: RecipeOptions): UIFXRecipe;
export declare function PullRefresh(options?: RecipeOptions): UIFXRecipe;

// ===========================================================
//  BARREL OBJECTS (back-compat)
// ===========================================================

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

export declare const UIFXRecipes3: {
    VolumeKnob: typeof VolumeKnob;
    CompassKnob: typeof CompassKnob;
    RingProgress: typeof RingProgress;
    BatteryGauge: typeof BatteryGauge;
    SignalMeter: typeof SignalMeter;
    PillTabs: typeof PillTabs;
    Stepper: typeof Stepper;
    RadioOrbit: typeof RadioOrbit;
    PasswordStrength: typeof PasswordStrength;
    WaterLevel: typeof WaterLevel;
    HeatMap: typeof HeatMap;
    DayNightToggle: typeof DayNightToggle;
    ReactionPicker: typeof ReactionPicker;
    NotificationBell: typeof NotificationBell;
    TypewriterField: typeof TypewriterField;
    SoundWaveBtn: typeof SoundWaveBtn;
    UploadProgress: typeof UploadProgress;
    ScratchReveal: typeof ScratchReveal;
    TimerCountdown: typeof TimerCountdown;
    PullRefresh: typeof PullRefresh;
};

// ===========================================================
//  RECIPE REGISTRY
// ===========================================================

export type RecipeType = 'toggle' | 'button' | 'slider';

export type RecipeFactory = (options?: Record<string, unknown>) => UIFXRecipe;

export interface RecipeMeta {
    id: string;
    name: string;
    type: RecipeType;
    family: string;
    themeable: boolean;
    motionSafe: boolean;
}

/** Every recipe factory keyed by id. Null-prototype map. */
export declare const RECIPES: { [id: string]: RecipeFactory };

/** Live metadata array, one row per registered recipe. */
export declare const RECIPE_META: RecipeMeta[];

/** Frozen list of the built-in recipe ids at load time. */
export declare const RECIPE_NAMES: readonly string[];

/** Register a custom recipe, or override a built-in. Returns the factory. */
export declare function registerRecipe(
    id: string,
    factory: RecipeFactory,
    meta?: Partial<Omit<RecipeMeta, 'id'>>,
): RecipeFactory;

/**
 * Resolve a recipe id to its factory + declared type and mount it via mountUIFX.
 * Fail closed: unknown id or a conflicting options.type throws.
 */
export declare function mountRecipe(
    container: HTMLElement,
    id: string,
    options?: MountOptions & { type?: RecipeType },
): UIFXInstance;

// ===========================================================
//  DEFAULT EXPORT -- combined all-50 namespace
// ===========================================================

declare const UIFXAllRecipes: {
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
    VolumeKnob: typeof VolumeKnob;
    CompassKnob: typeof CompassKnob;
    RingProgress: typeof RingProgress;
    BatteryGauge: typeof BatteryGauge;
    SignalMeter: typeof SignalMeter;
    PillTabs: typeof PillTabs;
    Stepper: typeof Stepper;
    RadioOrbit: typeof RadioOrbit;
    PasswordStrength: typeof PasswordStrength;
    WaterLevel: typeof WaterLevel;
    HeatMap: typeof HeatMap;
    DayNightToggle: typeof DayNightToggle;
    ReactionPicker: typeof ReactionPicker;
    NotificationBell: typeof NotificationBell;
    TypewriterField: typeof TypewriterField;
    SoundWaveBtn: typeof SoundWaveBtn;
    UploadProgress: typeof UploadProgress;
    ScratchReveal: typeof ScratchReveal;
    TimerCountdown: typeof TimerCountdown;
    PullRefresh: typeof PullRefresh;
};
export default UIFXAllRecipes;
