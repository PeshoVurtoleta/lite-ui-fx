// UIFXHeadless.js -- the ./headless subpath (E1, decisions/0008).
//
// Curates the headless-skin surface: skinHeadless (the mount adapter, which lives
// with the other mounts in UIFXController.js) + the skin family and its sibling
// registry (in UIFXRecipes.js). Importing one skin tree-shakes the rest
// (sideEffects:false).
//
// @zakkster/lite-headless is a COMPOSE-TARGET, never a dependency: this module (and
// the whole package) imports it nowhere. skinHeadless couples to a primitive ONLY
// through the painted-attribute contract (its docs/CSS_CONTRACT.md) that the skin's
// `headless.read` parses -- so ./headless works against any lite-headless version
// honouring that contract.

export { skinHeadless } from './UIFXController.js';
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
} from './UIFXRecipes.js';
