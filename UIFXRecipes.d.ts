import type {
    UIFXRecipe, UIFXInstance, MountOptions,
    UIFXGroupRecipe, GroupOptions, UIFXGroupInstance, DecorateInstance,
    HeadlessSkinRecipe,
} from './UIFXController';

// ===========================================================
//  RECIPE OPTIONS + FACTORIES (all 57)
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
// -- U4a: CHECKBOX recipes (honour st.indeterminate) --
export declare function TickDraw(options?: RecipeOptions): UIFXRecipe;
export declare function IndeterminateScan(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Counters --
export declare function FlameCounter(options?: RecipeOptions): UIFXRecipe;
export declare function GlitchCounter(options?: RecipeOptions): UIFXRecipe;

// -- Vol.2: Rating --
/** U7 GROUP (rating): mount via mountUIFXGroup(GroupType.RATING, ...). */
export declare function BubbleRating(options?: RecipeOptions): UIFXGroupRecipe;

// -- Vol.3: Knobs --
export declare function VolumeKnob(options?: RecipeOptions): UIFXRecipe;
export declare function CompassKnob(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Progress --
export declare function RingProgress(options?: RecipeOptions): UIFXRecipe;
export declare function BatteryGauge(options?: RecipeOptions): UIFXRecipe;
export declare function SignalMeter(options?: RecipeOptions): UIFXRecipe;
// -- U4a: PROGRESS recipe --
export declare function LiquidFill(options?: RecipeOptions): UIFXRecipe;

// -- Vol.3: Controls --
// -- U7 GROUP recipes (mounted via mountUIFXGroup): N native elements + one
//    canvas. PillTabs/SegmentedSlide -> GroupType.TABS, Stepper -> STEPPER,
//    RadioOrbit -> RADIO. See decisions/0007. --
export declare function PillTabs(options?: RecipeOptions): UIFXGroupRecipe;
export declare function SegmentedSlide(options?: RecipeOptions): UIFXGroupRecipe;
export declare function Stepper(options?: RecipeOptions): UIFXGroupRecipe;
export declare function RadioOrbit(options?: RecipeOptions): UIFXGroupRecipe;

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

// -- U4b: DECORATE recipes (mounted AROUND a live element via decorateUIFX).
//    Generic form feedback; PasswordStrength + TypewriterField (above) re-home
//    onto decorate mode too. See decisions/0004. --
export declare function FocusHalo(options?: RecipeOptions): UIFXRecipe;
export declare function ErrorShake(options?: RecipeOptions): UIFXRecipe;
export declare function SuccessBloom(options?: RecipeOptions): UIFXRecipe;

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

/** U4a additions -- new native element types (kept out of the Vol.1-3 snapshots). */
export declare const UIFXRecipes4: {
    TickDraw: typeof TickDraw;
    IndeterminateScan: typeof IndeterminateScan;
    LiquidFill: typeof LiquidFill;
};

/** U4b additions -- decorate-mode recipes (kept out of the Vol.1-3 + Vol.4 snapshots). */
export declare const UIFXRecipes5: {
    FocusHalo: typeof FocusHalo;
    ErrorShake: typeof ErrorShake;
    SuccessBloom: typeof SuccessBloom;
};

/** U7 additions -- grouped controls (mounted via mountUIFXGroup). PillTabs/Stepper/
 *  RadioOrbit/BubbleRating re-home from vol.3 single-element fakes; SegmentedSlide
 *  is new. See decisions/0007. */
export declare const UIFXRecipes6: {
    SegmentedSlide: typeof SegmentedSlide;
};

// ===========================================================
//  RECIPE REGISTRY
// ===========================================================

// Beyond the UITypes there are two non-UIType routing tags: 'decorate' (U4b,
// mounted AROUND a live element via decorateUIFX -- 0004) and the four GroupTypes
// (U7, mounted as N native elements + one canvas via mountUIFXGroup -- 0007).
export type RecipeType =
    | 'toggle' | 'button' | 'slider' | 'checkbox' | 'progress' | 'knob'
    | 'decorate'
    | 'radio' | 'tabs' | 'stepper' | 'rating';

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
 * Resolve a recipe id to its factory + declared type and mount it. A hijack
 * recipe mounts via mountUIFX (the native element is created inside `container`);
 * a recipe whose meta.type is 'decorate' mounts via decorateUIFX, treating
 * `container` as the LIVE element to decorate; a GROUP type (radio/tabs/stepper/
 * rating) mounts via mountUIFXGroup with `container` as the parent and `items` in
 * options. Fail closed: unknown id or a conflicting options.type throws.
 */
export declare function mountRecipe(
    container: HTMLElement,
    id: string,
    options?: (MountOptions | GroupOptions) & { type?: RecipeType },
): UIFXInstance | UIFXGroupInstance | DecorateInstance;

// ===========================================================
//  DEFAULT EXPORT -- combined all-57 namespace
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
    TickDraw: typeof TickDraw;
    IndeterminateScan: typeof IndeterminateScan;
    FlameCounter: typeof FlameCounter;
    GlitchCounter: typeof GlitchCounter;
    BubbleRating: typeof BubbleRating;
    VolumeKnob: typeof VolumeKnob;
    CompassKnob: typeof CompassKnob;
    RingProgress: typeof RingProgress;
    BatteryGauge: typeof BatteryGauge;
    SignalMeter: typeof SignalMeter;
    LiquidFill: typeof LiquidFill;
    PillTabs: typeof PillTabs;
    SegmentedSlide: typeof SegmentedSlide;
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
    FocusHalo: typeof FocusHalo;
    ErrorShake: typeof ErrorShake;
    SuccessBloom: typeof SuccessBloom;
};
export default UIFXAllRecipes;

// ===========================================================
//  HEADLESS SKINS (E1, decisions/0008)
//  A sibling registry of RECIPES/RECIPE_META: skins are driven by skinHeadless
//  (a handle + host), never by mountRecipe (a container), so they are kept
//  separate and the 57-recipe count is unchanged.
// ===========================================================

export declare function SwitchSkin(options?: RecipeOptions): HeadlessSkinRecipe;
export declare function SliderSkin(options?: RecipeOptions): HeadlessSkinRecipe;
export declare function ProgressSkin(options?: RecipeOptions): HeadlessSkinRecipe;
export declare function RatingSkin(options?: RecipeOptions): HeadlessSkinRecipe;

/** A headless-skin meta row. `primitive` names the lite-headless primitive the
 *  skin is designed to paint. */
export interface SkinMeta {
    id: string;
    name: string;
    primitive: string;
    themeable: boolean;
    motionSafe: boolean;
}

/** id -> skin factory (null-prototype). Driven by skinHeadless, never mountRecipe. */
export declare const HEADLESS_SKINS: Record<string, (options?: RecipeOptions) => HeadlessSkinRecipe>;
export declare const SKIN_META: SkinMeta[];
export declare const SKIN_NAMES: readonly string[];
