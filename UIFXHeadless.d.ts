// UIFXHeadless.d.ts -- types for the ./headless subpath (E1, decisions/0008).
// Curates the headless-skin surface: skinHeadless (the mount adapter, in the
// controller) + the skin family and its sibling registry (in the recipes module).

export { skinHeadless } from './UIFXController';
export type {
    SkinOptions,
    SkinInstance,
    HeadlessSkinRecipe,
    HeadlessSkinRecipeFactory,
    HeadlessSkinDescriptor,
} from './UIFXController';

export {
    SwitchSkin,
    SliderSkin,
    ProgressSkin,
    RatingSkin,
    CheckboxSkin,
    CheckboxGroupSkin,
    SelectSkin,
    MeterSkin,
    StepsSkin,
    AccordionSkin,
    SkeletonSkin,
    HEADLESS_SKINS,
    SKIN_META,
    SKIN_NAMES,
} from './UIFXRecipes';
export type { SkinMeta } from './UIFXRecipes';
