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
