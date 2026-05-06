/**
 * useDeepgramTranscription
 *
 * Captures system audio via getDisplayMedia (the rep shares their screen with
 * audio so the browser can hear both sides of the RingCentral call), streams
 * raw audio bytes to Deepgram's WebSocket API, and yields transcript events.
 *
 * Usage:
 *   const { state, start, stop, liveText, utterances } = useDeepgramTranscription({
 *     onUtterance: (text) => detectSignals(text),
 *   });
 *
 * Audio capture notes:
 *  - getDisplayMedia requires Chrome/Edge; Safari/Firefox don't support audio-only capture.
 *  - video: true is requested so Chrome shows the "share with audio" checkbox;
 *    video tracks are stopped immediately after the stream is obtained.
 *  - The rep must select "Entire Screen" + check "Also share audio" in the dialog.
 */

import { useCallback, useRef, useState } from "react";
import { getAuthHeader } from "./authHeader.js";

export type TranscriptionState =
  | "idle"
  | "requesting-display"
  | "connecting"
  | "active"
  | "error"
  | "stopped";

export interface TranscriptUtterance {
  text: string;
  ts: number;
}

interface UseDeepgramOptions {
  onUtterance?: (text: string) => void;
}

const DG_WS_URL = "wss://api.deepgram.com/v1/listen";
const DG_PARAMS = new URLSearchParams({
  model: "nova-3",
  language: "en-US",
  encoding: "opus",
  sample_rate: "48000",
  channels: "1",
  interim_results: "true",
  smart_format: "true",
  punctuate: "true",
  vad_events: "true",
  endpointing: "400",
});

export function useDeepgramTranscription({ onUtterance }: UseDeepgramOptions = {}) {
  const [state, setState] = useState<TranscriptionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveText, setLiveText] = useState("");
  const [utterances, setUtterances] = useState<TranscriptUtterance[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current);
      keepAliveRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "CloseStream" }));
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setState("stopped");
    setLiveText("");
  }, []);

  const start = useCallback(async () => {
    setErrorMsg(null);
    setLiveText("");

    // 1. Request system audio via screen-share dialog
    setState("requesting-display");
    let displayStream: MediaStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          noiseSuppression: false,
          echoCancellation: false,
          sampleRate: 48000,
        },
        video: true, // required for Chrome to show the "share audio" option
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg.includes("Permission denied") ? "Screen share was cancelled." : msg);
      setState("error");
      return;
    }

    // Stop the video tracks immediately — we only need audio
    displayStream.getVideoTracks().forEach((t) => t.stop());
    const audioTracks = displayStream.getAudioTracks();
    if (audioTracks.length === 0) {
      setErrorMsg(
        "No audio captured. Make sure to check 'Share system audio' or 'Share tab audio' in the dialog.",
      );
      setState("error");
      displayStream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamRef.current = displayStream;

    // If the user stops sharing via the browser's stop button, clean up
    audioTracks[0].addEventListener("ended", () => stop());

    // 2. Fetch short-lived token from our server
    setState("connecting");
    let token: string;
    try {
      const authHeader = await getAuthHeader();
      const resp = await fetch("/api/deepgram-token", { method: "POST", headers: authHeader });
      if (!resp.ok) throw new Error(`Token endpoint returned ${resp.status}`);
      const data = (await resp.json()) as { token: string; error?: string };
      if (data.error) throw new Error(data.error);
      token = data.token;
    } catch (err) {
      setErrorMsg(`Could not get Deepgram token: ${err instanceof Error ? err.message : err}`);
      setState("error");
      displayStream.getTracks().forEach((t) => t.stop());
      return;
    }

    // 3. Open WebSocket to Deepgram
    const ws = new WebSocket(`${DG_WS_URL}?token=${encodeURIComponent(token)}&${DG_PARAMS}`);
    wsRef.current = ws;

    ws.addEventListener("error", () => {
      setErrorMsg("Deepgram WebSocket error — check your API key and network.");
      setState("error");
      stop();
    });

    ws.addEventListener("close", () => {
      if (keepAliveRef.current) clearInterval(keepAliveRef.current);
    });

    ws.addEventListener("open", () => {
      setState("active");

      // KeepAlive every 8s to prevent idle timeout
      keepAliveRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "KeepAlive" }));
        }
      }, 8000);

      // 4. Start MediaRecorder sending opus chunks every 250ms
      const audioOnlyStream = new MediaStream(audioTracks);
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(audioOnlyStream, {
        mimeType,
        audioBitsPerSecond: 64000,
      });
      recorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (e) => {
        if (ws.readyState === WebSocket.OPEN && e.data.size > 0) {
          ws.send(e.data);
        }
      });

      recorder.start(250); // 250ms chunks
    });

    ws.addEventListener("message", (event) => {
      let msg: DeepgramMessage;
      try {
        msg = JSON.parse(event.data as string) as DeepgramMessage;
      } catch {
        return;
      }

      if (msg.type !== "Results") return;

      const transcript = msg.channel?.alternatives?.[0]?.transcript ?? "";
      if (!transcript.trim()) return;

      if (!msg.is_final) {
        // Interim — show live
        setLiveText(transcript);
      } else {
        // Final — commit to utterances list, fire callback
        setLiveText("");
        setUtterances((prev) => [
          ...prev.slice(-9), // keep last 10
          { text: transcript, ts: Date.now() },
        ]);
        onUtterance?.(transcript);
      }
    });
  }, [stop, onUtterance]);

  return { state, errorMsg, liveText, utterances, start, stop };
}

/* ── Deepgram message types (minimal) ───────────────────────────────── */

interface DeepgramMessage {
  type: "Results" | "Metadata" | "SpeechStarted" | "UtteranceEnd";
  is_final?: boolean;
  speech_final?: boolean;
  channel?: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
    }>;
  };
}
