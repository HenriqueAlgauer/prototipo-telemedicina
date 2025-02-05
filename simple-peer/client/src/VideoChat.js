import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io.connect("http://192.168.18.3:5000");

const VideoChat = () => {
  const [me, setMe] = useState("");
  const [peers, setPeers] = useState([]);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const userVideo = useRef();
  const peersRef = useRef([]);

  useEffect(() => {
    // Listar dispositivos disponíveis (câmeras e microfones)
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      if (videoDevices.length > 0) {
        navigator.mediaDevices
          .getUserMedia({
            video: { deviceId: videoDevices[0].deviceId },
          })
          .then((stream) => {
            userVideo.current.srcObject = stream;
          })
          .catch((error) => console.error("Erro ao acessar câmera:", error));
      } else {
        console.error("Nenhuma câmera disponível.");
      }
    });

    // Capturar vídeo e áudio do usuário
    navigator.mediaDevices
      .getUserMedia({
        video: true, // Captura apenas vídeo
        audio: true, // Captura áudio também (se disponível)
      })
      .then((stream) => {
        userVideo.current.srcObject = stream;

        socket.on("user-joined", (userId) => {
          const peer = createPeer(userId, stream);
          peersRef.current.push({ peerID: userId, peer });
          setPeers((users) => [...users, peer]);
        });

        socket.on("signal", (data) => {
          const peer = addPeer(data.signal, data.callerId, stream);
          peersRef.current.push({ peerID: data.callerId, peer });
          setPeers((users) => [...users, peer]);
        });

        socket.on("return-signal", (data) => {
          const item = peersRef.current.find((p) => p.peerID === data.id);
          if (item) item.peer.signal(data.signal);
        });

        socket.emit("join-room", "room1"); // Sala fixa para teste
      })
      .catch((error) => {
        console.error("Erro ao acessar mídia:", error);
      });

    return () => socket.disconnect();
  }, []);

  function createPeer(userToSignal, stream) {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      socket.emit("signal", { userToSignal, signal });
    });
    return peer;
  }

  function addPeer(incomingSignal, callerId, stream) {
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (signal) => {
      socket.emit("return-signal", { signal, callerId });
    });
    peer.signal(incomingSignal);
    return peer;
  }

  // === FUNÇÕES DE GRAVAÇÃO ===

  const startRecording = () => {
    // Verifica se há um vídeo carregado e com um stream válido
    if (!userVideo.current || !userVideo.current.srcObject) {
      console.error("Erro: Nenhum stream de vídeo encontrado.");
      return;
    }

    const stream = userVideo.current.srcObject; // Obtém o stream do vídeo
    const options = { mimeType: "video/webm; codecs=vp9" };

    try {
      const mediaRecorder = new MediaRecorder(stream, options);

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "chamada_de_video.webm";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (error) {
      console.error("Erro ao iniciar a gravação:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  return (
    <div>
      <h2>Chamada de Vídeo</h2>
      <video ref={userVideo} autoPlay playsInline />
      {peers.map((peer, index) => (
        <Video key={index} peer={peer} />
      ))}
      <div>
        <button onClick={startRecording} disabled={recording}>
          Iniciar Gravação
        </button>
        <button onClick={stopRecording} disabled={!recording}>
          Parar Gravação
        </button>
      </div>
    </div>
  );
};

const Video = ({ peer }) => {
  const ref = useRef();
  useEffect(() => {
    peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, []);

  return <video ref={ref} autoPlay playsInline />;
};

export default VideoChat;
