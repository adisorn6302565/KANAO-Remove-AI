# License overrides

These files stand in for license files that some crates do not ship in their package.
`scripts/generate-third-party-licenses.mjs` reads them only when the crate itself has no license file.

| Package | File | Source |
| --- | --- | --- |
| webview2-com 0.39.1 | `LICENSE` | `wravery/webview2-rs` at `edc2caf886175ccaebe86078c9cfe1ae2a187328` |
| webview2-com-sys 0.39.1 | `LICENSE` | `wravery/webview2-rs` at `edc2caf886175ccaebe86078c9cfe1ae2a187328` |
| webview2-com-macros 0.8.1 | `LICENSE` | `wravery/webview2-rs` at `dffa41a8a46d3f5565eefbff2de57d38d399f158` |
| alloc-stdlib 0.3.0 | `LICENSE` | `dropbox/rust-alloc-no-stdlib` at `0a81fd6928ea3b33c8cd484aa4575d50ffb98012` |
| defmt-parser 1.0.0 | `LICENSE-MIT`, `LICENSE-APACHE` | `knurling-rs/defmt` at `4a8cdb44891ed57b8ff5a023b6bec7137c48708f` |
| selectors 0.38.0 | `LICENSE` | Standard MPL-2.0 text, copied from the `cssparser` 0.37.0 crate. The upstream `servo/stylo` repository has no `LICENSE` at `572ecba2d1600e7c3d490586692a209faf703baa`. |

The first five files were fetched verbatim with `curl` from `raw.githubusercontent.com` at the commit listed.
The commit is the `sha1` in each crate's `.cargo_vcs_info.json`.
