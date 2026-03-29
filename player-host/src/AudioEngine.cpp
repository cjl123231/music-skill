#include "AudioEngine.h"
#include <mferror.h>
#include <shlwapi.h>
#include <cmath>

#pragma comment(lib, "mfplay.lib")
#pragma comment(lib, "mf.lib")
#pragma comment(lib, "mfplat.lib")
#pragma comment(lib, "ole32.lib")
#pragma comment(lib, "shlwapi.lib")

AudioEngine::AudioEngine() = default;

AudioEngine::~AudioEngine()
{
    shutdown();
}

bool AudioEngine::init()
{
    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    if (FAILED(hr) && hr != S_FALSE && hr != RPC_E_CHANGED_MODE)
        return false;

    hr = MFStartup(MF_VERSION);
    if (FAILED(hr)) return false;
    m_mfInited = true;

    hr = MFPCreateMediaPlayer(
        nullptr,    // URL (set later)
        FALSE,      // start playback
        0,          // creation flags
        this,       // callback
        nullptr,    // hWnd (audio only)
        &m_player
    );

    return SUCCEEDED(hr) && m_player != nullptr;
}

void AudioEngine::shutdown()
{
    if (m_player) {
        m_player->Shutdown();
        m_player->Release();
        m_player = nullptr;
    }
    if (m_mfInited) {
        MFShutdown();
        m_mfInited = false;
    }
    CoUninitialize();
}

bool AudioEngine::play(const std::wstring& fileUrl, int volumePercent)
{
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_player) return false;

    // Stop current playback
    m_player->Stop();

    // Create media item from URL
    HRESULT hr = m_player->CreateMediaItemFromURL(fileUrl.c_str(), FALSE, 0, nullptr);
    if (FAILED(hr)) return false;

    // Volume: MFP uses 0.0 ~ 1.0 linear
    m_volume.store(volumePercent);
    float vol = static_cast<float>(volumePercent) / 100.0f;
    m_player->SetVolume(vol);

    setStatus(PlayStatus::Playing);
    return true;
}

bool AudioEngine::pause()
{
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_player) return false;

    HRESULT hr = m_player->Pause();
    if (SUCCEEDED(hr))
        setStatus(PlayStatus::Paused);
    return SUCCEEDED(hr);
}

bool AudioEngine::resume()
{
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_player) return false;

    HRESULT hr = m_player->Play();
    if (SUCCEEDED(hr))
        setStatus(PlayStatus::Playing);
    return SUCCEEDED(hr);
}

bool AudioEngine::stop()
{
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_player) return false;

    HRESULT hr = m_player->Stop();
    if (SUCCEEDED(hr))
        setStatus(PlayStatus::Idle);
    return SUCCEEDED(hr);
}

bool AudioEngine::setVolume(int percent)
{
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_player) return false;

    m_volume.store(percent);
    float vol = static_cast<float>(percent) / 100.0f;
    return SUCCEEDED(m_player->SetVolume(vol));
}

PlayStatus AudioEngine::status() const
{
    return m_status.load();
}

int AudioEngine::volumePercent() const
{
    return m_volume.load();
}

void AudioEngine::setStatus(PlayStatus s)
{
    m_status.store(s);
}

void AudioEngine::pumpMessages()
{
    MSG msg;
    while (PeekMessageW(&msg, nullptr, 0, 0, PM_REMOVE)) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }
}

// --- IUnknown ---

STDMETHODIMP AudioEngine::QueryInterface(REFIID riid, void** ppv)
{
    if (riid == IID_IUnknown || riid == __uuidof(IMFPMediaPlayerCallback)) {
        *ppv = static_cast<IMFPMediaPlayerCallback*>(this);
        AddRef();
        return S_OK;
    }
    *ppv = nullptr;
    return E_NOINTERFACE;
}

STDMETHODIMP_(ULONG) AudioEngine::AddRef()
{
    return InterlockedIncrement(&m_refCount);
}

STDMETHODIMP_(ULONG) AudioEngine::Release()
{
    ULONG count = InterlockedDecrement(&m_refCount);
    // Prevent self-deletion — we manage lifetime manually
    return count;
}

// --- MFP Events ---

STDMETHODIMP_(void) AudioEngine::OnMediaPlayerEvent(MFP_EVENT_HEADER* pEventHeader)
{
    if (!pEventHeader) return;

    switch (pEventHeader->eEventType) {
    case MFP_EVENT_TYPE_MEDIAITEM_CREATED: {
        // Media item created — set it and start playing
        auto* pEvent = MFP_GET_MEDIAITEM_CREATED_EVENT(pEventHeader);
        if (pEvent && pEvent->pMediaItem && m_player) {
            m_player->SetMediaItem(pEvent->pMediaItem);
        }
        break;
    }
    case MFP_EVENT_TYPE_MEDIAITEM_SET: {
        // Media item set — now actually start playback
        if (m_player) {
            m_player->Play();
        }
        break;
    }
    case MFP_EVENT_TYPE_PLAYBACK_ENDED: {
        setStatus(PlayStatus::Idle);
        break;
    }
    case MFP_EVENT_TYPE_STOP: {
        setStatus(PlayStatus::Idle);
        break;
    }
    case MFP_EVENT_TYPE_PAUSE: {
        setStatus(PlayStatus::Paused);
        break;
    }
    case MFP_EVENT_TYPE_PLAY: {
        setStatus(PlayStatus::Playing);
        break;
    }
    default:
        break;
    }
}
