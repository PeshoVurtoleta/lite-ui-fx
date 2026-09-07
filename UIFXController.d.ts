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

export type GroupTypeValue = 'radio' | 'tabs' | 'stepper' | 'rating';

/**
 * Grouped-control types (U7, decisions/0007). Each mounts N native elements + one
 * canvas + one recipe via mountUIFXGroup (NOT a UIType -- routed separately).
 */
export declare const GroupType: Readonly<{
    /** fieldset + N <input type=radio>; native roving arrow-key selection. */
    RADIO: 'radio';
    /** role=tablist + N role=tab buttons; hand-written APG roving tabindex + arrows/Home/End. */
    TABS: 'tabs';
    /** one <input type=number> spinbutton; native Up/Down + typing. */
    STEPPER: 'stepper';
    /** radiogroup of N radios (rating semantics); native roving selection. */
    RATING: 'rating';
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
    /** U5: true when the user prefers reduced motion (matchMedia). Calm-path
     *  recipes render statically when set; recipes that ignore it animate. */
    reducedMotion: boolean;
    /** U5: frame budget in 0..1 -- 1 at ~60fps, lower as frames lengthen.
     *  Budget-aware recipes shed work (particles/glow) when it drops. */
    budget: number;
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

/**
 * A caller-supplied clock for the { ticker } host-clock mode (U5). Duck-typed to
 * @zakkster/lite-ticker: it must expose add(fn) returning a remove function. The
 * component registers its frame on it and, on destroy, removes that frame but
 * NEVER destroys the ticker -- ownership stays with the caller.
 */
export interface HostTicker {
    add(fn: (dtMs: number) => void): () => void;
}

/**
 * Host-clock options (U5, decisions/0005), shared by both mount modes. Three
 * mutually-exclusive modes: omit both for the shared ref-counted ticker (default);
 * `ticker` to ride a caller-supplied clock; `driven: true` for no clock at all
 * (the host calls instance.tick(dtMs)). Passing both throws.
 */
export interface HostClockOptions {
    /** Ride a caller-supplied ticker instead of the shared one. Mutually exclusive with `driven`. */
    ticker?: HostTicker;
    /** No ticker/RAF: the host drives frames via instance.tick(dtMs). Mutually exclusive with `ticker`. */
    driven?: boolean;
}

export interface MountOptions extends HostClockOptions {
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
export interface DecorateOptions extends HostClockOptions {
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
     * Drive one frame by hand (U5). Callable ONLY when mounted with { driven: true }
     * -- it is the internal frame body, so a driven host pays exactly the internal
     * per-frame cost. On a ticker-driven component it throws (that component owns
     * its own clock).
     */
    tick(dtMs: number): void;

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
    /** Drive one frame by hand (U5). Callable ONLY with { driven: true }; a
     *  ticker-driven decoration throws. */
    tick(dtMs: number): void;
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

// =========================================================
//  Grouped controls (U7, decisions/0007)
// =========================================================

/**
 * Per-frame state for a grouped control: the scalar UIFXState SUPERSET plus the
 * group fields. The single-value fields (val/toggled/indeterminate) are neutral
 * for a group -- a group uses `index`/`count`. Geometry lanes are Float32Arrays of
 * length `count` the recipe reads by index (zero per-frame allocation).
 */
export interface UIFXGroupState extends UIFXState {
    /** The selected item index, 0..count-1. */
    index: number;
    /** The number of items (multi-element groups) or steps (stepper). */
    count: number;
    /** The item currently under the pointer, or -1 when none. */
    hoverIndex: number;
    /** The item label strings (the mount's `items`); read by the recipe, never mutated. */
    labels: string[];
    /** Per-item x offset in strip coordinates (length count). */
    itemX: Float32Array;
    /** Per-item y offset (length count). */
    itemY: Float32Array;
    /** Per-item width (length count). */
    itemW: Float32Array;
    /** Per-item height (length count). */
    itemH: Float32Array;
}

/**
 * A group recipe: the eight standard hooks (with group state) PLUS onSelect, the
 * ninth, group-only hook. onSelect is rejected by mountUIFX/decorateUIFX (fail
 * closed), so a recipe carrying it mounts only as a group.
 */
export interface UIFXGroupRecipe {
    init?(ctx: CanvasRenderingContext2D, w: number, h: number, padding: number): void;
    tick(ctx: CanvasRenderingContext2D, dt: number, now: number, state: UIFXGroupState, pointer: UIFXPointer): void;
    onHover?(state: UIFXGroupState, pointer: UIFXPointer): void;
    onLeave?(state: UIFXGroupState, pointer: UIFXPointer): void;
    onClick?(x: number, y: number, state: UIFXGroupState): void;
    onToggle?(checked: boolean, state: UIFXGroupState): void;
    onDrag?(value: number, velocity: number, state: UIFXGroupState): void;
    /** U7: fired exactly once per selection change, with the new index. */
    onSelect?(index: number, state: UIFXGroupState): void;
    destroy?(): void;
}

export type GroupRecipeFactory = () => UIFXGroupRecipe;

/**
 * Options for mountUIFXGroup. `items` (the per-item labels) is REQUIRED, >=2
 * strings; its length is the item/step count. The initial selection is `index`
 * (an integer, distinct from the hijack float `value`). The hijack-only keys
 * (value/checked/knobMode/announce) are rejected -- passing one throws.
 */
export interface GroupOptions extends HostClockOptions {
    /** The per-item labels; >=2 strings. Length = item/step count. Required. */
    items: string[];
    /** Initial selected index, integer in [0, items.length-1] (default 0). */
    index?: number;
    /** Accessible group label (fieldset/tablist aria-label). */
    label?: string;
    /** Total strip width in px (default: per-type item width * count). */
    width?: number;
    /** Strip height in px (default per group type). */
    height?: number;
    /** Canvas overflow padding in px (default 40). */
    padding?: number;
    /** Disable every native element + set state.disabled. */
    disabled?: boolean;
    seed?: number;
    colors?: string[];
    theme?: { light: string; mid: string; dark: string };
    text?: string;
    font?: string;
}

export interface UIFXGroupInstance {
    /** The native interactive elements (radios / tabs, or the single spinbutton). */
    els: HTMLElement[];
    canvas: HTMLCanvasElement;
    wrapper: HTMLDivElement;
    state: UIFXGroupState;
    /** The selected index right now (convenience over state.index). */
    readonly index: number;
    /** Drive one frame by hand (U5). Callable ONLY with { driven: true }. */
    tick(dtMs: number): void;
    /**
     * Programmatically select item i in [0, count-1]: updates the native
     * element(s), state.index, and fires onSelect exactly once (no native event,
     * so no double fire). Does NOT steal focus. Throws on a bad index.
     */
    setIndex(i: number): void;
    destroy(): void;
}

/**
 * Mount a grouped control: N native elements (radios in a fieldset, tabs in a
 * tablist, a spinbutton, a rating radiogroup) sharing ONE canvas and one recipe
 * (decisions/0007). The native elements own selection + keyboard + a11y; the
 * canvas paints the group by reading state.index/state.count and the per-item
 * geometry lanes. Additive to mountUIFX/decorateUIFX -- neither is touched.
 */
export declare function mountUIFXGroup(
    container: HTMLElement,
    groupType: GroupTypeValue,
    recipeFactory: GroupRecipeFactory,
    options: GroupOptions
): UIFXGroupInstance;

export default mountUIFX;
