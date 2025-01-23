# OpenCOR

[OpenCOR](https://opencor.ws/) is a frontend to [libOpenCOR](https://opencor.ws/libopencor/), a library that can be used to organise, edit, simulate, and analyse [CellML](https://cellml.org/) files.

There are two versions of OpenCOR:

1. **OpenCOR:** a desktop application that can be run on [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows), [Linux](https://en.wikipedia.org/wiki/Linux), and [macOS](https://en.wikipedia.org/wiki/MacOS); and
2. **OpenCOR's Web app:** a [Web app](https://en.wikipedia.org/wiki/Web_application) that can be run using a Web browser.

The main difference between the two versions is that models in OpenCOR are, by default, compiled while they can only be interpreted in OpenCOR's Web app.

## Prerequisites

To build OpenCOR, you need to install [node.js](https://nodejs.org/) and [npm](https://npmjs.com/), which you can do from [here](https://nodejs.org/en/download/package-manager). Then, you need to install [pnpm](https://pnpm.io/):

```bash
npm install -g pnpm
```

## Scripts

Before doing anything, you need to install all of OpenCOR's dependencies:

```bash
pnpm install
```

Then, you can run a given script:

```bash
pnpm <script>
```

where `<script>` is one of the following:

- `build`: build OpenCOR;
- `build:libopencor`: build OpenCOR's JavaScript interface to the C++ bindings of libOpenCOR;
- `build:web`: build OpenCOR's Web app;
- `clean`: clean OpenCOR's environment;
- `dev`: start OpenCOR and OpenCOR's Web app in development mode;
- `dev:web`: start OpenCOR's Web app in development mode;
- `format`: format OpenCOR's code and OpenCOR's Web app's code;
- `format:check`: check that OpenCOR's code and OpenCOR's Web app's code are properly formatted;
- `lint`: lint OpenCOR's code and OpenCOR's Web app's code;
- `package`: (build and) package OpenCOR for the current platform;
- `publish:web`: publish OpenCOR's Web app on [npm](https://npmjs.com/);
- `start`: start OpenCOR in production mode; and
- `start:web`: start OpenCOR's Web app in production mode.
