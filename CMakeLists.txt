cmake_minimum_required(VERSION 3.15)

project(libOpenCOR VERSION 0.0.0)

# Enable C++20.

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Get access to cmake-js.

include_directories(${CMAKE_JS_INC})

# Get access to libOpenCOR.

if(WIN32)
    set(PLATFORM Windows)
    set(EXTENSION .zip)
elseif(APPLE)
    set(PLATFORM macOS)
    set(EXTENSION .zip)
else()
    set(PLATFORM Linux)
    set(EXTENSION .tar.gz)
endif()

if(   "${CMAKE_HOST_SYSTEM_PROCESSOR}" STREQUAL "AMD64"
   OR "${CMAKE_HOST_SYSTEM_PROCESSOR}" STREQUAL "x86_64")
    set(ARCHITECTURE Intel)
else()
    set(ARCHITECTURE ARM)
endif()

set(LIBOPENCOR_FILE_NAME_WE libOpenCOR-${PROJECT_VERSION_MAJOR}.${PROJECT_VERSION_MINOR}.${PROJECT_VERSION_PATCH}-${PLATFORM}-${ARCHITECTURE}-Shared)
set(LIBOPENCOR_FILE_NAME ${LIBOPENCOR_FILE_NAME_WE}${EXTENSION})

file(DOWNLOAD https://opencor.ws/libopencor/downloads/${LIBOPENCOR_FILE_NAME}
              ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME})

execute_process(COMMAND ${CMAKE_COMMAND} -E tar xvf ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME}
                WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
                OUTPUT_QUIET)

file(REMOVE ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME})

include_directories(${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME_WE}/include
                    ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME_WE}/include/libopencor/module)

# Use the appropriate C runtime library.

if(MSVC)
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>DLL")
endif()

# Don't allow unresolved symbols.
# Note: MSVC doesn't allow unresolved symbols, so we only need to look for them if we are building using GNU or Clang.

if(BUILDING_USING_GNU)
    SET(CMAKE_SHARED_LINKER_FLAGS -Wl,--no-undefined)
elseif(BUILDING_USING_CLANG)
    # On macOS, only use the -Wl,--no-undefined option if we are not using Xcode 15.0 or later since otherwise the
    # linker is going to generate some warnings about -undefined error being deprecated.

    if(APPLE)
        # Get the Xcode version.
        # Note: CMake has XCODE_VERSION, but it's only available when using the Xcode generator. So, we need to get the
        #       Xcode version ourselves. And, depending on how Xcode was installed, we may need to get the Xcode version
        #       using softwareupdate.

        execute_process(COMMAND xcodebuild -version
                        OUTPUT_VARIABLE XCODE_VERSION
                        OUTPUT_STRIP_TRAILING_WHITESPACE
                        RESULT_VARIABLE RESULT
                        ERROR_QUIET)

        if(NOT RESULT EQUAL 0)
            execute_process(COMMAND softwareupdate --history
                            COMMAND awk "/Command Line Tools for Xcode/ {print \$6}"
                            COMMAND tail -1
                            OUTPUT_VARIABLE XCODE_VERSION
                            OUTPUT_STRIP_TRAILING_WHITESPACE
                            ERROR_QUIET)
        endif()
    else()
        set(XCODE_VERSION 0)
    endif()

    if(XCODE_VERSION VERSION_LESS 15.0)
        SET(CMAKE_SHARED_LINKER_FLAGS -Wl,-undefined,error)
    endif()
endif()

# Create our Node.js add-on as a shared library.

add_library(${CMAKE_PROJECT_NAME} SHARED
            ${CMAKE_JS_SRC}
            src/libopencor/src/main.cpp
            src/libopencor/src/version.cpp)

# Don't have a "lib" prefix and use a ".node" suffix.

set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
                      PREFIX ""
                      SUFFIX ".node")

# Link cmake-js and libOpenCOR to our Node.js add-on.

if(WIN32)
    set(LIBOPENCOR_FILENAME libOpenCOR${CMAKE_IMPORT_LIBRARY_SUFFIX})
else()
    set(LIBOPENCOR_FILENAME libOpenCOR${CMAKE_SHARED_LIBRARY_SUFFIX})
endif()

target_link_libraries(${CMAKE_PROJECT_NAME} PRIVATE
                      ${CMAKE_JS_LIB}
                      ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME_WE}/lib/${LIBOPENCOR_FILENAME})

# Include the Node-API wrappers.

execute_process(COMMAND node -p "require('node-addon-api').include"
                WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
                OUTPUT_VARIABLE NODE_ADDON_API_DIR)

string(REGEX REPLACE "[\r\n\"]" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

target_include_directories(${CMAKE_PROJECT_NAME} PRIVATE
                           ${NODE_ADDON_API_DIR})

add_definitions(-DNAPI_VERSION=3)

# Configure our splash screen.

string(TIMESTAMP CURRENT_YEAR "%Y")

if(CURRENT_YEAR EQUAL 2024)
    set(COPYRIGHT "2024")
else()
    set(COPYRIGHT "2024-${CURRENT_YEAR}")
endif()

set(VERSION ${PROJECT_VERSION})

configure_file(src/main/assets/splashscreen.html.in
               ${CMAKE_BINARY_DIR}/splashscreen.html)
