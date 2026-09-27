# GF 0014-2009 Component Lookup

A static lookup app for GF 0014-2009 components and common-character decomposition.

Enter any character from the 3,500-character Level 1 common-use repertoire to see its GF0014 components, or search the 514-component catalog by ID, glyph, pinyin, meaning, source name, or component type.

The bundled decomposition map contains 3,323 complete GF0014 analyses. The remaining 177 characters show the GF0014 components that can be matched and clearly label unresolved visual fragments from the source repertoire.

## Run locally

No installation or build step is required.

### Open directly

Open `index.html` in a web browser.

### Use a local server

From the project directory, run:

```sh
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser. Press `Ctrl+C` in the terminal to stop the server.

Bundled sources:

- GF 0014-2009 PDF mirror from `zispace/hanzi-docs`
- GF0014 compatibility data and repertoire mappings from `hanzi-chai`
- Level 1 repertoire from the official 3,500-character section of the General Standard Chinese Character Table
- Unihan readings and definitions from Unicode
