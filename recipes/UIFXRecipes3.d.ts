import type { UIFXRecipe } from '../UIFXController';

// ── Knobs ──
export declare function VolumeKnob(): UIFXRecipe;
export declare function CompassKnob(): UIFXRecipe;

// ── Progress ──
export declare function RingProgress(options?: { seed?: number }): UIFXRecipe;
export declare function BatteryGauge(): UIFXRecipe;
export declare function SignalMeter(): UIFXRecipe;

// ── Controls ──
export declare function PillTabs(): UIFXRecipe;
export declare function Stepper(): UIFXRecipe;
export declare function RadioOrbit(): UIFXRecipe;

// ── Indicators ──
export declare function PasswordStrength(): UIFXRecipe;
export declare function WaterLevel(): UIFXRecipe;
export declare function HeatMap(options?: { seed?: number }): UIFXRecipe;

// ── Mood ──
export declare function DayNightToggle(options?: { seed?: number }): UIFXRecipe;
export declare function ReactionPicker(): UIFXRecipe;
export declare function NotificationBell(): UIFXRecipe;

// ── Feedback ──
export declare function TypewriterField(): UIFXRecipe;
export declare function SoundWaveBtn(): UIFXRecipe;
export declare function UploadProgress(): UIFXRecipe;

// ── Fun ──
export declare function ScratchReveal(options?: { seed?: number }): UIFXRecipe;
export declare function TimerCountdown(): UIFXRecipe;
export declare function PullRefresh(): UIFXRecipe;

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
export default UIFXRecipes3;
