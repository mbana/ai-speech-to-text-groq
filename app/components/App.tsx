"use client";

import { useEffect, useRef, useState } from "react";
import {
  useDeepgram,
} from "../context/DeepgramContextProvider";
import {
  MicrophoneEvents,
  MicrophoneState,
  useMicrophone,
} from "../context/MicrophoneContextProvider";
import Visualizer from "./Visualizer";

import {
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Button,
} from "@material-tailwind/react";

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import Groq from "groq-sdk";

const App: () => JSX.Element = () => {
  const [caption, setCaption] = useState<string | undefined>("Powered by Deepgram and Groq");
  const { connection, connectionState } = useDeepgram();
  const { setupMicrophone, microphone, startMicrophone, stopMicrophone, microphoneState, mimeType, onMicrophoneData, microphoneData, setMicrophoneData } = useMicrophone();
  const captionTimeout = useRef<any>();
  const [isMicrophoneReady, setIsMicrophoneReady] = useState<boolean>(false);
  const [groqResponse, setGroqResponse] = useState<string>();
  const [error, setError] = useState<Error | null>(null);

  const queryGroq = async (content: string) => {
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
        content: content,
      }
    ];

    const completions = await groq.chat.completions.create({
      messages: stack,
      model: "llama3-70b-8192",
      stream: false,
    });

    // console.log("queryGroq: completions=", completions);
    return completions.choices[0].message.content;
  };

  useEffect(() => {
    if (microphoneState === MicrophoneState.Ready || microphoneState === MicrophoneState.Open) {
      setIsMicrophoneReady(true);
    } else {
      setIsMicrophoneReady(false);
    }
  }, [microphoneState]);

  useEffect(() => {
    setupMicrophone();
  }, []);

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
    if (!microphone) {
      return;
    }

    const onData = (event: BlobEvent) => {
      onMicrophoneData(event);
    };

    microphone.addEventListener(MicrophoneEvents.DataAvailable, onData);
    startMicrophone();

    return () => {
      microphone.removeEventListener(MicrophoneEvents.DataAvailable, onData);
      clearTimeout(captionTimeout.current);
    };
  }, [microphone, connection, connectionState]);

  const stopRecording = async () => {
    microphone?.requestData();
    microphone?.stream.getTracks().forEach((track) => { track.stop(); });
    stopMicrophone();
    console.log('microphoneData=', microphoneData);
    const blobParts = microphoneData.reduce((a, b) => new Blob([a, b], { type: mimeType ?? "audio/webm" }));
    const blobs = new Blob([blobParts], { type: mimeType ?? "audio/webm" });

    const options = {
      method: 'POST',
      url: '/api/deepgram',
      headers: {
        'Accept': 'application/json',
        cache: "no-store",
      },
      body: blobs,
    };
    const response = await fetch("/api/deepgram", options);
    const json = await response.json();

    const transcript = json.result.results.channels[0].alternatives[0].transcript;
    const groqResponse = await queryGroq(transcript);
    setGroqResponse(groqResponse);
    console.log(groqResponse);

    setMicrophoneData([]);
  };

  const startRecording = async () => {
    await setupMicrophone();
    startMicrophone();
  };

  return (
    <>
      <div className="flex h-full antialiased">
        <div className="flex flex-row h-full w-full overflow-x-hidden">
          <div className="flex flex-col flex-auto h-full">
            {/* height 100% minus 8rem */}
            <Button color="green" onClick={startRecording} disabled={disableStartRecordingButton}>Start Recording</Button>
            <Button color="red" onClick={stopRecording} disabled={disableStopRecordingButton}>Stop Recording</Button>
            <div><b>microphoneState: </b>{microphoneState}</div>
            <div className="relative w-full h-full">
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
