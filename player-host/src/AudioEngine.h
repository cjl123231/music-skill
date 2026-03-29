#pragma once

#include <string>
#include <atomic>
#include <mutex>
#include <windows.h>
#include <mfplay.h>
#include <mfapi.h>

// Playback status matching the JSON protocol
enum class PlayStatus { Idle, Playing, Paused };

class AudioEngine final : public IMFPMediaPlayerCallback {
public:
    AudioEngine();
    ~AudioEngine();

    AudioEngine(const AudioEngine&) = delete;
    AudioEngine& operator=(const AudioEngine&) = delete;

    bool init();
    void shutdown();

    bool play(const std::wstring& fileUrl, int volumePercent);
    bool pause();
    bool resume();
    bool stop();
    bool setVolume(int percent);

    PlayStatus status() const;
    int        volumePercent() const;

    // Pump COM/MFP messages (call from main loop)
    void pumpMessages();

    // IMFPMediaPlayerCallback
    STDMETHODIMP QueryInterface(REFIID riid, void** ppv) override;
    STDMETHODIMP_(ULONG) AddRef() override;
    STDMETHODIMP_(ULONG) Release() override;
    STDMETHODIMP_(void) OnMediaPlayerEvent(MFP_EVENT_HEADER* pEventHeader) override;

private:
    void setStatus(PlayStatus s);

    IMFPMediaPlayer*    m_player = nullptr;
    std::atomic<PlayStatus> m_status{PlayStatus::Idle};
    std::atomic<int>        m_volume{50};
    LONG                    m_refCount = 1;
    mutable std::mutex      m_mutex;
    bool                    m_mfInited = false;
};
