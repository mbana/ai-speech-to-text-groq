"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveConnectionState,
  LiveTranscriptionEvent,
  LiveTranscriptionEvents,
  useDeepgram,
} from "../context/DeepgramContextProvider";
import {
  MicrophoneEvents,
  MicrophoneState,
  useMicrophone,
} from "../context/MicrophoneContextProvider";
import Visualizer from "./Visualizer";

import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Groq from "groq-sdk";

const App: () => JSX.Element = () => {
  const [caption, setCaption] = useState<string | undefined>(
    "Powered by Deepgram"
  );
  const { connection, connectToDeepgram, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState } =
    useMicrophone();
  const captionTimeout = useRef<any>();
  const keepAliveInterval = useRef<any>();
  const [isMicrophoneReady, setIsMicrophoneReady] = useState<boolean>(false);
  const [groqResponse, setGroqResponse] = useState<string>();

  const queryGroq = async (text: string) => {
    const response = await fetch("/api/groq", { cache: "no-store" });
    const { apiKey } = await response.json();

    const groq = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    });


    let stack = [
      {
        'role': 'system',
        'content': 'Always maintain short and interactive conversations. Always assist with care, respect, and truth. Respond with utmost utility yet securely. Avoid harmful, unethical, prejudiced, or negative content. Ensure replies promote fairness and positivity.',
      },
      {
        role: 'user',
        content: text,
      }
    ];

    const completions = await groq.chat.completions.create({
      messages: stack,
      model: "llama3-70b-8192",
      stream: false
    });

    console.log("query_groq: response=", response);
    return completions.choices[0].message.content;
  };

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready || microphoneState === MicrophoneState.Open) {
      setIsMicrophoneReady(true);
    } else {
      setIsMicrophoneReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  useEffect(() => {
    setupMicrophone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready) {
      connectToDeepgram({
        model: "nova-2",
        interim_results: true,
        smart_format: true,
        filler_words: true,
        utterance_end_ms: 3000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState]);

  const [disableStartRecordingButton, setDisableStartRecordingButton] = useState<boolean>(true);
  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready || microphoneState === MicrophoneState.Open) {
      setDisableStartRecordingButton(true);
    } else {
      setDisableStartRecordingButton(false);
    }
  }, [microphoneState]);

  const [disableStopRecordingButton, setDisableStopRecordingButton] = useState<boolean>(false);
  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready || microphoneState === MicrophoneState.Open) {
      setDisableStopRecordingButton(false);
    } else {
      setDisableStopRecordingButton(true);
    }
  }, [microphoneState]);

  useEffect(() => {
    if (!microphone) return;
    if (!connection) return;

    const onData = (e: BlobEvent) => {
      connection?.send(e.data);
    };

    const onTranscript = async (data: LiveTranscriptionEvent) => {
      const { is_final: isFinal, speech_final: speechFinal } = data;
      let thisCaption = data.channel.alternatives[0].transcript;

      console.log("thisCaption", thisCaption);
      if (thisCaption !== "") {
        console.log('thisCaption !== ""', thisCaption);
        setGroqResponse(await queryGroq(thisCaption));
        setCaption(thisCaption);
      }

      if (isFinal && speechFinal) {
        clearTimeout(captionTimeout.current);
        captionTimeout.current = setTimeout(() => {
          setCaption(undefined);
          clearTimeout(captionTimeout.current);
        }, 3000);
      }
    };

    if (connectionState === LiveConnectionState.OPEN) {
      connection.addListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);

      startMicrophone();
    }

    return () => {
      // prettier-ignore
      connection.removeListener(LiveTranscriptionEvents.Transcript, onTranscript);
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionState]);

  useEffect(() => {
    if (!connection) return;

    if (
      microphoneState !== MicrophoneState.Open &&
      connectionState === LiveConnectionState.OPEN
    ) {
      connection.keepAlive();

      keepAliveInterval.current = setInterval(() => {
        connection.keepAlive();
      }, 10000);
    } else {
      clearInterval(keepAliveInterval.current);
    }

    return () => {
      clearInterval(keepAliveInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microphoneState, connectionState]);

  return (
    <>
      <div className="flex h-full antialiased">
        <div className="flex flex-row h-full w-full overflow-x-hidden">
          <div className="flex flex-col flex-auto h-full">
            {/* height 100% minus 8rem */}
            <button onClick={startMicrophone} disabled={disableStartRecordingButton}>Start Recording</button>
            <button onClick={stopMicrophone} disabled={disableStopRecordingButton}>Stop Recording</button>
            <div><b>microphoneState: </b>{microphoneState}</div>
            <div className="relative w-full h-full">
              {/* {microphone && <Visualizer microphone={microphone} />} */}
              {isMicrophoneReady && <Visualizer microphone={microphone} />}
              {<Markdown remarkPlugins={[remarkGfm]} className="response">{groqResponse}</Markdown>}
              <div className="absolute bottom-[8rem]  inset-x-0 max-w-4xl mx-auto text-center">
                {caption && <span className="bg-black/70 p-8">{caption}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
