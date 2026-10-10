# Security Policy

## Privacy model

Rusticker is built so that your images stay on your device.

- **All image processing happens in your browser.** Sticker detection and
  background removal run in Rust compiled to WebAssembly, inside a Web Worker
  on your own machine. Encoding the exported stickers (WEBP/PNG) and building
  the `.zip` pack also happen locally.
- **Images are never uploaded.** No image, pixel data, or derived result is
  sent to any server.
- **There is no backend.** Rusticker is a static site: the server only
  delivers the app's files (HTML, JavaScript, CSS, WebAssembly). It has no
  API, database, or user accounts.
- **No analytics or third-party data collection.** None is planned. The app
  sets no tracking cookies, loads no third-party trackers, and has no
  telemetry.

These are **commitments, not just the current state**. Any future change must
preserve them. A change that would send user data over the network, add
analytics, or introduce a processing backend is out of scope for this project
and will not be accepted.

## Threat model notes

Some areas we pay particular attention to:

- **Malicious or oversized images.** Users load arbitrary files, which may be
  crafted to exploit decoders or exhaust memory ("decompression bombs"). The
  Rust core is designed to enforce limits on image dimensions and memory use
  when decoding (planned for `core-detection`), and to reject inputs that
  exceed them with the `ImageTooLarge` error code
  instead of crashing. Processing runs in a Web Worker, so a heavy input does
  not freeze the page. Because everything runs in the browser sandbox, the
  impact of a bad input is limited to the user's own tab.
- **Supply chain.** The Rust toolchain is pinned in `rust-toolchain.toml`, the
  JavaScript lockfile (`bun.lock`) is committed, and dependencies are added
  deliberately and kept to a minimum. Changes to dependencies are reviewed like
  any other code.
- **Privacy regressions.** Any code that makes network requests is treated as
  security-sensitive. Reports of user data leaving the browser are treated as
  vulnerabilities.

## Supported versions

Rusticker is **pre-1.0**. Only the latest version on the `main` branch (and the
site deployed from it) receives security fixes. There are no maintained
release branches.

| Version | Supported |
|---------|-----------|
| latest `main` | Yes |
| anything older | No |

## Reporting a vulnerability

**Please do not open a public issue, discussion, or pull request for security
problems.**

Report vulnerabilities privately through **GitHub private vulnerability
reporting**:

1. Go to the Rusticker repository on GitHub.
2. Open the **Security** tab.
3. Click **Report a vulnerability** and fill in the form.

<!-- TODO: add the direct link (https://github.com/<owner>/<repo>/security/advisories/new) once the repository is published. -->

Please include, where possible:

- a description of the issue and its impact;
- steps to reproduce, or a proof of concept (for example, a sample image that
  triggers the problem);
- the browser and operating system you used;
- the commit or deployed version you tested.

### What to expect

- **Acknowledgement within 7 days** of your report.
- An initial assessment, and a plan or timeline for a fix, as soon as we have
  confirmed the issue.
- Updates as the fix progresses.

### Coordinated disclosure

We follow coordinated disclosure. Please give us a reasonable amount of time to
release a fix before you disclose the issue publicly. Once a fix is available,
we will publish a security advisory and, if you wish, credit you for the
report.

Thank you for helping keep Rusticker and its users safe.
