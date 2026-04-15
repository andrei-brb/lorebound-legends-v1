import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import StoryScreen from "./onboarding/StoryScreen";
import PathSelection from "./onboarding/PathSelection";
import JourneyBegins from "./onboarding/JourneyBegins";
import { type FactionPath, type PlayerState, initializeStarterDeck, savePlayerState } from "@/lib/playerState";

interface OnboardingProps {
  playerState: PlayerState;
  onComplete: (newState: PlayerState) => void;
}

type Screen = "story1" | "story2" | "path" | "journey";

export default function Onboarding({ playerState, onComplete }: OnboardingProps) {
  const [screen, setScreen] = useState<Screen>("story1");
  const [selectedPath, setSelectedPath] = useState<FactionPath | null>(null);

  const handlePathSelect = (path: FactionPath) => {
    setSelectedPath(path);
    setScreen("journey");
  };

  const handleEnterRealm = () => {
    if (!selectedPath) return;
    const newState = initializeStarterDeck(playerState, selectedPath);
    savePlayerState(newState);
    onComplete(newState);
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {screen === "story1" && (
          <StoryScreen
            key="story1"
            title="The Awakening"
            lines={[
              "In an age forgotten by time, the Arcane Realm was sealed away...",
              "Its gods slumber. Its creatures fade. Its magic dims.",
              "But the ancient seals are cracking.",
            ]}
            onContinue={() => setScreen("story2")}
          />
        )}
        {screen === "story2" && (
          <StoryScreen
            key="story2"
            title="The Summoner's Call"
            lines={[
              "From the void between worlds, a call echoes...",
              "Ancient creatures stir. Forgotten gods open their eyes.",
              "The realm needs a new Summoner. It has chosen you.",
            ]}
            onContinue={() => setScreen("path")}
          />
        )}
        {screen === "path" && (
          <PathSelection key="path" onSelect={handlePathSelect} />
        )}
        {screen === "journey" && selectedPath && (
          <JourneyBegins key="journey" path={selectedPath} onEnter={handleEnterRealm} />
        )}
      </AnimatePresence>
    </div>
  );
}
