import RoomView from "./RoomView";
function JoinRoomPage({ params }: { params: { roomId: string } }) {
    return (
        <div>
            <RoomView roomId={params.roomId} />
        </div>
    );
}

export default JoinRoomPage;
