#include "JsonProtocol.h"
#include <sstream>
#include <algorithm>

// Simple key-value extraction from flat JSON (no nesting needed)

std::string JsonProtocol::extractString(const std::string& json, const std::string& key)
{
    std::string needle = "\"" + key + "\"";
    auto pos = json.find(needle);
    if (pos == std::string::npos) return {};

    pos = json.find(':', pos + needle.size());
    if (pos == std::string::npos) return {};

    // Skip whitespace
    pos = json.find_first_not_of(" \t\r\n", pos + 1);
    if (pos == std::string::npos) return {};

    if (json[pos] == '"') {
        auto end = json.find('"', pos + 1);
        if (end == std::string::npos) return {};
        return json.substr(pos + 1, end - pos - 1);
    }

    // Unquoted value (number, bool, null)
    auto end = json.find_first_of(",} \t\r\n", pos);
    return json.substr(pos, end - pos);
}

int JsonProtocol::extractInt(const std::string& json, const std::string& key, int defaultVal)
{
    std::string val = extractString(json, key);
    if (val.empty()) return defaultVal;
    try { return std::stoi(val); }
    catch (...) { return defaultVal; }
}

std::string JsonProtocol::escapeJson(const std::string& s)
{
    std::string out;
    out.reserve(s.size());
    for (char c : s) {
        switch (c) {
        case '"':  out += "\\\""; break;
        case '\\': out += "\\\\"; break;
        case '\n': out += "\\n";  break;
        case '\r': out += "\\r";  break;
        case '\t': out += "\\t";  break;
        default:   out += c;      break;
        }
    }
    return out;
}

std::optional<Command> JsonProtocol::parseCommand(const std::string& json)
{
    std::string action = extractString(json, "action");
    if (action.empty()) return std::nullopt;

    Command cmd;
    cmd.action        = action;
    cmd.fileUrl        = extractString(json, "fileUrl");
    cmd.volumePercent  = extractInt(json, "volumePercent", 50);
    return cmd;
}

std::string JsonProtocol::okReply()
{
    return R"({"ok":true})";
}

std::string JsonProtocol::errorReply(const std::string& message)
{
    return R"({"ok":false,"error":")" + escapeJson(message) + R"("})";
}

std::string JsonProtocol::stateReply(const std::string& status, int volumePercent)
{
    std::ostringstream ss;
    ss << R"({"ok":true,"status":")" << status
       << R"(","volumePercent":)" << volumePercent << "}";
    return ss.str();
}
