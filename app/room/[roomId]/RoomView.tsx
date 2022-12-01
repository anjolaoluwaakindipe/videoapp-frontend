"use client";

import { LegacyRef, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

type RoomViewProps = {
    roomId: string;
};
function RoomView({ roomId }: RoomViewProps) {
    const userVideo = useRef<HTMLVideoElement>(null);
    const userStream = useRef<MediaStream>();
    const partnerVideo = useRef<HTMLVideoElement>(null);

    const peerRef = useRef<RTCPeerConnection>();
    const webSocketRef = useRef<WebSocket>();
    const openCamera = async () => {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const cameras = allDevices.filter(
            (device) => device.kind === "videoinput"
        );
        console.log(cameras);
        const constraints: MediaStreamConstraints = {
            audio: true,
            video: {
                deviceId: cameras[0].deviceId,
            },
        };
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.log(err);
        }
    };

    const callOtherUser = () => {
        console.log("Calling other user");
        peerRef.current = createPeer();

        userStream.current?.getTracks().forEach((track) => {
            peerRef.current?.addTrack(track, userStream.current!);
        });
    };

    const createPeer = () => {
        console.log("Creating peer connection");
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19382" }],
        });
        peer.onnegotiationneeded = handleNegotiationNeeded;
        peer.onicecandidate = handleIceCandidateEvent;
        peer.ontrack = handleTrackEvent;

        return peer;
    };

    const handleNegotiationNeeded = async () => {
        console.log("creating offer");

        try {
            const myOffer = await peerRef.current?.createOffer();
            await peerRef.current?.setLocalDescription(myOffer);

            webSocketRef.current?.send(
                JSON.stringify({ offer: peerRef.current?.localDescription })
            );
        } catch (err) {}
    };

    const handleIceCandidateEvent = (e: RTCPeerConnectionIceEvent) => {
        console.log("Found Ice candidate");
        if (e.candidate) {
            console.log(e.candidate);
            webSocketRef.current?.send(
                JSON.stringify({ iceCandidate: e.candidate })
            );
        }
    };

    const handleTrackEvent = (e: RTCTrackEvent) => {
        console.log("Received Track");
        partnerVideo.current && (partnerVideo.current.srcObject = e.streams[0]);
    };

    const handleOffer = async (offer: RTCSessionDescriptionInit) => {
        console.log("Receiving offer Creating answer");
        peerRef.current = createPeer();

        const desc = new RTCSessionDescription(offer);

        await peerRef.current.setRemoteDescription(desc);

        userStream.current?.getTracks().forEach((track) => {
            peerRef.current?.addTrack(track, userStream.current!);
        });

        const answer = await peerRef.current.createAnswer();
        await peerRef.current.setLocalDescription(answer);

        webSocketRef.current?.send(
            JSON.stringify({ answer: peerRef.current.localDescription })
        );
    };

    useEffect(() => {
        openCamera().then((stream) => {
            if (stream && userVideo.current) {
                userVideo.current.srcObject = stream;
                userStream.current = stream;

                webSocketRef.current?.close();
                webSocketRef.current = new WebSocket(
                    `ws://localhost:8080/room/join?roomID=${roomId}`
                );

                webSocketRef.current.addEventListener("open", () => {
                    webSocketRef.current?.send(
                        JSON.stringify({ join: "true" })
                    );
                });

                webSocketRef.current.addEventListener("message", async (ev) => {
                    const message = JSON.parse(ev.data) as Partial<{
                        join: string;
                        iceCandidate: string;
                        offer: string;
                        answer: string;
                    }>;

                    if (message.join) {
                        callOtherUser();
                    }

                    if (message.iceCandidate) {
                        console.log("Receiving and Adding ICE candidate");
                        try {
                            await peerRef.current?.addIceCandidate(
                                message.iceCandidate as RTCIceCandidateInit
                            );
                        } catch (err) {
                            console.log("Error Receiving ICE candidate");
                        }
                    }

                    if (message.offer) {
                        handleOffer(
                            message.offer as unknown as RTCSessionDescriptionInit
                        );
                    }

                    if (message.answer) {
                        console.log("Receiving Answer");
                        peerRef.current?.setRemoteDescription(
                            new RTCSessionDescription(
                                message.answer as unknown as RTCSessionDescriptionInit
                            )
                        );
                    }
                });
            }
        });

        return () => {
            webSocketRef.current?.close();
        };
    }, []);
    return (
        <div>
            <video
                autoPlay={true}
                controls={true}
                ref={userVideo}
                muted
                
            ></video>
            <video autoPlay={true} controls={true} ref={partnerVideo} muted></video>
        </div>
    );
}

export default RoomView;
