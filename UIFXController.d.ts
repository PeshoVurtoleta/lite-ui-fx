export declare const VERSION: string;

export type UITypeValue = 'button' | 'toggle' | 'slider';

export declare const UIType: Readonly<{
    BUTTON: 'button';
    TOGGLE: 'toggle';
    SLIDER: 'slider';
}>;

export interface UIFXState {
    hover: boolean;
    active: boolean;
    focused: boolean;
    toggled: boolean;
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
}

export interface UIFXInstance {
    el: HTMLElement;
    canvas: HTMLCanvasElement;
    wrapper: HTMLDivElement;
    state: UIFXState;

    destroy(): void;
}

export declare function mountUIFX(
    container: HTMLElement,
    type: UITypeValue,
    recipeFactory: RecipeFactory,
    options?: MountOptions
): UIFXInstance;

export default mountUIFX;
