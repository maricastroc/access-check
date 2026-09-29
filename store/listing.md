# Chrome Web Store listing

Two fields, two places.

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

## Summary

- EN (110): Inspect accessibility problems in the current tab: what failed, where it is, and the real keyboard focus path.
- PT (110): Veja os problemas de acessibilidade da aba atual: o que falhou, onde está e o caminho real do foco do teclado.

Changing either one means editing `extDescription` in the matching
`messages.json`, then running `npm run build:extension`, `npm run pack` and
`npm run check:release`, and bumping the version, because the package itself
changes.
