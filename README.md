# OpenCOR

[OpenCOR](https://opencor.ws/) is a frontend to [libOpenCOR](https://opencor.ws/libopencor/), a library that can be used to organise, edit, simulate, and analyse [CellML](https://cellml.org/) files.

There are two versions of OpenCOR:

1. **OpenCOR:** a desktop application that can be run on [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows), [Linux](https://en.wikipedia.org/wiki/Linux), and [macOS](https://en.wikipedia.org/wiki/MacOS) on [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors) and [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family); and
2. **OpenCOR's Web app:** a [Web app](https://en.wikipedia.org/wiki/Web_application) that can be run using a Web browser.

The main difference between the two versions is that models in OpenCOR are, by default, compiled while they can only be interpreted in OpenCOR's Web app.

## Prerequisites

To build OpenCOR and OpenCOR's Web app, you need to install [node.js](https://nodejs.org/) and [npm](https://npmjs.com/), which you can do from [here](https://nodejs.org/en/download/package-manager). Then, you need to install [pnpm](https://pnpm.io/):

```bash
npm install -g pnpm
```

To build OpenCOR, you also need a C/C++ toolchain:

- **[Windows](https://en.wikipedia.org/wiki/Microsoft_Windows):**
  - **[Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors):**
    - [Visual Studio Community 2019](https://apps.microsoft.com/detail/xp8cdjnzkfm06w) (`Desktop development with C++` with `MSVC v142 - VS 2019 C++ x64/x86 build tools` and `Windows 10 SDK`); or
    - [Visual Studio Community 2022](https://apps.microsoft.com/detail/xpdcfjdklzjlp8) (`Desktop development with C++` with `MSVC v143 - VS 2022 C++ x64/x86 build tools` and `Windows 11 SDK`);
  - **[ARM](https://en.wikipedia.org/wiki/ARM_architecture_family):**
    - [Visual Studio Community 2019](https://apps.microsoft.com/detail/xp8cdjnzkfm06w) (`Desktop development with C++` with `MSVC v142 - VS 2019 C++ ARM64 build tools` and `Windows 10 SDK`);
- **[Linux](https://en.wikipedia.org/wiki/Linux):** G++ (`g++` package) on [Ubuntu 22.04 LTS](https://en.wikipedia.org/wiki/Ubuntu_version_history#2204); and
- **[macOS](https://en.wikipedia.org/wiki/MacOS):** [Xcode](https://developer.apple.com/xcode/) (including its [Command Line Tools](https://developer.apple.com/downloads/?q=Command%20Line%20Tools)).

**Note:** yes, OpenCOR for [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family) can only be built using [Visual Studio Community 2019](https://apps.microsoft.com/detail/xp8cdjnzkfm06w) (this is because we must use `MSVC v142`; see [here](https://www.electronjs.org/docs/latest/tutorial/windows-arm#native-modules) for more information).

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
- `build:arm`: build OpenCOR for [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family);
- `build:libopencor`: build OpenCOR's JavaScript interface to the C++ bindings of libOpenCOR;
- `build:libopencor:arm`: build OpenCOR's JavaScript interface to the C++ bindings of libOpenCOR for [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family);
- `build:web`: build OpenCOR's Web app;
- `clean`: clean OpenCOR's environment;
- `dev`: start OpenCOR and OpenCOR's Web app in development mode;
- `dev:arm`: start OpenCOR for [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family) and OpenCOR's Web app in development mode;
- `dev:web`: start OpenCOR's Web app in development mode;
- `format`: format OpenCOR's code and OpenCOR's Web app's code;
- `format:check`: check that OpenCOR's code and OpenCOR's Web app's code are properly formatted;
- `lint`: lint OpenCOR's code and OpenCOR's Web app's code;
- `package`: (build and) package OpenCOR for the current platform;
- `package:arm`: (build and) package OpenCOR for [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family) for the current platform;
- `publish:web`: publish OpenCOR's Web app on [npm](https://npmjs.com/);
- `start`: start OpenCOR in production mode; and
- `start:arm`: start OpenCOR for [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family) in production mode; and
- `start:web`: start OpenCOR's Web app in production mode.

**Note:** scripts that have an `:arm` suffix are only to be used when wanting to target [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family). The corresponding generic scripts only target [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) on [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors) (and [Linux](https://en.wikipedia.org/wiki/Linux)/[macOS](https://en.wikipedia.org/wiki/MacOS) on [Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors)/[ARM](https://en.wikipedia.org/wiki/ARM_architecture_family), depending on the operating system and on the C/C++ toolchain).
