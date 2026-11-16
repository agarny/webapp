# Prerequisites

- [Bun](https://bun.com/) (version 1.2+); and
- [C](<https://en.wikipedia.org/wiki/C_(programming_language)>)/[C++](https://en.wikipedia.org/wiki/C%2B%2B) toolchain.

## Installation

1. **Install Bun from [here](https://bun.com/docs/installation).**

2. **Install a C/C++ toolchain:**
   - **[Windows](https://en.wikipedia.org/wiki/Microsoft_Windows):**
     - **[Intel](https://en.wikipedia.org/wiki/List_of_Intel_processors):**
       - [Visual Studio Community 2019](https://apps.microsoft.com/detail/xp8cdjnzkfm06w) (`Desktop development with C++` with `MSVC v142 - VS 2019 C++ x64/x86 build tools` and `Windows 10 SDK`); or
       - [Visual Studio Community 2022](https://apps.microsoft.com/detail/xpdcfjdklzjlp8) (`Desktop development with C++` with `MSVC v143 - VS 2022 C++ x64/x86 build tools` and `Windows 11 SDK`);
     - **[ARM](https://en.wikipedia.org/wiki/ARM_architecture_family):**
       - [Visual Studio Community 2019](https://apps.microsoft.com/detail/xp8cdjnzkfm06w) (`Desktop development with C++` with `MSVC v142 - VS 2019 C++ ARM64 build tools` and `Windows 10 SDK`);
         **Note:** yes, only [Visual Studio Community 2019](https://apps.microsoft.com/detail/xp8cdjnzkfm06w) can be used. This is because we must use `MSVC v142` (see [here](https://electronjs.org/docs/latest/tutorial/windows-arm#native-modules) for more information).
   - **[Linux](https://en.wikipedia.org/wiki/Linux):** G++ (`g++` package) on [Ubuntu 22.04 LTS](https://en.wikipedia.org/wiki/Ubuntu_version_history#2204)/[Ubuntu 24.04 LTS](https://en.wikipedia.org/wiki/Ubuntu_version_history#2404); and
   - **[macOS](https://en.wikipedia.org/wiki/MacOS):** [Xcode](https://developer.apple.com/xcode/) (including its [Command Line Tools](https://developer.apple.com/downloads/?q=Command%20Line%20Tools)).

3. **Install additional dependencies:**
   - On [Ubuntu](https://en.wikipedia.org/wiki/Ubuntu) on [ARM](https://en.wikipedia.org/wiki/ARM_architecture_family), you need to install the `libopenjp2-tools` package so that [`electron-builder`](https://electron.build/) can get access to [`opj_decompress`](https://manpages.ubuntu.com/manpages/man1/opj_decompress.1.html).

# Getting Started

1. **Install OpenCOR's dependencies:**

   ```bash
   bun install
   ```

2. **Start the development version of OpenCOR:**
   - **Desktop version:**

     ```bash
     bun dev
     ```

   - **Web app version:**

     ```bash
     bun dev:web
     ```

3. **Test OpenCOR:**
   - **Desktop version:** the application will open automatically; and
   - **Web app version:** open your browser and navigate to the local development URL (typically http://localhost:5173).

# Available Scripts

| Script                | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| `archive:web`         | Archive OpenCOR's Web app                                                  |
| `build`               | Build OpenCOR                                                              |
| `build:web`           | Build OpenCOR's Web app                                                    |
| `clean`               | Clean OpenCOR's environment                                                |
| `dependencies:update` | Update all dependencies                                                    |
| `dev`                 | (Build and) start the development version of OpenCOR and OpenCOR's Web app |
| `dev:web`             | (Build and) start the development version of OpenCOR's Web app             |
| `format`              | Format the code                                                            |
| `format:check`        | Check code's formatting                                                    |
| `lint`                | Lint and automatically fix issues                                          |
| `lint:check`          | Check the code for linting issues                                          |
| `release`             | Release OpenCOR for the current platform                                   |
| `release:local`       | Release OpenCOR for the current platform without code signing              |
| `start`               | (Build and) start the production version of OpenCOR                        |
| `start:web`           | (Build and) start the production version of OpenCOR's Web app              |
| `typecheck`           | Check the code for type errors                                             |
| `version:new`         | Update the version of OpenCOR                                              |

# Notes

- OpenCOR does not, by default, work on [Ubuntu 24.04 LTS](https://en.wikipedia.org/wiki/Ubuntu_version_history#2404) and later (see [here](https://github.com/opencor/webapp/issues/68) for more information), although it can be made to work by running the following command:
  ```bash
  sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0
  ```
- The [URI scheme](https://en.wikipedia.org/wiki/Uniform_Resource_Identifier#Syntax) works fine when using the `release`-based version of OpenCOR. When it comes to the `start`-based and `dev`-based versions, the URI scheme "works" as follows:
  - On [Windows](https://en.wikipedia.org/wiki/Microsoft_Windows) and [Linux](https://en.wikipedia.org/wiki/Linux), it just does not work; and
  - On [macOS](https://en.wikipedia.org/wiki/MacOS), it only works when OpenCOR is already running.
