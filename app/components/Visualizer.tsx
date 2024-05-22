import React, { useEffect, useRef } from "react";

const interpolateColor = (
  startColor: number[],
  endColor: number[],
  factor: number
): number[] => {
  const result = [];
  for (let i = 0; i < startColor.length; i++) {
    result[i] = Math.round(
      startColor[i] + factor * (endColor[i] - startColor[i])
    );
  }
  return result;
};

const Visualizer = ({ microphone }: { microphone: MediaRecorder | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioContext.createAnalyser();
  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  useEffect(() => {
    if (!microphone) {
      return;
    }

    const source = audioContext.createMediaStreamSource(microphone.stream);
    source.connect(analyser);

    draw();
  }, []);

  const draw = (): void => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    // canvas.style.width = "100%";
    // canvas.style.height = "100%";
    canvas.style.width = "100%";
    canvas.style.height = "8%";
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const context = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteFrequencyData(dataArray);

    if (!context) {
      return;
    }

    context.clearRect(0, 0, width, height);

    // const barWidth = 10;
    const barWidth = 32;
    let x = 0;
    // const startColor = [19, 239, 147];
    // const endColor = [20, 154, 251];
    const startColor = [255, 0, 0];
    const endColor = [255, 255, 255];

    for (const value of dataArray) {
      const barHeight = (value / 255) * height * 2;

      const interpolationFactor = value / 255;

      const color = interpolateColor(startColor, endColor, interpolationFactor);

      // context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.1)`;
      context.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.64)`;
      context.fillRect(x, height - barHeight, barWidth, barHeight);
      x += barWidth;
    }
  };

  return <canvas ref={canvasRef} width={window.innerWidth}></canvas>;
};

export default Visualizer;
