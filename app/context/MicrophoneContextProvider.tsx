"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useMemo,
  Dispatch,
  SetStateAction
} from "react";

interface MicrophoneContextType {
  microphone: MediaRecorder | null;
  startMicrophone: () => void;
  stopMicrophone: () => void;
  setupMicrophone: () => void;
  microphoneState: MicrophoneState | null;
  mimeType: string | null,
  error: Error | null,
  onMicrophoneData: (event: BlobEvent) => void,
  microphoneData: Blob[],
  setMicrophoneData: Dispatch<SetStateAction<Blob[]>>,
};

export enum MicrophoneEvents {
  DataAvailable = "dataavailable",
  Error = "error",
  Pause = "pause",
  Resume = "resume",
  Start = "start",
  Stop = "stop",
}

export enum MicrophoneState {
  NotSetup = "NotSetup",
  SettingUp = "SettingUp",
  Ready = "Ready",
  Opening = "Opening",
  Open = "Open",
  Error = "Error",
  Pausing = "Pausing",
  Paused = "Paused",
};

const MicrophoneContext = createContext<MicrophoneContextType | undefined>(undefined);

interface MicrophoneContextProviderProps {
  children: ReactNode;
}

const MicrophoneContextProvider: React.FC<MicrophoneContextProviderProps> = ({
  children,
}) => {
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>(MicrophoneState.NotSetup);
  const [microphone, setMicrophone] = useState<MediaRecorder | null>(null);
  const [mimeType, setMimeType] = useState<string>('audio/webm');
  const [device, setDevice] = useState<MediaDeviceInfo | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [microphoneData, setMicrophoneData] = useState<Blob[]>([]);

  useCallback(async () => {
    // const devices = [
    //     {
    //         "deviceId": "default",
    //         "kind": "audioinput",
    //         "label": "Default",
    //         "groupId": "9803d7e7f0b95b96fe7df65cf3fc8d87ac3141d63faf0b1919c1ec170d05ea64"
    //     },
    //     {
    //         "deviceId": "583aad43b7cd1935157d7efb57ea4892946e02a67d26c499aca05ce4bf9c5261",
    //         "kind": "audioinput",
    //         "label": "Alder Lake PCH-P High Definition Audio Controller Digital Microphone",
    //         "groupId": "56106163ebbadbb95bc459bc9ecb12d452a57cfc7781e188d856fe573695aad7"
    //     },
    //     {
    //         "deviceId": "1e6f6e822a77098dd60c46f70d3bc38f66d9f518f48bf26c6d70f278984eaac7",
    //         "kind": "audioinput",
    //         "label": "BRIO 4K Stream Edition Analog Stereo",
    //         "groupId": "86fbf4e7909a8cd2e93047b6cdc1496d5a036a340723b41ed50c897555586a43"
    //     }
    // ];
    const devices = await navigator.mediaDevices.enumerateDevices();
    if (devices.length === 0) {
      setError(new Error("could not enumerate devices using `navigator.mediaDevices.enumerateDevices`"));
      return;
    }

    const microphones = devices.filter((device) => { return device.kind === 'audioinput' });
    if (microphones.length === 0) {
      setError(new Error("could not find a microphone, no devices of type `audioinput`"));
      return;
    }

    const DEVICE_LABEL = 'Alder Lake PCH-P High Definition Audio Controller Digital Microphone';
    const device = devices.findLast((device) => { return device.label === DEVICE_LABEL }) ?? null;
    setDevice(device);
  }, []);

  useCallback(async () => {
    var mimeTypes = [
      'video/webm',
      'video/x-matroska;codecs=avc1',
      'video/mp4;codecs=avc1',
      'video/invalid',
      'video/x-matroska;codecs="avc1"',
      'video/webm;codecs=vp8',
      'audio/webm',
      'audio/webm;codecs=vp8',
      'audio/webm;codecs=opus',
    ];
    setMimeType(mimeTypes.findLast(mimeType => { return MediaRecorder.isTypeSupported(mimeType); }) ?? 'audio/webm');
  }, []);

  const setupMicrophone = async () => {
    setMicrophoneState(MicrophoneState.SettingUp);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          // noiseSuppression: false,
          // echoCancellation: false,
          deviceId: device?.deviceId,
        },
        video: false,
      });

      setMicrophoneState(MicrophoneState.Ready);
      setMicrophone(new MediaRecorder(mediaStream, { mimeType }));
    } catch (error: any) {
      console.error("MicrophoneContext.setupMicrophone: error=", error);
      setError(error);
      throw error;
    }
  };

  const stopMicrophone = () => {
    // console.log("MicrophoneContext.stopMicrophone: stopping microphone");
    setMicrophoneState(MicrophoneState.Pausing);

    microphone?.stop();
    // if (microphone?.state === "recording") {
    //   // microphone.pause();
    //   microphone.stop();
    setMicrophoneState(MicrophoneState.NotSetup);
    // }

    setMicrophone(null);
  };

  const startMicrophone = () => {
    // console.log("MicrophoneContext.startMicrophone: starting microphone");
    setMicrophoneState(MicrophoneState.Opening);

    if (microphone?.state === "paused") {
      microphone.resume();
    } else {
      microphone?.start(250);
      // microphone?.start(1000);
      // microphone?.start();
    }

    setMicrophoneState(MicrophoneState.Open);
  };

  const onMicrophoneData = (event: BlobEvent) => {
    // console.log('MicrophoneContext.onMicrophoneData: event=', event);
    if (event.data.size > 0) {
      microphoneData.push(event.data);
    }
  };

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        startMicrophone,
        stopMicrophone,
        setupMicrophone,
        microphoneState,
        mimeType,
        error,
        onMicrophoneData,
        microphoneData,
        setMicrophoneData,
      }}
    >
      {children}
    </MicrophoneContext.Provider>
  );
};

function useMicrophone(): MicrophoneContextType {
  const context = useContext(MicrophoneContext);
  context?.microphone
  if (context === undefined) {
    const error = new Error("useMicrophone must be used within a MicrophoneContextProvider");
    throw error;
  }

  return context;
}

export { MicrophoneContextProvider, useMicrophone };
