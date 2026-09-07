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
    /** Decorate mode only (decorateUIFX): the host form-control's current value.
     *  Absent for hijack mounts and for a non-form host (then ''). */
    text?: string;
    /** Decorate mode only: the host's validity (el.validity.valid, else true). */
    valid?: boolean;
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

/**
 * Options accepted by decorateUIFX. A subset of MountOptions: a decoration
 * inherits the host's geometry (offset box) and value (read from the host), so
 * the hijack-only options (width/height/value/checked/disabled/knobMode/announce/
 * label) are rejected -- passing one throws (fail closed).
 */
export interface DecorateOptions {
    /** Overlay padding around the host, in px (default 40). */
    padding?: number;
    seed?: number;
    colors?: string[];
    theme?: { light: string; mid: string; dark: string };
    text?: string;
    font?: string;
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

/**
 * The instance returned by decorateUIFX. Like UIFXInstance but WITHOUT `wrapper`
 * (there is none -- the overlay is a sibling of the host, not a wrapper around
 * it), and setValue/setChecked are hijack-only: a decoration reflects the host,
 * it does not drive it, so both throw.
 */
export interface DecorateInstance {
    /** The decorated host element (unchanged -- decorate never mutates it). */
    el: HTMLElement;
    /** The overlay canvas (the only DOM node decorate adds). */
    canvas: HTMLCanvasElement;
    state: UIFXState;
    /** Hijack-only. Throws in decorate mode. */
    setValue(v?: number | null): void;
    /** Hijack-only. Throws in decorate mode. */
    setChecked(b?: boolean): void;
    /** Remove the overlay + every listener decorate added; the host is left
     *  byte-identical to before decorate. Idempotent. */
    destroy(): void;
}

/**
 * Decorate an EXISTING visible element with a canvas recipe WITHOUT hijacking it:
 * no native element is created, opacity is never set, and the host is never
 * reparented. An overlay canvas is added as a sibling and removed on destroy, so
 * the host is byte-identical before and after. Recipe state is wired from the
 * host's own events; for a form-control host, state.text/state.valid mirror
 * el.value/el.validity (read at event time, never per frame). This is the honest
 * home for a decoration over a real input (PasswordStrength, TypewriterField) and
 * for generic form feedback (FocusHalo, ErrorShake, SuccessBloom). See 0004.
 */
export declare function decorateUIFX(
    el: HTMLElement,
    recipeFactory: RecipeFactory,
    options?: DecorateOptions
): DecorateInstance;

export default mountUIFX;
