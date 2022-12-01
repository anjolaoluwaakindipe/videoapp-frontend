"use client";

import { useRouter } from "next/navigation";
import { MouseEventHandler } from "react";

function CreateRoomSection() {
    const router = useRouter();

    const createRoom: MouseEventHandler<HTMLButtonElement> = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch("http://localhost:8080/room/create");
            if (res.ok) {
                const { roomId } = (await res.json()) as { roomId: string };
                router.push("/room/" + roomId);
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <h1>Click here to create a room</h1>{" "}
            <button onClick={createRoom}>CREATE ROOM</button>
        </div>
    );
}

export default CreateRoomSection;
