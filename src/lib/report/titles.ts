import type { MessageKey, Translate } from "../i18n/t";
import type { ScanResult } from "../scan/types";

const RULE: Record<string, readonly [title: MessageKey, check: MessageKey]> = {
  accesskeys: ["rule.accesskeys", "rule.accesskeys.check"],
  "area-alt": ["rule.areaAlt", "rule.areaAlt.check"],
  "aria-allowed-attr": ["rule.ariaAllowedAttr", "rule.ariaAllowedAttr.check"],
  "aria-allowed-role": ["rule.ariaAllowedRole", "rule.ariaAllowedRole.check"],
  "aria-braille-equivalent": ["rule.ariaBrailleEquivalent", "rule.ariaBrailleEquivalent.check"],
  "aria-command-name": ["rule.ariaCommandName", "rule.ariaCommandName.check"],
  "aria-conditional-attr": ["rule.ariaConditionalAttr", "rule.ariaConditionalAttr.check"],
  "aria-deprecated-role": ["rule.ariaDeprecatedRole", "rule.ariaDeprecatedRole.check"],
  "aria-dialog-name": ["rule.ariaDialogName", "rule.ariaDialogName.check"],
  "aria-hidden-body": ["rule.ariaHiddenBody", "rule.ariaHiddenBody.check"],
  "aria-hidden-focus": ["rule.ariaHiddenFocus", "rule.ariaHiddenFocus.check"],
  "aria-input-field-name": ["rule.ariaInputFieldName", "rule.ariaInputFieldName.check"],
  "aria-meter-name": ["rule.ariaMeterName", "rule.ariaMeterName.check"],
  "aria-progressbar-name": ["rule.ariaProgressbarName", "rule.ariaProgressbarName.check"],
  "aria-prohibited-attr": ["rule.ariaProhibitedAttr", "rule.ariaProhibitedAttr.check"],
  "aria-required-attr": ["rule.ariaRequiredAttr", "rule.ariaRequiredAttr.check"],
  "aria-required-children": ["rule.ariaRequiredChildren", "rule.ariaRequiredChildren.check"],
  "aria-required-parent": ["rule.ariaRequiredParent", "rule.ariaRequiredParent.check"],
  "aria-roledescription": ["rule.ariaRoledescription", "rule.ariaRoledescription.check"],
  "aria-roles": ["rule.ariaRoles", "rule.ariaRoles.check"],
  "aria-tab-name": ["rule.ariaTabName", "rule.ariaTabName.check"],
  "aria-text": ["rule.ariaText", "rule.ariaText.check"],
  "aria-toggle-field-name": ["rule.ariaToggleFieldName", "rule.ariaToggleFieldName.check"],
  "aria-tooltip-name": ["rule.ariaTooltipName", "rule.ariaTooltipName.check"],
  "aria-treeitem-name": ["rule.ariaTreeitemName", "rule.ariaTreeitemName.check"],
  "aria-valid-attr-value": ["rule.ariaValidAttrValue", "rule.ariaValidAttrValue.check"],
  "aria-valid-attr": ["rule.ariaValidAttr", "rule.ariaValidAttr.check"],
  "audio-caption": ["rule.audioCaption", "rule.audioCaption.check"],
  "autocomplete-valid": ["rule.autocompleteValid", "rule.autocompleteValid.check"],
  "avoid-inline-spacing": ["rule.avoidInlineSpacing", "rule.avoidInlineSpacing.check"],
  blink: ["rule.blink", "rule.blink.check"],
  "button-name": ["rule.buttonName", "rule.buttonName.check"],
  bypass: ["rule.bypass", "rule.bypass.check"],
  "color-contrast": ["rule.colorContrast", "rule.colorContrast.check"],
  "css-orientation-lock": ["rule.cssOrientationLock", "rule.cssOrientationLock.check"],
  "definition-list": ["rule.definitionList", "rule.definitionList.check"],
  dlitem: ["rule.dlitem", "rule.dlitem.check"],
  "document-title": ["rule.documentTitle", "rule.documentTitle.check"],
  "duplicate-id-aria": ["rule.duplicateIdAria", "rule.duplicateIdAria.check"],
  "empty-heading": ["rule.emptyHeading", "rule.emptyHeading.check"],
  "empty-table-header": ["rule.emptyTableHeader", "rule.emptyTableHeader.check"],
  "focus-order-semantics": ["rule.focusOrderSemantics", "rule.focusOrderSemantics.check"],
  "form-field-multiple-labels": [
    "rule.formFieldMultipleLabels",
    "rule.formFieldMultipleLabels.check",
  ],
  "frame-focusable-content": ["rule.frameFocusableContent", "rule.frameFocusableContent.check"],
  "frame-tested": ["rule.frameTested", "rule.frameTested.check"],
  "frame-title-unique": ["rule.frameTitleUnique", "rule.frameTitleUnique.check"],
  "frame-title": ["rule.frameTitle", "rule.frameTitle.check"],
  "heading-order": ["rule.headingOrder", "rule.headingOrder.check"],
  "hidden-content": ["rule.hiddenContent", "rule.hiddenContent.check"],
  "html-has-lang": ["rule.htmlHasLang", "rule.htmlHasLang.check"],
  "html-lang-valid": ["rule.htmlLangValid", "rule.htmlLangValid.check"],
  "html-xml-lang-mismatch": ["rule.htmlXmlLangMismatch", "rule.htmlXmlLangMismatch.check"],
  "image-alt": ["rule.imageAlt", "rule.imageAlt.check"],
  "image-redundant-alt": ["rule.imageRedundantAlt", "rule.imageRedundantAlt.check"],
  "input-button-name": ["rule.inputButtonName", "rule.inputButtonName.check"],
  "input-image-alt": ["rule.inputImageAlt", "rule.inputImageAlt.check"],
  "label-content-name-mismatch": [
    "rule.labelContentNameMismatch",
    "rule.labelContentNameMismatch.check",
  ],
  "label-title-only": ["rule.labelTitleOnly", "rule.labelTitleOnly.check"],
  label: ["rule.label", "rule.label.check"],
  "landmark-banner-is-top-level": [
    "rule.landmarkBannerIsTopLevel",
    "rule.landmarkBannerIsTopLevel.check",
  ],
  "landmark-complementary-is-top-level": [
    "rule.landmarkComplementaryIsTopLevel",
    "rule.landmarkComplementaryIsTopLevel.check",
  ],
  "landmark-contentinfo-is-top-level": [
    "rule.landmarkContentinfoIsTopLevel",
    "rule.landmarkContentinfoIsTopLevel.check",
  ],
  "landmark-main-is-top-level": [
    "rule.landmarkMainIsTopLevel",
    "rule.landmarkMainIsTopLevel.check",
  ],
  "landmark-no-duplicate-banner": [
    "rule.landmarkNoDuplicateBanner",
    "rule.landmarkNoDuplicateBanner.check",
  ],
  "landmark-no-duplicate-contentinfo": [
    "rule.landmarkNoDuplicateContentinfo",
    "rule.landmarkNoDuplicateContentinfo.check",
  ],
  "landmark-no-duplicate-main": [
    "rule.landmarkNoDuplicateMain",
    "rule.landmarkNoDuplicateMain.check",
  ],
  "landmark-one-main": ["rule.landmarkOneMain", "rule.landmarkOneMain.check"],
  "landmark-unique": ["rule.landmarkUnique", "rule.landmarkUnique.check"],
  "link-in-text-block": ["rule.linkInTextBlock", "rule.linkInTextBlock.check"],
  "link-name": ["rule.linkName", "rule.linkName.check"],
  list: ["rule.list", "rule.list.check"],
  listitem: ["rule.listitem", "rule.listitem.check"],
  marquee: ["rule.marquee", "rule.marquee.check"],
  "meta-refresh": ["rule.metaRefresh", "rule.metaRefresh.check"],
  "meta-viewport-large": ["rule.metaViewportLarge", "rule.metaViewportLarge.check"],
  "meta-viewport": ["rule.metaViewport", "rule.metaViewport.check"],
  "nested-interactive": ["rule.nestedInteractive", "rule.nestedInteractive.check"],
  "no-autoplay-audio": ["rule.noAutoplayAudio", "rule.noAutoplayAudio.check"],
  "object-alt": ["rule.objectAlt", "rule.objectAlt.check"],
  "p-as-heading": ["rule.pAsHeading", "rule.pAsHeading.check"],
  "page-has-heading-one": ["rule.pageHasHeadingOne", "rule.pageHasHeadingOne.check"],
  "presentation-role-conflict": [
    "rule.presentationRoleConflict",
    "rule.presentationRoleConflict.check",
  ],
  region: ["rule.region", "rule.region.check"],
  "role-img-alt": ["rule.roleImgAlt", "rule.roleImgAlt.check"],
  "scope-attr-valid": ["rule.scopeAttrValid", "rule.scopeAttrValid.check"],
  "scrollable-region-focusable": [
    "rule.scrollableRegionFocusable",
    "rule.scrollableRegionFocusable.check",
  ],
  "select-name": ["rule.selectName", "rule.selectName.check"],
  "server-side-image-map": ["rule.serverSideImageMap", "rule.serverSideImageMap.check"],
  "skip-link": ["rule.skipLink", "rule.skipLink.check"],
  "summary-name": ["rule.summaryName", "rule.summaryName.check"],
  "svg-img-alt": ["rule.svgImgAlt", "rule.svgImgAlt.check"],
  tabindex: ["rule.tabindex", "rule.tabindex.check"],
  "table-duplicate-name": ["rule.tableDuplicateName", "rule.tableDuplicateName.check"],
  "table-fake-caption": ["rule.tableFakeCaption", "rule.tableFakeCaption.check"],
  "target-size": ["rule.targetSize", "rule.targetSize.check"],
  "td-has-header": ["rule.tdHasHeader", "rule.tdHasHeader.check"],
  "td-headers-attr": ["rule.tdHeadersAttr", "rule.tdHeadersAttr.check"],
  "th-has-data-cells": ["rule.thHasDataCells", "rule.thHasDataCells.check"],
  "valid-lang": ["rule.validLang", "rule.validLang.check"],
  "video-caption": ["rule.videoCaption", "rule.videoCaption.check"],
};

export function ruleTitle(ruleId: string, t: Translate): string | null {
  const keys = RULE[ruleId];
  return keys ? t(keys[0]) : null;
}

export function ruleCheck(ruleId: string, t: Translate): string | null {
  const keys = RULE[ruleId];
  return keys ? t(keys[1]) : null;
}

export function passedChecks(
  result: Pick<ScanResult, "passed" | "passedRules">,
  t: Translate,
): string[] {
  if (!result.passedRules) return result.passed;
  return result.passedRules.map((id, i) => ruleCheck(id, t) ?? result.passed[i] ?? id);
}
