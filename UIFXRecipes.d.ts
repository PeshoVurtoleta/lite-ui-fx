import type { UIFXRecipe, UIFXInstance, MountOptions } from './UIFXController';

// ===========================================================
//  RECIPE FACTORIES (all 50)
// ===========================================================

// -- Vol.1: Toggles --
export declare function SwarmToggle(options?: { seed?: number; count?: number }): UIFXRecipe;
export declare function LiquidToggle(): UIFXRecipe;
export declare function NeonPulseToggle(): UIFXRecipe;

// -- Vol.1: Buttons --
export declare function MagneticButton(options?: { maxPull?: number }): UIFXRecipe;
export declare function ShatterButton(options?: { seed?: number }): UIFXRecipe;
export declare function ConfettiButton(options?: { seed?: number; colors?: string[] }): UIFXRecipe;
export declare function GlitchButton(options?: { seed?: number }): UIFXRecipe;

// -- Vol.1: Sliders --
export declare function SparkSlider(options?: { seed?: number; color?: string }): UIFXRecipe;
export declare function CosmicSlider(options?: { seed?: number; dustCount?: number }): UIFXRecipe;
export declare function LaserSlider(): UIFXRecipe;

// -- Vol.2: Toggles --
export declare function PendulumToggle(): UIFXRecipe;
export declare function CircuitToggle(options?: { seed?: number }): UIFXRecipe;
export declare function LightningToggle(options?: { seed?: number }): UIFXRecipe;
export declare function DNAToggle(): UIFXRecipe;

// -- Vol.2: Buttons --
export declare function HeartbeatButton(options?: { seed?: number }): UIFXRecipe;
export declare function BreathingButton(): UIFXRecipe;
export declare function InkSplashButton(options?: { seed?: number }): UIFXRecipe;
export declare function PixelDissolveButton(options?: { seed?: number; cols?: number; rows?: number }): UIFXRecipe;
export declare function FireworkButton(options?: { seed?: number }): UIFXRecipe;

// -- Vol.2: Sliders --
export declare function AuroraSlider(): UIFXRecipe;
export declare function WaveSlider(options?: { seed?: number }): UIFXRecipe;
export declare function ElasticBandSlider(): UIFXRecipe;
export declare function GravitySlider(): UIFXRecipe;

// -- Vol.2: Loaders --
export declare function OrbitLoader(): UIFXRecipe;
export declare function HelixLoader(): UIFXRecipe;

// -- Vol.2: Checkboxes --
export declare function RippleCheck(): UIFXRecipe;
export declare function MorphCheck(): UIFXRecipe;

// -- Vol.2: Counters --
export declare function FlameCounter(options?: { seed?: number }): UIFXRecipe;
export declare function GlitchCounter(options?: { seed?: number }): UIFXRecipe;

// -- Vol.2: Rating --
export declare function BubbleRating(options?: { seed?: number }): UIFXRecipe;

// -- Vol.3: Knobs --
export declare function VolumeKnob(): UIFXRecipe;
export declare function CompassKnob(): UIFXRecipe;

// -- Vol.3: Progress --
export declare function RingProgress(options?: { seed?: number }): UIFXRecipe;
export declare function BatteryGauge(): UIFXRecipe;
export declare function SignalMeter(): UIFXRecipe;

// -- Vol.3: Controls --
export declare function PillTabs(): UIFXRecipe;
export declare function Stepper(): UIFXRecipe;
export declare function RadioOrbit(): UIFXRecipe;

// -- Vol.3: Indicators --
export declare function PasswordStrength(): UIFXRecipe;
export declare function WaterLevel(): UIFXRecipe;
export declare function HeatMap(options?: { seed?: number }): UIFXRecipe;

// -- Vol.3: Mood --
export declare function DayNightToggle(options?: { seed?: number }): UIFXRecipe;
export declare function ReactionPicker(): UIFXRecipe;
export declare function NotificationBell(): UIFXRecipe;

// -- Vol.3: Feedback --
export declare function TypewriterField(): UIFXRecipe;
export declare function SoundWaveBtn(): UIFXRecipe;
export declare function UploadProgress(): UIFXRecipe;

// -- Vol.3: Fun --
export declare function ScratchReveal(options?: { seed?: number }): UIFXRecipe;
export declare function TimerCountdown(): UIFXRecipe;
export declare function PullRefresh(): UIFXRecipe;

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
