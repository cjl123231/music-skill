cmake_minimum_required(VERSION 3.16)
project(PlayerHost LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(player-host
    src/main.cpp
    src/AudioEngine.cpp
    src/JsonProtocol.cpp
)

target_include_directories(player-host PRIVATE src)

set_target_properties(player-host PROPERTIES
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../scripts"
    RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_SOURCE_DIR}/../scripts"
    RUNTIME_OUTPUT_DIRECTORY_DEBUG "${CMAKE_SOURCE_DIR}/../scripts"
)

target_link_libraries(player-host PRIVATE
    mfplay mf mfplat mfuuid ole32 shlwapi
)

# Release optimisation
if(MSVC)
    target_compile_options(player-host PRIVATE /W4 /utf-8)
else()
    target_compile_options(player-host PRIVATE -Wall -Wextra)
endif()
