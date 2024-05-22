"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";

interface MicrophoneContextType {
  microphone: MediaRecorder | null;
  startMicrophone: () => void;
  stopMicrophone: () => void;
  setupMicrophone: () => void;
  microphoneState: MicrophoneState | null;
}

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

const MicrophoneContext = createContext<MicrophoneContextType | undefined>(
  undefined
);

interface MicrophoneContextProviderProps {
  children: ReactNode;
}

const MicrophoneContextProvider: React.FC<MicrophoneContextProviderProps> = ({
  children,
}) => {
  const [microphoneState, setMicrophoneState] = useState<MicrophoneState>(
    MicrophoneState.NotSetup
  );
  const [microphone, setMicrophone] = useState<MediaRecorder | null>(null);

  const setupMicrophone = async () => {
    setMicrophoneState(MicrophoneState.SettingUp);

    try {
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
      const microphones = devices.filter((device) => { return device.kind === 'audioinput' });
      const DEVICE_LABEL = 'Alder Lake PCH-P High Definition Audio Controller Digital Microphone';
      const device = devices.findLast((device) => { return device.label === DEVICE_LABEL });

      const userMedia = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          deviceId: device?.deviceId,
        },
        video: false,
      });

      const microphone = new MediaRecorder(userMedia);

      setMicrophoneState(MicrophoneState.Ready);
      setMicrophone(microphone);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  const stopMicrophone = useCallback(() => {
    console.log("stopMicrophone: stopping microphone");
    setMicrophoneState(MicrophoneState.Pausing);

    if (microphone?.state === "recording") {
      microphone.pause();
      setMicrophoneState(MicrophoneState.Paused);
    }
  }, [microphone]);

  const startMicrophone = useCallback(() => {
    console.log("startMicrophone: starting microphone");
    setMicrophoneState(MicrophoneState.Opening);

    if (microphone?.state === "paused") {
      microphone.resume();
    } else {
      microphone?.start(250);
    }

    setMicrophoneState(MicrophoneState.Open);
  }, [microphone]);

  return (
    <MicrophoneContext.Provider
      value={{
        microphone,
        startMicrophone,
        stopMicrophone,
        setupMicrophone,
        microphoneState,
      }}
    >
      {children}
    </MicrophoneContext.Provider>
  );
};

function useMicrophone(): MicrophoneContextType {
  const context = useContext(MicrophoneContext);

  if (context === undefined) {
    throw new Error(
      "useMicrophone must be used within a MicrophoneContextProvider"
    );
  }

  return context;
}

export { MicrophoneContextProvider, useMicrophone };
