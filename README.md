# qrcode-generator
A simple QR code generator running locally, written purely in **TypeScript** and using **Svelte** as a web framework.

## Using it

You can either use the [GitHub Pages deployment](https://heedlesssoap325.github.io/qrcode-generator/) or run the app locally, as described in the [Quick Start section](#quick-start).

## Features

- **Most common codes**  
  	The generator supports the 3 most common modes that QR codes are used for. These are: numeric, alphanumeric, and byte encoding.

- **Section inspection**  
  	By enabling "Show QR sections", you can clearly see which parts your QR code is made of by visually separating different areas with differen colors.

- **Download**  
  	Each generated QR code can be downloaded in either the normal or the "part inspection" colors.

## Missing Features

- **Support for all modes**  
  	Currently, only the three basic modes are supported. More complex modes like Kanji mode or structured append are not (yet) supported.

- **Filling the QR code completely**  
  	With certain QR code sizes, the data may not exactly fill all available bits. In this situation, the ISO specifies what to do, but since this is not essential for the function of the QR code, it is ignored.

- **Evaluation of the mask pattern**  
  	There is an implementation for evaluating the best mask pattern; however, established QR code generators often choose different mask patterns than this algorithm. Since this does not break the QR code and is only meant to improve scannability by the reader, it's acceptable.

## Tech Stack

- **TypeScript**: for type-safe, scalable code
- **Svelte**: for a fast and easy way to write a simple yet robust frontend

## References

- The [official ISO 2004 specification](https://www.arscreatio.com/repositorio/images/n_23/SC031-N-1915-18004Text.pdf)
- An [interactive website](https://perthirtysix.com/how-the-heck-do-qr-codes-work) explaining the basics of QR codes, with many helpful examples
- [Thonky's QR Code Tutorial](https://www.thonky.com/qr-code-tutorial)
- The [Wikipedia page about BCH encoding](https://en.wikipedia.org/wiki/BCH_code#Systematic_encoding:_The_message_as_a_prefix)

# Quick Start

## Prerequisites

- **Svelte** (>= 5.51.0)
- **npm** or **yarn**

## Setup

```console
git clone https://github.com/HeedlessSoap325/qrcode-generator.git
cd qrcode-generator
npm install
```

## Run

```console
npm run dev -- --open
```

The system browser should automatically open the website once it has successfully launched.

## Build

```console
npm run build # Builds a static website in the build folder
```