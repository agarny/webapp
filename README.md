# OpenCOR

[OpenCOR](https://opencor.ws/) is a frontend to [libOpenCOR](https://opencor.ws/libopencor/), a C++ library that can be used to organise, edit, simulate, and analyse [CellML](https://cellml.org/) files.

There are two versions of OpenCOR:

1. **OpenCOR:** a desktop application that can be run on [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows), [Linux](https://en.wikipedia.org/wiki/Linux), and [macOS](https://en.wikipedia.org/wiki/MacOS); and
2. **OpenCOR's Web app:** a [Web app](https://en.wikipedia.org/wiki/Web_application) that can be run using a Web browser.

The main difference between the two versions is that models in OpenCOR are compiled by default while they can only be interpreted in OpenCOR's Web app.

## Prerequisites

To build OpenCOR, you need to install [node.js](https://nodejs.org/) and [npm](https://npmjs.com/), which you can do from [here](https://nodejs.org/en/download/package-manager). Then, you need to install [yarn](https://yarnpkg.com/):

```bash
npm install -g yarn
```

## Scripts

Before doing anything, you need to install all of OpenCOR's dependencies:

```bash
yarn
```

Then, you can run a given script:

```bash
yarn <script>
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
- `package:linux`: (build and) package OpenCOR for Linux;
- `package:mac`: (build and) package OpenCOR for macOS;
- `package:win`: (build and) package OpenCOR for Windows;
- `publish:web`: publish OpenCOR's Web app on [npm](https://npmjs.com/);
- `start`: start OpenCOR in production mode;
- `start:web`: start OpenCOR's Web app in production mode;
- `typecheck`: type check OpenCOR's code; and
- `typecheck:web`: type check OpenCOR's Web app's code.
