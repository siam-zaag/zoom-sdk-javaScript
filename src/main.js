import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import "./style.css";
import { generateSignature } from "./utils";

console.log('----------------import "./style.css";');

const sdkKey = import.meta.env.VITE_SDK_KEY;
const sdkSecret = import.meta.env.VITE_SDK_SECRET;

console.log("-sdkKey", sdkKey);
console.log("-sdkSecret", sdkSecret);

const videoContainer = document.querySelector("video-player-container");

const topic = "SomeTopicName";
const role = 1;
const username = `User-${new Date().getTime().toString().slice(6)}`;

const initializeClient = async () => {
    const client = ZoomVideo.createClient();
    await client.init("en-US", "Global", { patchJsMedia: true });

    const startCall = async () => {
        console.log("I am on start call");

        const token = generateSignature(topic, role, sdkKey, sdkSecret);
        console.log("---token", token);

        client.on("peer-video-state-change", renderVideo);
        await client.join(topic, token, username);
        const mediaStream = client.getMediaStream();
        await mediaStream.startAudio();
        await mediaStream.startVideo();
        await renderVideo({
            action: "Start",
            userId: client.getCurrentUserInfo().userId,
        });
    };

    const renderVideo = async (event) => {
        const mediaStream = client.getMediaStream();
        if (event.action === "Start") {
            const userVideo = await mediaStream.attachVideo(
                event.userId,
                VideoQuality.Video_360P
            );
            videoContainer.appendChild(userVideo);
        } else {
            const element = await mediaStream.detachVideo(event.userId);
            Array.isArray(element)
                ? element.forEach((el) => el.remove())
                : element.remove();
        }
    };

    const toggleVideo = async () => {
        const mediaStream = client.getMediaStream();
        if (mediaStream.isCapturingVideo()) {
            await mediaStream.stopVideo();
            await renderVideo({
                action: "Stop",
                userId: client.getCurrentUserInfo().userId,
            });
        } else {
            await mediaStream.startVideo();
            await renderVideo({
                action: "Start",
                userId: client.getCurrentUserInfo().userId,
            });
        }
    };

    const leaveCall = async () => {
        client.off("peer-video-state-change", renderVideo);
        const mediaStream = client.getMediaStream();
        for (const user of client.getAllUser()) {
            const element = await mediaStream.detachVideo(user.userId);
            Array.isArray(element)
                ? element.forEach((el) => el.remove())
                : element.remove();
        }
        await client.leave();
    };

    const startBtn = document.querySelector("#start-btn");
    const stopBtn = document.querySelector("#stop-btn");
    const toggleVideoBtn = document.querySelector("#toggle-video-btn");

    startBtn.addEventListener("click", async () => {
        startBtn.innerHTML = "Connecting...";
        startBtn.disabled = true;
        await startCall();
        startBtn.innerHTML = "Connected";
        startBtn.style.display = "none";
        stopBtn.style.display = "block";
        toggleVideoBtn.style.display = "block";
    });

    stopBtn.addEventListener("click", async () => {
        toggleVideoBtn.style.display = "none";
        await leaveCall();
        stopBtn.style.display = "none";
        startBtn.style.display = "block";
        startBtn.innerHTML = "Join";
        startBtn.disabled = false;
    });

    toggleVideoBtn.addEventListener("click", async () => {
        await toggleVideo();
    });

    const sessionName = "testSession";

    const signature = generateSignature(sessionName, role, sdkKey, sdkSecret);
    console.log("Generated Signature:", signature);
};

// Invoke the function to initialize the client
initializeClient().catch((error) => {
    console.error("Error initializing Zoom Video Client:", error);
});
