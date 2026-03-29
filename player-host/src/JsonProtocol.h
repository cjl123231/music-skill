#pragma once

#include <string>
#include <optional>

struct Command {
    std::string action;
    std::string fileUrl;
    int         volumePercent = 50;
};

// Minimal JSON parser — no third-party dependency
class JsonProtocol {
public:
    static std::optional<Command> parseCommand(const std::string& json);
    static std::string okReply();
    static std::string errorReply(const std::string& message);
    static std::string stateReply(const std::string& status, int volumePercent);

private:
    static std::string extractString(const std::string& json, const std::string& key);
    static int extractInt(const std::string& json, const std::string& key, int defaultVal);
    static std::string escapeJson(const std::string& s);
};
