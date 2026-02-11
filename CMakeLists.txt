cmake_minimum_required(VERSION 3.15)

# Some CMake policies.

foreach(POLICY CMP0096)
    if(POLICY ${POLICY})
        cmake_policy(SET ${POLICY} NEW)
    endif()
endforeach()

# Project details.

project(libOpenCOR VERSION 0.20260211.0)

# Enable C++20.

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Some common CMake policies.

foreach(POLICY CMP0042 CMP0091)
    cmake_policy(SET ${POLICY} NEW)
endforeach()

# Get access to cmake-js.

include_directories(${CMAKE_JS_INC})

# Get access to libOpenCOR.

if(WIN32)
    set(PLATFORM "-Windows")
    set(EXTENSION ".zip")

    if("${CMAKE_CXX_COMPILER_ARCHITECTURE_ID}" STREQUAL "x64")
        set(ARCHITECTURE "-Intel")
    else()
        set(ARCHITECTURE "-ARM")
    endif()

    set(MODE "-Release")
else()
    if(APPLE)
        set(PLATFORM "-macOS")
        set(EXTENSION ".zip")
    else()
        set(PLATFORM "-Linux")
        set(EXTENSION ".tar.gz")
    endif()

    if("${CMAKE_HOST_SYSTEM_PROCESSOR}" STREQUAL "x86_64")
        set(ARCHITECTURE "-Intel")
    else()
        set(ARCHITECTURE "-ARM")
    endif()
endif()

set(LIBOPENCOR_FILE_NAME_WE ${CMAKE_PROJECT_NAME}-${PROJECT_VERSION}${PLATFORM}${ARCHITECTURE}-Static${MODE})
set(LIBOPENCOR_FILE_NAME ${LIBOPENCOR_FILE_NAME_WE}${EXTENSION})

file(DOWNLOAD https://github.com/opencor/libopencor/releases/download/v${PROJECT_VERSION}/${LIBOPENCOR_FILE_NAME}
              ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME})

execute_process(COMMAND ${CMAKE_COMMAND} -E tar xvf ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME}
                WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
                OUTPUT_QUIET)

execute_process(COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_BINARY_DIR}/Static
                OUTPUT_QUIET)

execute_process(COMMAND ${CMAKE_COMMAND} -E rename ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME_WE}
                                                   ${CMAKE_BINARY_DIR}/Static
                OUTPUT_QUIET)

file(REMOVE ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME})

include_directories(${CMAKE_BINARY_DIR}/Static/include
                    ${CMAKE_BINARY_DIR}/Static/include/libopencor/module)

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

# Create our native node module as a shared library.

file(GLOB CPP_FILES "src/renderer/src/libopencor/src/*.cpp")

add_library(${CMAKE_PROJECT_NAME} SHARED
            ${CMAKE_JS_SRC}
            ${CPP_FILES})

# Don't have a "lib" prefix and use a ".node" suffix.

set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
                      PREFIX ""
                      SUFFIX ".node")

# Generate node.lib.

if(MSVC AND CMAKE_JS_NODELIB_DEF AND CMAKE_JS_NODELIB_TARGET)
    execute_process(COMMAND ${CMAKE_AR} /def:${CMAKE_JS_NODELIB_DEF} /out:${CMAKE_JS_NODELIB_TARGET} ${CMAKE_STATIC_LINKER_FLAGS})
endif()

# Link our native node module against cmake-js, a few Windows-specific libraries, and libOpenCOR.

if(WIN32)
    set(WINDOWS_LIBS crypt32 version wldap32 ws2_32)
endif()

target_link_libraries(${CMAKE_PROJECT_NAME} PRIVATE
                      ${CMAKE_JS_LIB} ${WINDOWS_LIBS}
                      ${CMAKE_BINARY_DIR}/Static/lib/${CMAKE_PROJECT_NAME}${CMAKE_STATIC_LIBRARY_SUFFIX})
