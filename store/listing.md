# Chrome Web Store listing

Three fields, two places.

- **Name**, at most 75 characters. It lives in
  `extension/_locales/<locale>/messages.json` as `extName` and becomes
  `manifest.name`. Store search ranks mostly by the words in the name, so after
  the brand it carries the terms people search for. `npm run check:release`
  fails the build if it goes over or stops starting with "AccessCheck".
- **Summary**, at most 132 characters. It lives in
  `extension/_locales/<locale>/messages.json` as `extDescription`, ships inside
  the package and becomes `manifest.description`. `npm run check:release` fails
  the build if it goes over.
- **Detailed description**, typed into the Developer Dashboard once per
  language. It is not part of the package. Paste these files as they are:
  - English: [`listing-en.txt`](listing-en.txt)
  - Português (Brasil): [`listing-pt-BR.txt`](listing-pt-BR.txt)

The rest of what the dashboard asks for, from permission justifications to the
notes for the reviewer, is in
[`extension/STORE-LISTING.md`](../extension/STORE-LISTING.md).

## Name

- EN (52): AccessCheck: WCAG and Keyboard Accessibility Checker
- PT (60): AccessCheck: verificador de acessibilidade WCAG e de teclado

## Summary

- EN (122): Find WCAG problems on the page you're on, marked where they are. Follow the real tab order and copy tested contrast fixes.
- PT (130): Encontre problemas de WCAG na página, marcados onde estão. Siga a ordem real de tabulação e copie correções de contraste testadas.

Changing any of them means editing `extName` or `extDescription` in the matching
`messages.json`, then running `npm run build:extension`, `npm run pack` and
`npm run check:release`, and bumping the version, because the package itself
changes.
