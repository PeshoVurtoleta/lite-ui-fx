export declare const VERSION: string;

export type UITypeValue = 'button' | 'toggle' | 'slider' | 'checkbox' | 'progress' | 'knob';

export declare const UIType: Readonly<{
    BUTTON: 'button';
    TOGGLE: 'toggle';
    SLIDER: 'slider';
    /** Plain checkbox (no role=switch); indeterminate via setValue(null). */
    CHECKBOX: 'checkbox';
    /** Native <progress>, non-interactive; value driven by setValue. */
    PROGRESS: 'progress';
    /** <input type=range>; arrows native, pointer mapped by knobMode. */
    KNOB: 'knob';
}>;

export interface UIFXState {
    hover: boolean;
    active: boolean;
    focused: boolean;
    toggled: boolean;
    /** CHECKBOX only: the native indeterminate state (set via setValue(null)). */
    indeterminate: boolean;
    disabled: boolean;
    val: number;
    w: number;
    h: number;
    padding: number;
    dpr: number;
}

export interface UIFXPointer {
    x: number;
    y: number;
    vx: number;
    vy: number;
}

export interface UIFXRecipe {
    init?(ctx: CanvasRenderingContext2D, w: number, h: number, padding: number): void;

    tick(ctx: CanvasRenderingContext2D, dt: number, now: number, state: UIFXState, pointer: UIFXPointer): void;

    onHover?(state: UIFXState, pointer: UIFXPointer): void;

    onLeave?(state: UIFXState, pointer: UIFXPointer): void;

    onClick?(x: number, y: number, state: UIFXState): void;

    onToggle?(checked: boolean, state: UIFXState): void;

    onDrag?(value: number, velocity: number, state: UIFXState): void;

    destroy?(): void;
}

export type RecipeFactory = () => UIFXRecipe;

export interface MountOptions {
    width?: number;
    height?: number;
    padding?: number;
    label?: string;
    /** Slider initial value, 0..1 (default 0.5). Out-of-range or non-number throws. */
    value?: number;
    /** Toggle initial checked state (default false). */
    checked?: boolean;
    /** Disables the native element and sets state.disabled for recipes. */
    disabled?: boolean;
    // -- Reserved recipe theming options (decisions/0002). Validated fail-closed,
    //    then forwarded to the recipe factory. All optional; omitting them keeps
    //    the recipe's shipped look byte-for-byte.
    /** Seed for a recipe's deterministic RNG. */
    seed?: number;
    /** Positional palette override; wins over `theme`. */
    colors?: string[];
    /** Named theme roles: light -> accent, mid -> dim/muted, dark -> surface. */
    theme?: { light: string; mid: string; dark: string };
    /** Visible canvas label; falls back to `label`, then the recipe default. */
    text?: string;
    /** Canvas font string; falls back to the recipe's historical font. */
    font?: string;
    /** KNOB only: pointer-to-value mapping (default 'rotate'). Throws on any other type. */
    knobMode?: 'rotate' | 'vertical';
    /** PROGRESS only: opt-in aria-live announcements at 10% steps. Throws on any other type. */
    announce?: boolean;
}

export interface UIFXInstance {
    el: HTMLElement;
    canvas: HTMLCanvasElement;
    wrapper: HTMLDivElement;
    state: UIFXState;

    /**
     * Set a valued control (SLIDER/KNOB/PROGRESS) to v in [0,1]: updates the
     * native element, state.val, any PROGRESS announcer, and fires onDrag once.
     * For a CHECKBOX, setValue(null) sets the indeterminate state. Throws on the
     * wrong element type or an out-of-range value.
     */
    setValue(v: number | null): void;

    /**
     * Set a TOGGLE/CHECKBOX checked state: updates the native element,
     * state.toggled, clears indeterminate, and fires onToggle exactly once.
     * Throws on any other element type.
     */
    setChecked(b: boolean): void;

    destroy(): void;
}

export declare function mountUIFX(
    container: HTMLElement,
    type: UITypeValue,
    recipeFactory: RecipeFactory,
    options?: MountOptions
): UIFXInstance;

export default mountUIFX;
