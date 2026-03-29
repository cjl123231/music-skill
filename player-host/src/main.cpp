#include "AudioEngine.h"
#include "JsonProtocol.h"

#include <iostream>
#include <string>
#include <io.h>
#include <fcntl.h>

// Convert UTF-8 string to wide string
static std::wstring utf8ToWide(const std::string& utf8)
{
    if (utf8.empty()) return {};
    int len = MultiByteToWideChar(CP_UTF8, 0, utf8.c_str(), (int)utf8.size(), nullptr, 0);
    if (len <= 0) return {};
    std::wstring result(len, L'\0');
    MultiByteToWideChar(CP_UTF8, 0, utf8.c_str(), (int)utf8.size(), &result[0], len);
    return result;
}

static const char* statusToString(PlayStatus s)
{
    switch (s) {
    case PlayStatus::Playing: return "playing";
    case PlayStatus::Paused:  return "paused";
    default:                  return "idle";
    }
}

static void writeLine(const std::string& line)
{
    std::cout << line << "\n";
    std::cout.flush();
}

int main()
{
    // Set stdin/stdout to binary mode to avoid CR/LF translation issues
    _setmode(_fileno(stdin),  _O_BINARY);
    _setmode(_fileno(stdout), _O_BINARY);

    // Use UTF-8 console
    SetConsoleCP(CP_UTF8);
    SetConsoleOutputCP(CP_UTF8);

    AudioEngine engine;
    if (!engine.init()) {
        writeLine(JsonProtocol::errorReply("Failed to initialise audio engine"));
        return 1;
    }

    std::string line;
    while (true) {
        // Pump Windows messages to process MFP callbacks
        engine.pumpMessages();

        // Non-blocking stdin check: peek if data is available
        HANDLE hStdin = GetStdHandle(STD_INPUT_HANDLE);
        DWORD bytesAvailable = 0;
        if (!PeekNamedPipe(hStdin, nullptr, 0, nullptr, &bytesAvailable, nullptr)) {
            // stdin closed (parent process exited)
            break;
        }

        if (bytesAvailable == 0) {
            // No data — sleep briefly to avoid busy-waiting
            Sleep(10);
            continue;
        }

        if (!std::getline(std::cin, line)) {
            break; // EOF
        }

        // Trim whitespace
        while (!line.empty() && (line.back() == '\r' || line.back() == '\n' || line.back() == ' '))
            line.pop_back();

        if (line.empty()) continue;

        auto cmd = JsonProtocol::parseCommand(line);
        if (!cmd) {
            writeLine(JsonProtocol::errorReply("Invalid JSON command"));
            continue;
        }

        if (cmd->action == "play") {
            std::wstring wUrl = utf8ToWide(cmd->fileUrl);
            if (engine.play(wUrl, cmd->volumePercent))
                writeLine(JsonProtocol::okReply());
            else
                writeLine(JsonProtocol::errorReply("Failed to play file"));
        }
        else if (cmd->action == "pause") {
            engine.pause();
            writeLine(JsonProtocol::okReply());
        }
        else if (cmd->action == "resume") {
            engine.resume();
            writeLine(JsonProtocol::okReply());
        }
        else if (cmd->action == "stop") {
            engine.stop();
            writeLine(JsonProtocol::okReply());
        }
        else if (cmd->action == "set_volume") {
            engine.setVolume(cmd->volumePercent);
            writeLine(JsonProtocol::okReply());
        }
        else if (cmd->action == "get_state") {
            writeLine(JsonProtocol::stateReply(
                statusToString(engine.status()),
                engine.volumePercent()
            ));
        }
        else {
            writeLine(JsonProtocol::errorReply("Unknown action: " + cmd->action));
        }
    }

    engine.shutdown();
    return 0;
}
