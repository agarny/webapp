cmake_minimum_required(VERSION 3.15)

project(libOpenCOR
        VERSION 0.0.0)

# Enable C++20.

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Get access to cmake-js.

include_directories(${CMAKE_JS_INC})

# Get access to libOpenCOR.

if(WIN32)
    set(PLATFORM Windows)
    set(ARCHITECTURE Intel)
    set(EXTENSION .zip)
elseif(APPLE)
    set(PLATFORM macOS)
    set(EXTENSION .zip)

    if("${CMAKE_HOST_SYSTEM_PROCESSOR}" STREQUAL "x86_64")
        set(ARCHITECTURE Intel)
    else()
        set(ARCHITECTURE ARM)
    endif()
else()
    set(PLATFORM Linux)
    set(ARCHITECTURE Intel)
    set(EXTENSION .tar.gz)
endif()

set(LIBOPENCOR_FILE_NAME_WE libOpenCOR-${PROJECT_VERSION_MAJOR}-${PROJECT_VERSION_MINOR}-${PROJECT_VERSION_PATCH}-${PLATFORM}-${ARCHITECTURE}-Static)
set(LIBOPENCOR_FILE_NAME ${LIBOPENCOR_FILE_NAME_WE}${EXTENSION})

file(DOWNLOAD https://opencor.ws/libopencor/downloads/${LIBOPENCOR_FILE_NAME}
              ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME})

execute_process(COMMAND ${CMAKE_COMMAND} -E tar xvf ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME}
                WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
                OUTPUT_QUIET)

file(REMOVE ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME})

include_directories(${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME_WE}/include
                    ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME_WE}/include/libopencor/module)

# Create the C++ add-on as a shared library.

add_library(${CMAKE_PROJECT_NAME} SHARED
            ${CMAKE_JS_SRC}
            src/libopencor/main.cpp
            src/libopencor/version.cpp)

# Don't have a "lib" prefix and use a ".node" suffix.

set_target_properties(${CMAKE_PROJECT_NAME} PROPERTIES
                      PREFIX ""
                      SUFFIX ".node")

# Essential library files to link to a Node.js add-on.

target_link_libraries(${CMAKE_PROJECT_NAME}
                      ${CMAKE_JS_LIB}
                      ${CMAKE_BINARY_DIR}/${LIBOPENCOR_FILE_NAME_WE}/lib/libOpenCOR${CMAKE_STATIC_LIBRARY_SUFFIX})

# Include the Node-API wrappers.

execute_process(COMMAND node -p "require('node-addon-api').include"
                WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
                OUTPUT_VARIABLE NODE_ADDON_API_DIR)

string(REPLACE "\n" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})
string(REPLACE "\"" "" NODE_ADDON_API_DIR ${NODE_ADDON_API_DIR})

target_include_directories(${CMAKE_PROJECT_NAME} PRIVATE
                           ${NODE_ADDON_API_DIR})

add_definitions(-DNAPI_VERSION=3)
